const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const OpenAI = require('openai');

// --- CONFIGURATIE ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

if (!openai) {
    console.warn("⚠️ WAARSCHUWING: Geen OPENAI_API_KEY gevonden. AI-features zijn uitgeschakeld.");
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
 * Verwerkt een batch transacties via OpenAI om categorieën en korte beschrijvingen te genereren.
 * @param {Array} transactionsBatch 
 * @returns {Promise<Array>}
 */
async function categorizeWithAI(transactionsBatch) {
  if (!openai) return [];

  try {
    // Optimalisatie: Alleen de beschrijving sturen bespaart tokens
    const descriptions = transactionsBatch.map(t => t.description).join('\n');
    
    const prompt = `
      Je bent een financiële categorisatie-expert.
      Taak:
      1. Verkort de transactie-omschrijving naar een leesbare titel.
      2. Kies de beste categorie uit deze lijst: ${CATEGORIES.join(', ')}.
      
      Input lijst:
      ${JSON.stringify(transactionsBatch.map(t => t.description))}

      Geef ALLEEN een JSON array terug met objecten in dezelfde volgorde: 
      [{"shortDescription": "...", "category": "..."}]
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1, // Lager is consistenter
      response_format: { type: "json_object" } // Forceer JSON output (indien ondersteund door modelversie)
    });

    const content = completion.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    // Support voor zowel direct array als wrapper object (afhankelijk van GPT grillen)
    return Array.isArray(parsed) ? parsed : (parsed.transactions || parsed.data || []);

  } catch (error) {
    console.error("❌ AI Fout:", error.message);
    // Fallback: retourneer lege resultaten zodat het proces niet crasht
    return transactionsBatch.map(() => ({ shortDescription: null, category: 'Overig' }));
  }
}

/**
 * Normaliseert een CSV-rij naar een standaard transactie-object.
 * Ondersteunt verschillende bankformaten (o.a. Bunq, ING, Rabo).
 */
function parseTransactionRow(row) {
    const desc = row['Description'] || row['Name'] || row['Omschrijving'] || row['description'] || row['Mededelingen'] || 'Geïmporteerd';
    const amountRaw = row['Amount'] || row['Bedrag (EUR)'] || row['amount'] || row['Bedrag'];
    const dateRaw = row['Date'] || row['Datum'] || row['date'];
    const typeRaw = row['Af/Bij'] || '';

    if (!amountRaw) return null;

    // Bedrag normaliseren (komma naar punt, valutatekens weg)
    let amount = parseFloat(amountRaw.toString().replace('€', '').replace(',', '.').trim());
    let type = 'income';

    // Type bepalen
    if (amount < 0) {
        type = 'expense';
        amount = Math.abs(amount);
    } else if (typeRaw.toLowerCase() === 'af') {
        type = 'expense';
    }

    // Datum valideren
    const date = dateRaw ? new Date(dateRaw) : new Date();
    if (isNaN(date.getTime())) return null; // Skip ongeldige data

    return {
        description: desc,
        amount,
        type,
        date,
        originalRow: row // Optioneel bewaren voor debug
    };
}

// --- CONTROLLER FUNCTIES ---

exports.getTransactions = async (req, res) => {
  try {
    // Haal query parameters op voor paginering en filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const { startDate, endDate, category, type } = req.query;

    // Bouw het filter object op
    const whereClause = { userId: req.user.userId };
    
    if (startDate && endDate) {
        whereClause.date = {
            gte: new Date(startDate),
            lte: new Date(endDate)
        };
    }
    if (category) whereClause.category = category;
    if (type) whereClause.type = type;

    // Haal data op + totaal aantal voor frontend paginering
    const [transactions, totalCount] = await Promise.all([
        prisma.transaction.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            skip: skip,
            take: limit
        }),
        prisma.transaction.count({ where: whereClause })
    ]);

    res.json({
        data: transactions,
        pagination: {
            total: totalCount,
            page,
            pages: Math.ceil(totalCount / limit)
        }
    });

  } catch (error) {
    console.error("Fout bij ophalen transacties:", error);
    res.status(500).json({ error: 'Interne serverfout bij ophalen transacties' });
  }
};

exports.createTransaction = async (req, res) => {
  const { amount, type, category, description, notes, date } = req.body;
  
  // Simpele validatie
  if (!amount || !type) {
      return res.status(400).json({ error: 'Bedrag en type zijn verplicht.' });
  }

  try {
    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        type,
        category: category || 'Overig',
        description,
        notes,
        date: date ? new Date(date) : new Date(),
        userId: req.user.userId,
      },
    });
    res.status(201).json(transaction);
  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({ error: 'Kon transactie niet aanmaken.' });
  }
};

exports.updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { description, amount, category, notes, date } = req.body;

  try {
    const updateData = {
        description,
        amount: amount ? parseFloat(amount) : undefined,
        category,
        notes,
        date: date ? new Date(date) : undefined
    };

    if (req.file) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        updateData.receiptUrl = `${baseUrl}/uploads/${req.file.filename}`;
    }

    // Prisma gooit zelf een error als record niet bestaat, maar nette check is beter
    const transaction = await prisma.transaction.update({
      where: { id: id, userId: req.user.userId }, // Check userId voor veiligheid
      data: updateData,
    });
    
    res.json(transaction);
  } catch (error) {
    if (error.code === 'P2025') {
        return res.status(404).json({ error: "Transactie niet gevonden." });
    }
    console.error(error);
    res.status(500).json({ error: 'Update mislukt.' });
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
    res.status(500).json({ error: 'Verwijderen mislukt.' });
  }
};

exports.bulkDelete = async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Geen ID's opgegeven." });
    }

    try {
        const result = await prisma.transaction.deleteMany({
            where: { 
                id: { in: ids }, 
                userId: req.user.userId 
            }
        });
        res.json({ message: `${result.count} transacties verwijderd.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.toggleVisibility = async (req, res) => {
    const { id } = req.params;
    try {
        const tx = await prisma.transaction.findUnique({ 
            where: { id },
            select: { isHidden: true, userId: true } // Alleen nodige velden
        });

        if (!tx || tx.userId !== req.user.userId) {
            return res.status(404).json({ error: "Niet gevonden" });
        }

        const updated = await prisma.transaction.update({
            where: { id },
            data: { isHidden: !tx.isHidden }
        });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- GEOPTIMALISEERDE CSV IMPORT ---

exports.uploadCSV = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Geen bestand geüpload' });

  console.log(`📥 Start import: ${req.file.originalname}`);
  const rawRows = [];
  
  // Gebruik stream voor memory efficiency
  const stream = Readable.from(req.file.buffer.toString());

  stream
      .pipe(csvParser({ separator: ';' })) // Check of separator dynamisch moet zijn
      .on('data', (data) => rawRows.push(data))
      .on('end', async () => {
          try {
              // 1. Parse alle rijen
              const validTransactions = rawRows
                  .map(parseTransactionRow)
                  .filter(t => t !== null);

              if (validTransactions.length === 0) {
                  return res.status(400).json({ error: "Geen geldige transacties gevonden in CSV." });
              }

              console.log(`✅ ${validTransactions.length} transacties geparsed. Start AI verwerking...`);

              // 2. Batch verwerking voor AI & Database Insert
              // We verwerken ze in chunks om memory spikes te voorkomen en inserten ze per chunk
              const BATCH_SIZE = 20; // Grotere batch voor efficiëntie
              let totalInserted = 0;

              for (let i = 0; i < validTransactions.length; i += BATCH_SIZE) {
                  const batch = validTransactions.slice(i, i + BATCH_SIZE);
                  
                  // AI Categorisatie (parallel aanroepen kan, maar sequentieel is veiliger voor rate limits)
                  let enrichedBatch = batch;
                  if (openai) {
                      const aiResults = await categorizeWithAI(batch);
                      // Merge AI resultaten
                      enrichedBatch = batch.map((tx, index) => {
                          const aiData = aiResults[index] || {};
                          return {
                              ...tx,
                              category: aiData.category || 'Overig',
                              description: aiData.shortDescription || tx.description
                          };
                      });
                  }

                  // Voeg userId toe en formatteer voor Prisma
                  const dbData = enrichedBatch.map(tx => ({
                      amount: tx.amount,
                      type: tx.type,
                      category: tx.category || 'Overig',
                      description: tx.description,
                      date: tx.date,
                      userId: req.user.userId,
                      isHidden: false
                  }));

                  // 3. BULK INSERT (Veel sneller dan loop met create)
                  const result = await prisma.transaction.createMany({
                      data: dbData
                  });
                  
                  totalInserted += result.count;
                  console.log(`💾 Batch opgeslagen: ${result.count} items.`);
              }

              res.json({ 
                  message: 'Import succesvol!', 
                  count: totalInserted 
              });

          } catch (error) {
              console.error("❌ Import fout:", error);
              res.status(500).json({ error: 'Fout bij verwerken CSV import.' });
          }
      });
};