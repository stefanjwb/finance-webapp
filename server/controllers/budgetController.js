const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getBudgets = async (req, res) => {
    try {
        const budgets = await prisma.budget.findMany({
            where: { userId: req.user.id }
        });
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ error: 'Fout bij ophalen budgetten' });
    }
};

exports.createBudget = async (req, res) => {
    const { category, amount, type } = req.body;
    try {
        const newBudget = await prisma.budget.create({
            data: {
                category,
                amount: parseFloat(amount),
                type,
                userId: req.user.id
            }
        });
        res.json(newBudget);
    } catch (error) {
        res.status(500).json({ error: 'Kon budget niet aanmaken' });
    }
};

exports.deleteBudget = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.budget.delete({
            where: { id: id } 
        });
        res.json({ message: 'Budget verwijderd' });
    } catch (error) {
        res.status(500).json({ error: 'Kon budget niet verwijderen' });
    }
};