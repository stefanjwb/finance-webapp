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
                category: String(category || 'Overig'), 
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
 * 4. Upload en verwerk een bank-CSV met AI-categorisering
 */
const uploadCSV = async (req, res) => {
    const filePath = req.file?.path;

    if (!req.file) {
        return res.status(400).json({ error: "Geen bestand geüpload." });
    }

    const userId = req.user.userId;
    const results = [];

    try {
        // STAP 1: Detecteer scheidingsteken
        const firstLine = await new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath, { end: 99 });
            stream.on('data', (chunk) => {
                resolve(chunk.toString().split('\n')[0]);
                stream.destroy();
            });
            stream.on('error', (err) => reject(err));
        });

        const detectedSeparator = firstLine.includes(';') ? ';' : ',';

        // STAP 2: CSV parsen
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv({ separator: detectedSeparator }))
                .on('data', (data) => results.push(data))
                .on('error', (err) => reject(err))
                .on('end', () => resolve());
        });

        // STAP 3: Transacties verwerken met AI (asynchroon)
        const transactionsToCreate = await Promise.all(results.map(async (row) => {
            // Mapping voor jouw Bunq CSV: Name, Description, Amount, Date
            const name = row['Name'] || '';
            const rowDesc = row['Description'] || '';
            const description = `${name} ${rowDesc}`.trim() || 'Bank Import';
            
            const rawAmount = row['Amount'] || '0';
            const parsedAmount = parseFloat(String(rawAmount).replace(',', '.'));
            
            if (isNaN(parsedAmount) || parsedAmount === 0) return null;

            // Roep de AI aan voor elke transactie
            const category = await autoCategorize(description);

            let txDate = new Date();
            const rawDate = row['Date'] || row['Datum'];
            if (rawDate) {
                txDate = new Date(rawDate);
            }

            return {
                amount: Math.abs(parsedAmount),
                type: parsedAmount >= 0 ? 'income' : 'expense',
                description: description.substring(0, 255),
                category: category,
                date: isNaN(txDate.getTime()) ? new Date() : txDate,
                userId: userId
            };
        }));

        const finalTransactions = transactionsToCreate.filter(t => t !== null);

        if (finalTransactions.length > 0) {
            await prisma.transaction.createMany({
                data: finalTransactions
            });
        }

        res.json({ 
            message: `Import succesvol: ${finalTransactions.length} transacties toegevoegd met AI-categorisering.`,
            count: finalTransactions.length 
        });

    } catch (error) {
        console.error("Fout bij CSV verwerking:", error);
        res.status(500).json({ error: "Kon CSV bestand niet volledig verwerken." });
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};

/**
 * Hulpfunctie voor AI-categorisering via OpenAI
 */
const autoCategorize = async (description) => {
    if (!description) return 'Overig';

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", 
            messages: [
                {
                    role: "system",
                    content: "Je bent een financiële assistent die banktransacties categoriseert. Antwoord ALLEEN met de categorienaam uit deze lijst: Boodschappen, Huur, Salaris, Abonnementen, Vervoer, Horeca, Verzekering, Klussen, Overig."
                },
                {
                    role: "user",
                    content: `Categoriseer deze transactie: "${description}"`
                }
            ],
            temperature: 0,
            max_tokens: 15
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("AI Categorisatie fout:", error);
        return 'Overig';
    }
};

module.exports = { 
    getTransactions, 
    createTransaction, 
    deleteTransaction, 
    uploadCSV 
};