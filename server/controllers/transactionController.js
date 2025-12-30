const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const csvParser = require('csv-parser');
const { Readable } = require('stream');

// GET
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.userId },
      orderBy: { date: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Fout bij ophalen transacties' });
  }
};

// CREATE
exports.createTransaction = async (req, res) => {
  const { amount, type, category, description, notes, date } = req.body;
  try {
    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        type,
        category,
        description,
        notes,
        date: date ? new Date(date) : new Date(),
        userId: req.user.userId,
      },
    });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Fout bij aanmaken transactie' });
  }
};

// UPDATE (AANGEPAST VOOR BONNEN)
exports.updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { description, amount, category, notes, date } = req.body;

  try {
    // Voorbereiden update data
    const updateData = {
        description,
        amount: parseFloat(amount),
        category,
        notes,
        date: date ? new Date(date) : undefined
    };

    // Als er een bestand is geüpload via Multer
    if (req.file) {
        // Hier zou je evt. ook een check kunnen doen op req.user.isPremium
        // Construeer de volledige URL. Let op: dit gaat ervan uit dat je server 
        // op dezelfde host draait of via proxy bereikbaar is.
        // We slaan hier het relatieve pad op, de frontend plakt de base URL er wel voor.
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        updateData.receiptUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const transaction = await prisma.transaction.update({
      where: { id: id, userId: req.user.userId }, // Check user ownership!
      data: updateData,
    });
    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fout bij updaten transactie' });
  }
};

// DELETE
exports.deleteTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.transaction.delete({
      where: { id: id, userId: req.user.userId },
    });
    res.json({ message: 'Transactie verwijderd' });
  } catch (error) {
    res.status(500).json({ error: 'Fout bij verwijderen' });
  }
};

// TOGGLE VISIBILITY
exports.toggleVisibility = async (req, res) => {
    const { id } = req.params;
    try {
        const tx = await prisma.transaction.findUnique({ where: { id } });
        if (!tx) return res.status(404).json({ error: "Niet gevonden" });
        
        const updated = await prisma.transaction.update({
            where: { id },
            data: { isHidden: !tx.isHidden }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// BULK DELETE
exports.bulkDelete = async (req, res) => {
    const { ids } = req.body;
    try {
        await prisma.transaction.deleteMany({
            where: {
                id: { in: ids },
                userId: req.user.userId
            }
        });
        res.json({ message: 'Succesvol verwijderd' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// CSV UPLOAD
exports.uploadCSV = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Geen bestand geüpload' });

    const results = [];
    const stream = Readable.from(req.file.buffer.toString());

    stream
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                let count = 0;
                for (const row of results) {
                    // Simpele mapping logica (aanpasbaar op basis van bank CSV)
                    const desc = row['Omschrijving'] || row['description'] || row['Naam / Omschrijving'] || 'Geïmporteerd';
                    const amountStr = row['Bedrag (EUR)'] || row['amount'] || row['Bedrag'];
                    const dateStr = row['Datum'] || row['date'];
                    const typeRaw = row['Af/Bij'] || ''; 

                    if (amountStr) {
                        let amount = parseFloat(amountStr.replace(',', '.'));
                        let type = 'expense';
                        
                        // Logica voor af/bij
                        if (typeRaw.toLowerCase() === 'bij' || amount > 0) type = 'income';
                        if (typeRaw.toLowerCase() === 'af') type = 'expense';
                        
                        // Zorg dat expenses positief worden opgeslagen in DB als dat je logica is, 
                        // of negatief. In je huidige code lijk je expenses als positief getal op te slaan 
                        // en 'type' te gebruiken.
                        if (amount < 0) amount = Math.abs(amount);

                        await prisma.transaction.create({
                            data: {
                                amount,
                                type,
                                category: 'Ongecategoriseerd',
                                description: desc,
                                date: dateStr ? new Date(dateStr) : new Date(),
                                userId: req.user.userId
                            }
                        });
                        count++;
                    }
                }
                res.json({ message: `${count} transacties verwerkt.` });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Fout bij verwerken CSV' });
            }
        });
};