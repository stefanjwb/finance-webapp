// server/controllers/transactionController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const csv = require('csv-parser');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Hulpfunctie voor AI-categorisering met verbeterde prompt en robuuste matching
 */
const autoCategorize = async (description) => {
    if (!description) return 'Onvoorzien';

    const categoriesList = [
        "Hypotheek of huur", "Energie (gas/licht)", "Water", "Zorgverzekering", 
        "Overige verzekeringen (inboedel, auto, etc.)", "Internet en TV", 
        "Mobiele abonnementen", "Gemeentelijke en waterschapsbelastingen", 
        "Boodschappen", "Verzorgingsproducten (drogisterij)", 
        "Brandstof en parkeerkosten", "Openbaar vervoer", "Onderhoud auto", 
        "Huishoudelijke artikelen", "Restaurants en cafébezoek", 
        "Afhaalmaaltijden en bezorging", "Entertainment (bioscoop, uitstapjes)", 
        "Streamingdiensten en tijdschriften (Netflix, Spotify, etc.)", 
        "Sportschool", "Shoppen (kleding, elektronica, hobby's)", 
        "Uiterlijke verzorging (kapper)", "Sparen en beleggen", 
        "Aflossing schulden of leningen", "Bankkosten", "Onvoorzien"
    ];

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", 
            messages: [
                {
                    role: "system",
                    content: `Je bent een expert in Nederlandse privéprivéfinanciën. 
                    Categoriseer de transactie in EXACT één van deze categorieën: ${categoriesList.join(", ")}.

                    RICHTLIJNEN VOOR MATCHING:
                    - "Ravellaan" of "Huur" -> Hypotheek of huur
                    - "Hornbach", "DIY", "Gamma", "Klus" -> Huishoudelijke artikelen
                    - "Grab", "Bolt", "NS", "Gojek", "Taxi" -> Openbaar vervoer
                    - "Mart", "Supermarkt", "AH", "Jumbo", "Boodschappen" -> Boodschappen
                    - "onvz", "zilveren kruis", "zorg" -> Zorgverzekering
                    - "Tikkie" met eten/drinken omschrijving -> Restaurants en cafébezoek

                    ANTWOORD-REGELS:
                    1. Antwoord ALLEEN met de categorienaam.
                    2. Geen extra tekst, geen uitleg, geen aanhalingstekens.`
                },
                {
                    role: "user",
                    content: `Categoriseer deze bankomschrijving: "${description}"`
                }
            ],
            temperature: 0,
            max_tokens: 30
        });

        // Verwijder ongewenste leestekens voor een schone match
        let result = response.choices[0].message.content.trim().replace(/[".]/g, "");
        
        // Zoek een exacte match in de lijst (case-insensitive)
        const matchedCategory = categoriesList.find(c => c.toLowerCase() === result.toLowerCase());
        
        return matchedCategory || 'Onvoorzien';
    } catch (error) {
        console.error("AI Fout bij categoriseren:", error);
        return 'Onvoorzien';
    }
};

/**
 * 1. Haal alle transacties op voor de ingelogde gebruiker
 */
const getTransactions = async (req, res) => {
    try {
        const userId = req.user.userId;
        const transactions = await prisma.transaction.findMany({
            where: { userId: userId },
            orderBy: { date: 'desc' }
        });
        res.json(transactions);
    } catch (error) {
        console.error("Fout bij ophalen transacties:", error);
        res.status(500).json({ error: "Kon transacties niet ophalen." });
    }
};

/**
 * 2. Handmatig een enkele transactie toevoegen
 */
const createTransaction = async (req, res) => {
    try {
        const { amount, type, category, description, date } = req.body;
        const userId = req.user.userId;

        if (!amount || !type || !description) {
            return res.status(400).json({ error: "Verplichte velden ontbreken." });
        }

        const newTransaction = await prisma.transaction.create({
            data: {
                amount: Math.abs(parseFloat(amount)),
                type,
                category: String(category || 'Onvoorzien'), 
                description: String(description),
                date: date ? new Date(date) : new Date(),
                userId: userId
            }
        });

        res.status(201).json(newTransaction);
    } catch (error) {
        console.error("Fout bij aanmaken transactie:", error);
        res.status(500).json({ error: "Kon transactie niet opslaan." });
    }
};

/**
 * 3. Verwijder een transactie
 */
const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        const transaction = await prisma.transaction.findFirst({
            where: { id: id, userId: userId }
        });

        if (!transaction) {
            return res.status(404).json({ error: "Transactie niet gevonden." });
        }

        await prisma.transaction.delete({ where: { id: id } });
        res.json({ message: "Transactie succesvol verwijderd." });
    } catch (error) {
        console.error("Fout bij verwijderen transactie:", error);
        res.status(500).json({ error: "Kon transactie niet verwijderen." });
    }
};

/**
 * 3.1 Bulk-verwijderen van transacties
 */
const deleteMultipleTransactions = async (req, res) => {
    try {
        const { ids } = req.body;
        const userId = req.user.userId;

        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: "Geen geldige ID's opgegeven." });
        }

        await prisma.transaction.deleteMany({
            where: {
                id: { in: ids },
                userId: userId
            }
        });

        res.json({ message: `${ids.length} transacties succesvol verwijderd.` });
    } catch (error) {
        console.error("Bulk delete error:", error);
        res.status(500).json({ error: "Kon transacties niet verwijderen." });
    }
};

/**
 * 4. Upload en verwerk CSV met AI-categorisering
 */
const uploadCSV = async (req, res) => {
    const filePath = req.file?.path;
    if (!req.file) return res.status(400).json({ error: "Geen bestand geüpload." });

    const userId = req.user.userId;
    const results = [];

    try {
        const firstLine = await new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath, { end: 99 });
            stream.on('data', (chunk) => {
                resolve(chunk.toString().split('\n')[0]);
                stream.destroy();
            });
            stream.on('error', (err) => reject(err));
        });
        const detectedSeparator = firstLine.includes(';') ? ';' : ',';

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv({ separator: detectedSeparator }))
                .on('data', (data) => results.push(data))
                .on('error', (err) => reject(err))
                .on('end', () => resolve());
        });

        const transactionsToCreate = await Promise.all(results.map(async (row) => {
            // Bunq specifieke mapping
            const name = row['Name'] || '';
            const rowDesc = row['Description'] || '';
            const description = `${name} ${rowDesc}`.trim() || 'Bank Import';
            
            const rawAmount = row['Amount'] || row['Bedrag'] || '0';
            const parsedAmount = parseFloat(String(rawAmount).replace(',', '.'));
            
            if (isNaN(parsedAmount) || parsedAmount === 0) return null;

            // Wacht op AI categorisering
            const category = await autoCategorize(description);

            return {
                amount: Math.abs(parsedAmount),
                type: parsedAmount >= 0 ? 'income' : 'expense',
                description: description.substring(0, 255),
                category: category,
                date: new Date(row['Date'] || row['Datum'] || new Date()),
                userId: userId
            };
        }));

        const finalData = transactionsToCreate.filter(t => t !== null);
        
        if (finalData.length > 0) {
            await prisma.transaction.createMany({ data: finalData });
        }

        res.json({ 
            message: `Import succesvol: ${finalData.length} transacties toegevoegd.`,
            count: finalData.length 
        });

    } catch (error) {
        console.error("Fout bij CSV verwerking:", error);
        res.status(500).json({ error: "Fout bij verwerken van CSV." });
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};

module.exports = { 
    getTransactions, 
    createTransaction, 
    deleteTransaction, 
    deleteMultipleTransactions,
    uploadCSV 
};