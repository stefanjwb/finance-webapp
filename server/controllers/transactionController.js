const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const OpenAI = require('openai');

// --- CONFIGURATIE ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

if (!openai) {
    console.warn("⚠️ WAARSCHUWING: Geen OPENAI_API_KEY gevonden. AI-features (categoriseren) zijn uitgeschakeld.");
}

const CATEGORIES = [
  'Boodschappen', 'Woonlasten', 'Salaris', 'Horeca', 'Vervoer', 'Abonnementen', 
  'Overig', 'Toeslagen', 'Water', 'Verzekeringen', 'Reizen', 'Cadeaus', 
  'Internet en TV', 'Mobiel', 'Belastingen', 'Verzorging', 'Brandstof', 
  'OV', 'Auto', 'Huishouden', 'Afhalen', 'Entertainment', 'Sport', 
  'Shopping', 'Sparen', 'Aflossing'
];

// --- HULPFUNCTIES ---

/**
 * Zet een string om naar Title Case (Elk Woord Begint Met Hoofdletter).
 * Voorbeeld: "ALBERT HEIJN" -> "Albert Heijn"
 */
function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Verwerkt ÉÉN enkele transactie via OpenAI.
 * Dit is veel nauwkeuriger dan batchen.
 */
async function categorizeSingleTransaction(description) {
  // Als er geen OpenAI is, return de originele description maar dan wel netjes geformatteerd
  if (!openai) return { shortDescription: toTitleCase(description), category: 'Overig' };

  try {
    const prompt = `
      Taak: Analyseer deze banktransactie.
      
      Omschrijving: "${description}"
      
      Instructies:
      1. Schoon de naam op (verwijder datum/tijd/codes/rekeningnummers). Houd alleen de naam van de winkel of partij over. Max 5 woorden.
      2. Formatteer de naam in Title Case (bijv. "Albert Heijn" en NIET "ALBERT HEIJN").
      3. Kies de beste categorie uit: ${CATEGORIES.join(', ')}.
      
      Output JSON: { "shortDescription": "...", "category": "..." }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Snel en goedkoop genoeg voor losse requests
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    // We halen het resultaat alsnog door toTitleCase voor de zekerheid
    return {
        shortDescription: toTitleCase(result.shortDescription || description),
        category: result.category || 'Overig'
    };

  } catch (error) {
    console.error(`❌ AI Fout bij transactie "${description.substring(0, 20)}...":`, error.message);
    // Bij een error ook de originele omschrijving netjes maken
    return { shortDescription: toTitleCase(description), category: 'Overig' };
  }
}

function parseTransactionRow(row) {
    const desc = row['Description'] || row['Name'] || row['Omschrijving'] || row['description'] || row['Mededelingen'] || 'Geïmporteerd';
    const amountRaw = row['Amount'] || row['Bedrag (EUR)'] || row['amount'] || row['Bedrag'];
    const dateRaw = row['Date'] || row['Datum'] || row['date'];
    const typeRaw = row['Af/Bij'] || '';

    if (!amountRaw) return null;

    let amount = parseFloat(amountRaw.toString().replace('€', '').replace(',', '.').trim());
    let type = 'income';

    if (amount < 0) {
        type = 'expense';
        amount = Math.abs(amount);
    } else if (typeRaw && typeRaw.toLowerCase() === 'af') {
        type = 'expense';
    }

    const date = dateRaw ? new Date(dateRaw) : new Date();
    if (isNaN(date.getTime())) return null;

    return { description: desc, amount, type, date, originalRow: row };
}

// --- CONTROLLER FUNCTIES ---

exports.getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const { startDate, endDate, category, type } = req.query;
    const whereClause = { userId: req.user.userId };
    
    if (startDate && endDate) whereClause.date = { gte: new Date(startDate), lte: new Date(endDate) };
    if (category) whereClause.category = category;
    if (type) whereClause.type = type;

    const [transactions, totalCount] = await Promise.all([
        prisma.transaction.findMany({ where: whereClause, orderBy: { date: 'desc' }, skip, take: limit }),
        prisma.transaction.count({ where: whereClause })
    ]);

    res.json({ data: transactions, pagination: { total: totalCount, page, pages: Math.ceil(totalCount / limit) } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Serverfout' });
  }
};

exports.createTransaction = async (req, res) => {
  const { amount, type, category, description, notes, date } = req.body;
  if (!amount || !type) return res.status(400).json({ error: 'Bedrag/type verplicht.' });
  try {
    const tx = await prisma.transaction.create({
      data: { 
        amount: parseFloat(amount), 
        type, 
        category: category || 'Overig', 
        description: toTitleCase(description), // Ook hier formatteren bij handmatige invoer
        notes, 
        date: date ? new Date(date) : new Date(), 
        userId: req.user.userId 
      },
    });
    res.status(201).json(tx);
  } catch (e) { res.status(500).json({ error: 'Fout bij aanmaken.' }); }
};

exports.updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { description, amount, category, notes, date } = req.body;
  try {
    const updateData = { 
        description: description ? toTitleCase(description) : undefined, // Ook hier formatteren
        amount: amount ? parseFloat(amount) : undefined, 
        category, 
        notes, 
        date: date ? new Date(date) : undefined 
    };
    if (req.file) updateData.receiptUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const tx = await prisma.transaction.update({ where: { id, userId: req.user.userId }, data: updateData });
    res.json(tx);
  } catch (e) { 
      if (e.code === 'P2025') return res.status(404).json({ error: "Niet gevonden" });
      res.status(500).json({ error: 'Update mislukt.' }); 
  }
};

exports.deleteTransaction = async (req, res) => {
  try { await prisma.transaction.delete({ where: { id: req.params.id, userId: req.user.userId } }); res.json({ message: 'Verwijderd' }); }
  catch (e) { res.status(500).json({ error: 'Fout bij verwijderen.' }); }
};

exports.bulkDelete = async (req, res) => {
    try {
        const result = await prisma.transaction.deleteMany({ where: { id: { in: req.body.ids }, userId: req.user.userId } });
        res.json({ message: `${result.count} verwijderd.` });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.toggleVisibility = async (req, res) => {
    try {
        const tx = await prisma.transaction.findUnique({ where: { id: req.params.id }, select: { isHidden: true, userId: true } });
        if (!tx || tx.userId !== req.user.userId) return res.status(404).json({ error: "Niet gevonden" });
        const updated = await prisma.transaction.update({ where: { id: req.params.id }, data: { isHidden: !tx.isHidden } });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

// --- NIEUWE IMPORT FUNCTIE (1-op-1 Verwerking) ---

exports.uploadCSV = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Geen bestand geüpload' });

  console.log(`📥 Start import: ${req.file.originalname}`);
  const rawRows = [];
  
  const stream = Readable.from(req.file.buffer.toString());

  stream
      .pipe(csvParser({ separator: ';' })) 
      .on('data', (data) => rawRows.push(data))
      .on('end', async () => {
          try {
              const validTransactions = rawRows.map(parseTransactionRow).filter(t => t !== null);
              if (validTransactions.length === 0) return res.status(400).json({ error: "Geen geldige data." });

              console.log(`🚀 Start 1-op-1 AI verwerking voor ${validTransactions.length} items...`);

              // We verwerken ze in kleine parallelle groepen om rate-limits te voorkomen
              const CONCURRENT_LIMIT = 20; // 20 transacties tegelijk naar OpenAI sturen
              const chunks = [];
              for (let i = 0; i < validTransactions.length; i += CONCURRENT_LIMIT) {
                  chunks.push(validTransactions.slice(i, i + CONCURRENT_LIMIT));
              }

              let totalProcessed = 0;

              for (const chunk of chunks) {
                  // Parallel requests voor deze chunk
                  const processedChunk = await Promise.all(chunk.map(async (tx) => {
                      // Roep AI aan PER transactie
                      const aiData = await categorizeSingleTransaction(tx.description);
                      
                      return {
                          amount: tx.amount,
                          type: tx.type,
                          date: tx.date,
                          userId: req.user.userId,
                          isHidden: false,
                          // Gebruik het specifieke AI resultaat voor DEZE transactie
                          category: aiData.category,
                          description: aiData.shortDescription
                      };
                  }));

                  // Opslaan in database
                  await prisma.transaction.createMany({ data: processedChunk });
                  
                  totalProcessed += processedChunk.length;
                  console.log(`✅ ${totalProcessed}/${validTransactions.length} verwerkt...`);
              }

              console.log(`🎉 Klaar! ${totalProcessed} transacties geïmporteerd.`);
              res.json({ message: 'Import succesvol!', count: totalProcessed });

          } catch (error) {
              console.error("❌ Import fout:", error);
              res.status(500).json({ error: 'Fout bij verwerken CSV import.' });
          }
      });
};