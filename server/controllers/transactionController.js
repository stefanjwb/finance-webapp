// server/controllers/transactionController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const csv = require('csv-parser');

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
 * 4. Upload en verwerk een bank-CSV (ondersteunt zowel ; als ,)
 */
const uploadCSV = async (req, res) => {
    const filePath = req.file?.path;

    if (!req.file) {
        return res.status(400).json({ error: "Geen bestand geüpload." });
    }

    const userId = req.user.userId;
    const results = [];

    try {
        // STAP 1: Detecteer het scheidingsteken door de eerste regel te lezen
        const firstLine = await new Promise((resolve, reject) => {
            const stream = fs.createReadStream(filePath, { end: 99 });
            stream.on('data', (chunk) => {
                resolve(chunk.toString().split('\n')[0]);
                stream.destroy();
            });
            stream.on('error', (err) => reject(err));
        });

        const detectedSeparator = firstLine.includes(';') ? ';' : ',';

        // STAP 2: Start het parsen met het gedetecteerde teken
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv({ separator: detectedSeparator }))
                .on('data', (data) => results.push(data))
                .on('error', (err) => reject(err))
                .on('end', () => resolve());
        });

        const transactionsToCreate = results
            .map(row => {
                // Mapping op basis van de koppen in je CSV: Datum, Omschrijving, Bedrag
                const description = String(row['Omschrijving'] || row['Naam_Omschrijving'] || 'Bank Import');
                let rawAmount = row['Bedrag'] || row['Bedrag (EUR)'] || '0';
                
                const parsedAmount = parseFloat(String(rawAmount).replace(',', '.'));
                
                if (isNaN(parsedAmount) || parsedAmount === 0) return null;

                let txDate = new Date();
                const rawDate = row['Datum'] || row['Transactiedatum'];
                if (rawDate) {
                    const parts = String(rawDate).split('-');
                    if (parts.length === 3) {
                        txDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    } else {
                        txDate = new Date(rawDate);
                    }
                }

                return {
                    amount: Math.abs(parsedAmount),
                    type: parsedAmount >= 0 ? 'income' : 'expense',
                    description: description.substring(0, 255),
                    category: autoCategorize(description),
                    date: isNaN(txDate.getTime()) ? new Date() : txDate,
                    userId: userId
                };
            })
            .filter(t => t !== null);

        if (transactionsToCreate.length > 0) {
            await prisma.transaction.createMany({
                data: transactionsToCreate
            });
        }

        // BELANGRIJK: Stuur een simpele string terug in de message property
        res.json({ 
            message: "Import succesvol: " + transactionsToCreate.length + " transacties toegevoegd.",
            count: transactionsToCreate.length 
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
 * Hulpfunctie voor automatische categorisering
 */
const autoCategorize = (description) => {
    if (!description) return 'Overig';
    const desc = String(description).toLowerCase();

    const categories = {
        'Boodschappen': ['ah', 'jumbo', 'albert heijn', 'dirk', 'lidl', 'aldi', 'supermarkt', 'plus', 'spar'],
        'Huur': ['huur', 'hypotheek', 'wonen', 'vesteda', 'de key', 'vve'],
        'Salaris': ['salaris', 'storting', 'loon', 'werkgever', 'uitbetaling'],
        'Abonnementen': ['netflix', 'spotify', 'disney', 'icloud', 't-mobile', 'kpn', 'ziggo', 'vodafone', 'tele2'],
        'Vervoer': ['ns', 'tanken', 'shell', 'bp', 'esso', 'parkeren', 'q-park', 'ov-chipkaart', 'trein'],
        'Horeca': ['restaurant', 'cafe', 'thuisbezorgd', 'uber eats', 'bar', 'lunch', 'koffie'],
        'Verzekering': ['verzekering', 'zorgverzekering', 'cz', 'zilveren kruis', 'interpolis'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => desc.includes(keyword))) {
            return category;
        }
    }
    
    return 'Overig';
};

module.exports = { 
    getTransactions, 
    createTransaction, 
    deleteTransaction, 
    uploadCSV 
};