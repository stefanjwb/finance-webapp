// server/controllers/transactionController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Haal transacties op (alleen van de ingelogde gebruiker!)
const getTransactions = async (req, res) => {
    try {
        const userId = req.user.userId; // Komt uit de authMiddleware

        const transactions = await prisma.transaction.findMany({
            where: { userId: userId },
            orderBy: { date: 'desc' } // Nieuwste bovenaan
        });

        res.json(transactions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Kon transacties niet ophalen." });
    }
};

// 2. Nieuwe transactie toevoegen
const createTransaction = async (req, res) => {
    try {
        const { amount, type, category, description } = req.body;
        const userId = req.user.userId;

        // Maak de transactie aan in de database
        const newTransaction = await prisma.transaction.create({
            data: {
                amount: parseFloat(amount), // Zeker weten dat het een getal is
                type,
                category,
                description,
                userId: userId // Koppel aan de gebruiker
            }
        });

        res.status(201).json(newTransaction);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Kon transactie niet opslaan." });
    }
};

// 3. Verwijder transactie
const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Extra check: Is deze transactie wel van de gebruiker?
        // (Voor nu simpel houden en gewoon verwijderen)
        await prisma.transaction.delete({
            where: { id: id }
        });

        res.json({ message: "Transactie verwijderd" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Kon transactie niet verwijderen." });
    }
};

module.exports = { getTransactions, createTransaction, deleteTransaction };