const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const OpenAI = require('openai');

// Initialiseer OpenAI (met check)
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.warn("⚠️ LET OP: Geen OPENAI_API_KEY gevonden in .env. AI categorisatie zal niet werken.");
}
const openai = new OpenAI({ apiKey: apiKey });

const CATEGORIES = [
  'Boodschappen', 'Woonlasten', 'Salaris', 'Horeca', 'Vervoer', 'Abonnementen', 
  'Overig', 'Toeslagen', 'Water', 'Verzekeringen', 'Reizen', 'Cadeaus', 
  'Internet en TV', 'Mobiel', 'Belastingen', 'Verzorging', 'Brandstof', 
  'OV', 'Auto', 'Huishouden', 'Afhalen', 'Entertainment', 'Sport', 
  'Shopping', 'Sparen', 'Aflossing'
];

// --- HULPFUNCTIE: AI CATEGORISATIE ---
async function categorizeWithAI(transactionsBatch) {
  if (!process.env.OPENAI_API_KEY) return []; // Sla over als geen key

  try {
    console.log(`🤖 AI aanroepen voor batch van ${transactionsBatch.length} items...`);
    const prompt = `
      Je bent een financiële assistent. Hier is een lijst met banktransacties.
      Voor elke transactie wil ik dat je:
      1. De omschrijving korter en leesbaarder maakt.
      2. De beste categorie kiest uit: ${CATEGORIES.join(', ')}.

      Geef JSON array terug met objecten: { "originalDescription", "shortDescription", "category" }.
      Input: ${JSON.stringify(transactionsBatch)}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const content = completion.choices[0].message.content;
    const jsonString = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);

  } catch (error) {
    console.error("❌ Fout bij AI verwerking:", error.message);
    return [];
  }
}

// --- BESTAANDE CONTROLLER FUNCTIES ---

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.userId },
      orderBy: { date: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fout bij ophalen transacties' });
  }
};

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

exports.updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { description, amount, category, notes, date } = req.body;
  try {
    const updateData = {
        description,
        amount: parseFloat(amount),
        category,
        notes,
        date: date ? new Date(date) : undefined
    };
    if (req.file) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        updateData.receiptUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }
    const transaction = await prisma.transaction.update({
      where: { id: id, userId: req.user.userId },
      data: updateData,
    });
    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fout bij updaten transactie' });
  }
};

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

exports.bulkDelete = async (req, res) => {
    const { ids } = req.body;
    try {
        await prisma.transaction.deleteMany({
            where: { id: { in: ids }, userId: req.user.userId }
        });
        res.json({ message: 'Succesvol verwijderd' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- NIEUWE CSV UPLOAD MET LOGGING ---
// --- NIEUWE CSV UPLOAD MET CORRECTE MAPPING ---
exports.uploadCSV = async (req, res) => {
  console.log("📂 Upload request ontvangen...");
  
  if (!req.file) {
      console.log("❌ Geen bestand gevonden in req.file");
      return res.status(400).json({ error: 'Geen bestand geüpload' });
  }

  console.log(`📄 Bestand ontvangen: ${req.file.originalname} (${req.file.size} bytes)`);

  const rawRows = [];
  const stream = Readable.from(req.file.buffer.toString());

  stream
      // BELANGRIJK: separator ingesteld op puntkomma (;) voor Bunq/NL banken
      .pipe(csvParser({ separator: ';' })) 
      .on('data', (data) => rawRows.push(data))
      .on('end', async () => {
          console.log(`📊 CSV geparsed: ${rawRows.length} rijen gevonden.`);
          
          if (rawRows.length > 0) {
              // Log de eerste rij om te zien of de kolomnamen nu wel kloppen (zonder quotes)
              console.log("🔍 Eerste rij data (geparsed):", rawRows[0]);
          }

          try {
              const parsedTransactions = [];

              for (const row of rawRows) {
                  // Mapping logica uitgebreid met Engelse termen uit je log
                  // Bunq gebruikt vaak 'Description' en 'Name'. 
                  const desc = row['Description'] || row['Name'] || row['Omschrijving'] || row['description'] || 'Geïmporteerd';
                  const amountStr = row['Amount'] || row['Bedrag (EUR)'] || row['amount'] || row['Bedrag'];
                  const dateStr = row['Date'] || row['Datum'] || row['date'];
                  
                  // Soms heet de kolom 'Af/Bij' (NL) of is het bedrag negatief
                  const typeRaw = row['Af/Bij'] || ''; 

                  // Debug log als amount mist
                  if (!amountStr) {
                      continue;
                  }

                  // Bedrag schoonmaken (komma naar punt)
                  let amount = parseFloat(amountStr.replace(',', '.'));
                  let type = 'income'; // Default

                  // Logica voor type bepaling (Inkomen vs Uitgave)
                  if (amount < 0) {
                      type = 'expense';
                      amount = Math.abs(amount); // Sla positief op in DB
                  } else if (typeRaw.toLowerCase() === 'af') {
                      type = 'expense';
                  } else {
                      // Als bedrag positief is en geen 'Af/Bij' kolom zegt 'Af', is het inkomen
                      type = 'income';
                  }
                  
                  // *Extra check*: Bunq exporteert soms uitgaven als positief getal als er geen minteken staat?
                  // Als je merkt dat ALLES als 'income' binnenkomt, moeten we hier kijken naar een andere kolom.
                  // Voor nu gaan we uit van standaard gedrag (minteken = uitgave).

                  parsedTransactions.push({
                      description: desc,
                      amount,
                      type,
                      date: dateStr ? new Date(dateStr) : new Date(),
                  });
              }

              console.log(`✅ ${parsedTransactions.length} geldige transacties klaar voor verwerking.`);

              // Batch verwerking (met AI)
              const BATCH_SIZE = 10;
              let processedCount = 0;

              for (let i = 0; i < parsedTransactions.length; i += BATCH_SIZE) {
                  const batch = parsedTransactions.slice(i, i + BATCH_SIZE);
                  const batchForAI = batch.map(t => ({ description: t.description }));
                  
                  const aiResults = await categorizeWithAI(batchForAI);

                  for (let j = 0; j < batch.length; j++) {
                      const originalTx = batch[j];
                      const aiInfo = aiResults[j] || { shortDescription: originalTx.description, category: 'Overig' };

                      await prisma.transaction.create({
                          data: {
                              amount: originalTx.amount,
                              type: originalTx.type,
                              category: aiInfo.category || 'Overig',
                              description: aiInfo.shortDescription || originalTx.description,
                              date: originalTx.date,
                              userId: req.user.userId
                          }
                      });
                      processedCount++;
                  }
              }

              console.log(`🎉 Klaar! ${processedCount} transacties opgeslagen.`);
              res.json({ message: `${processedCount} transacties succesvol verwerkt en gecategoriseerd.` });

          } catch (error) {
              console.error("❌ CRASH tijdens verwerking:", error);
              res.status(500).json({ error: 'Fout bij verwerken CSV' });
          }
      });
};