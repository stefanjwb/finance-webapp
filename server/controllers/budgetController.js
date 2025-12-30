const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getBudgets = async (req, res) => {
    try {
        // AANGEPAST: req.user.userId in plaats van req.user.id
        const budgets = await prisma.budget.findMany({
            where: { userId: req.user.userId }
        });
        res.json(budgets);
    } catch (error) {
        console.error("Fout bij ophalen budgetten:", error);
        res.status(500).json({ error: 'Fout bij ophalen budgetten' });
    }
};

exports.createBudget = async (req, res) => {
    const { category, amount, type } = req.body;
    
    if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: 'Ongeldig bedrag' });
    }

    try {
        const newBudget = await prisma.budget.create({
            data: {
                category,
                amount: parseFloat(amount),
                type,
                // AANGEPAST: req.user.userId in plaats van req.user.id
                userId: req.user.userId 
            }
        });
        res.json(newBudget);
    } catch (error) {
        console.error("Fout bij aanmaken budget:", error);
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
        console.error("Fout bij verwijderen budget:", error);
        res.status(500).json({ error: 'Kon budget niet verwijderen' });
    }
};