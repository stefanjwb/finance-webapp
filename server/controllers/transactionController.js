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
 * Helper: Slaapfunctie voor vertraging (voorkomt database & AI overbelasting)
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Hulpfunctie: Laat AI de transactie analyseren met DEBUG logging en STRENGE schoonmaak regels
 */
const analyzeTransaction = async (rawDescription) => {
    // Fallback: Als alles misgaat, behoud het origineel maar log het wel
    const fallback = { category: 'Onvoorzien', cleanName: rawDescription || 'Onbekend' };
    
    if (!rawDescription) return fallback;

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
            response_format: { type: "json_object" }, 
            messages: [
                {
                    role: "system",
                    content: `Je bent een strikte transactie-schoonmaker.
                    
                    JOUW TAAK:
                    1. **cleanName**: Herschrijf de omschrijving naar een korte, leesbare bedrijfsnaam.
                       - VERWIJDER: Bedragen, valuta codes (EUR, PHP, USD), wisselkoersen, datums, tijdstippen.
                       - VERWIJDER: Landcodes (zoals ", PH", "NL"), locaties codes en reeksen van willekeurige cijfers/letters.
                       - HOUD OVER: Alleen de naam van de winkel/dienst en eventueel de stad.
                       - VOORBEELD: "SPEEDO BORACAY SPEEDO BORACAY AKLAN, PH 1196.40 PHP" -> "Speedo Boracay Aklan"
                       - VOORBEELD: "ALBERT HEIJN 1234 AMSTERDAM 12.40 EUR" -> "Albert Heijn"
                    
                    2. **category**: Kies EXACT één categorie uit deze lijst: ${categoriesList.join(", ")}.

                    Geef JSON terug in dit formaat: { "cleanName": "...", "category": "..." }`
                },
                {
                    role: "user",
                    content: `Maak schoon en categoriseer: "${rawDescription}"`
                }
            ],
            temperature: 0.1, // Laag houden voor consistentie
        });

        const result = JSON.parse(response.choices[0].message.content);
        
        // --- DEBUG LOGGING ---
        // console.log(`AI: "${rawDescription}" -> "${result.cleanName}"`);

        return {
            cleanName: result.cleanName || rawDescription,
            category: result.category || 'Onvoorzien'
        };

    } catch (error) {
        console.error("AI ERROR (Fallback):", error.message);
        return fallback;
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
 * 4. Upload en verwerk CSV (Sequentieel om crashes te voorkomen)
 */
const uploadCSV = async (req, res) => {
    const filePath = req.file?.path;
    if (!req.file) return res.status(400).json({ error: "Geen bestand geüpload." });

    const userId = req.user.userId;
    const results = [];

    try {
        // 1. Detecteer separator
        const firstLine = await new Promise((resolve) => {
            const stream = fs.createReadStream(filePath, { end: 99 });
            stream.on('data', (chunk) => {
                resolve(chunk.toString().split('\n')[0]);
                stream.destroy();
            });
        });
        const detectedSeparator = firstLine.includes(';') ? ';' : ',';

        // 2. Lees bestand in geheugen
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv({ separator: detectedSeparator }))
                .on('data', (data) => results.push(data))
                .on('error', (err) => reject(err))
                .on('end', () => resolve());
        });

        console.log(`Start verwerking van ${results.length} rijen (één voor één)...`);
        
        const transactionsToCreate = [];

        // 3. Verwerk transacties EÉN VOOR EÉN (geen Promise.all)
        for (const [index, row] of results.entries()) {
            // Data ophalen
            const name = row['Name'] || '';
            const rowDesc = row['Description'] || '';
            const rawDescription = `${name} ${rowDesc}`.trim() || 'Bank Import';
            
            const rawAmount = row['Amount'] || row['Bedrag'] || '0';
            const parsedAmount = parseFloat(String(rawAmount).replace(',', '.'));
            
            // Skip ongeldige regels
            if (isNaN(parsedAmount) || parsedAmount === 0) continue;

            // AI Aanroep (Sequentieel)
            const analysis = await analyzeTransaction(rawDescription);

            // Toevoegen aan lijst
            transactionsToCreate.push({
                amount: Math.abs(parsedAmount),
                type: parsedAmount >= 0 ? 'income' : 'expense',
                description: analysis.cleanName.substring(0, 255), 
                category: analysis.category,
                date: new Date(row['Date'] || row['Datum'] || new Date()),
                userId: userId
            });

            // Log de voortgang
            console.log(`[${index + 1}/${results.length}] Verwerkt: ${analysis.cleanName}`);

            // PAUZE: Wacht 300ms om DB en AI te ontlasten
            await sleep(300);
        }

        // 4. Bulk insert in database
        if (transactionsToCreate.length > 0) {
            await prisma.transaction.createMany({ data: transactionsToCreate });
        }

        res.json({ 
            message: `Import succesvol: ${transactionsToCreate.length} transacties toegevoegd.`,
            count: transactionsToCreate.length 
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