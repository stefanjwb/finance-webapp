const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getBudgets = async (req, res) => {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.user.userId },
      include: { transactions: true }, // Zorg dat transacties erbij zitten voor berekeningen
    });
    
    // Bereken reeds uitgegeven bedrag per budget
    const budgetsWithSpent = budgets.map(b => {
      const spent = b.transactions.reduce((sum, t) => sum + t.amount, 0);
      return { ...b, spent };
    });

    res.json(budgetsWithSpent);
  } catch (error) {
    res.status(500).json({ error: 'Fout bij ophalen budgetten.' });
  }
};

exports.createBudget = async (req, res) => {
  const { name, limit, category } = req.body;
  if (!name || !limit) return res.status(400).json({ error: 'Naam en limiet verplicht.' });

  try {
    const budget = await prisma.budget.create({
      data: {
        name,
        limit: parseFloat(limit),
        category: category || 'Overig',
        userId: req.user.userId
      },
      include: { transactions: true } // BELANGRIJK: Return ook de relaties om frontend crash te voorkomen
    });
    
    // Voeg direct 'spent' toe (is 0 bij nieuw budget) zodat frontend structuur klopt
    res.status(201).json({ ...budget, spent: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Fout bij aanmaken budget.' });
  }
};

exports.updateBudget = async (req, res) => {
  const { id } = req.params;
  const { name, limit, category } = req.body;

  try {
    const budget = await prisma.budget.update({
      where: { id: id, userId: req.user.userId },
      data: {
        name,
        limit: limit ? parseFloat(limit) : undefined,
        category
      },
      include: { transactions: true } // BELANGRIJK: Return transacties zodat 'spent' berekend kan worden
    });

    // Herbereken spent voor de response
    const spent = budget.transactions.reduce((sum, t) => sum + t.amount, 0);
    
    res.json({ ...budget, spent });
  } catch (error) {
    res.status(500).json({ error: 'Fout bij bijwerken budget.' });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    await prisma.budget.delete({ where: { id: req.params.id, userId: req.user.userId } });
    res.json({ message: 'Budget verwijderd.' });
  } catch (error) {
    res.status(500).json({ error: 'Fout bij verwijderen.' });
  }
};