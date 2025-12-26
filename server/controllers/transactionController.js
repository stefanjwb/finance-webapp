// server/controllers/transactionController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const csv = require('csv-parser');
const { OpenAI } = require('openai');
const crypto = require('crypto');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BATCH_SIZE = 20;

// --- GRATIS LOKALE SCHOONMAAK FUNCTIE ---
const cleanNameLocal = (rawDescription) => {
    if (!rawDescription) return "Onbekend";
    
    return rawDescription
        .replace(/\d{2}-\d{2}-\d{4}/g, '')
        .replace(/\d{4,}/g, '')
        .replace(/EUR/g, '')
        .replace(/Passnr[\s\S]*/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, s => s.toUpperCase());
};

// --- STATIC KEYWORDS (GRATIS) ---
const STATIC_KEYWORDS = {
    'albert heijn': { cleanName: 'Albert Heijn', category: 'Boodschappen' },
    'ah to go': { cleanName: 'AH to go', category: 'Boodschappen' },
    'jumbo': { cleanName: 'Jumbo', category: 'Boodschappen' },
    'lidl': { cleanName: 'Lidl', category: 'Boodschappen' },
    'plus': { cleanName: 'Plus', category: 'Boodschappen' },
    'dirk': { cleanName: 'Dirk', category: 'Boodschappen' },
    'picnic': { cleanName: 'Picnic', category: 'Boodschappen' },
    'kruidvat': { cleanName: 'Kruidvat', category: 'Verzorgingsproducten' },
    'etos': { cleanName: 'Etos', category: 'Verzorgingsproducten' },
    'shell': { cleanName: 'Shell', category: 'Brandstof en parkeren' },
    'tinq': { cleanName: 'TinQ', category: 'Brandstof en parkeren' },
    'ns groep': { cleanName: 'NS', category: 'Openbaar vervoer' },
    'ns reizigers': { cleanName: 'NS', category: 'Openbaar vervoer' },
    'bol.com': { cleanName: 'Bol.com', category: 'Shoppen en Kleding' },
    'amazon': { cleanName: 'Amazon', category: 'Shoppen en Kleding' },
    'coolblue': { cleanName: 'Coolblue', category: 'Shoppen en Kleding' },
    'mediamarkt': { cleanName: 'MediaMarkt', category: 'Shoppen en Kleding' },
    'netflix': { cleanName: 'Netflix', category: 'Streaming en Abonnementen' },
    'spotify': { cleanName: 'Spotify', category: 'Streaming en Abonnementen' },
    'videoland': { cleanName: 'Videoland', category: 'Streaming en Abonnementen' },
    'ziggo': { cleanName: 'Ziggo', category: 'Internet en TV' },
    'kpn': { cleanName: 'KPN', category: 'Internet en TV' },
    'odido': { cleanName: 'Odido', category: 'Mobiele abonnementen' },
    'vodafone': { cleanName: 'Vodafone', category: 'Mobiele abonnementen' },
    'belastingdienst': { cleanName: 'Belastingdienst', category: 'Toeslagen' },
    'pathe': { cleanName: 'Pathé', category: 'Entertainment' },
    'ikea': { cleanName: 'IKEA', category: 'Huishoudelijke artikelen' },
    'action': { cleanName: 'Action', category: 'Huishoudelijke artikelen' },
    'hema': { cleanName: 'HEMA', category: 'Huishoudelijke artikelen' }
};

const createTransactionHash = (date, amount, description) => {
    const data = `${date.toISOString()}_${amount}_${description.trim()}`;
    return crypto.createHash('md5').update(data).digest('hex');
};

// --- CONFIGURATIE CATEGORIEËN ---
const CATEGORIES_LIST = [
    "Hypotheek of huur", "Energie", "Water", "Zorgverzekering", "Verzekeringen", 
    "Internet en TV", "Mobiel", "Belastingen", "Boodschappen", "Verzorging", 
    "Brandstof", "OV", "Auto", "Huishouden", "Horeca", "Afhalen", "Entertainment", 
    "Abonnementen", "Sport", "Shopping", "Sparen", "Aflossing", "Bankkosten", "Salaris", "Onvoorzien"
];

const analyzeCategoryOnly = async (rawDescription) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" }, 
            messages: [
                {
                    role: "system",
                    content: `Categoriseer. Kies uit: ${CATEGORIES_LIST.join(",")}. JSON output: {"category": "jouw_keuze"}`
                },
                { role: "user", content: rawDescription }
            ],
            temperature: 0,
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error("AI Fout (Gratis):", error.message);
        return { category: 'Onvoorzien' };
    }
};

const analyzePremium = async (rawDescription) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" }, 
            messages: [
                {
                    role: "system",
                    content: `Jij bent een transactie-expert.
                    1. cleanName: Herschrijf de omschrijving naar een korte, mooie bedrijfsnaam (zonder steden/cijfers).
                    2. category: Kies een categorie uit: ${CATEGORIES_LIST.join(",")}.
                    JSON: { "cleanName": "...", "category": "..." }`
                },
                { role: "user", content: rawDescription }
            ],
            temperature: 0.1,
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error("AI Fout (Premium):", error.message);
        return { category: 'Onvoorzien', cleanName: rawDescription };
    }
};

// ... CRUD FUNCTIES ...
const getTransactions = async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({ where: { userId: req.user.userId }, orderBy: { date: 'desc' } });
        res.json(transactions);
    } catch (e) { res.status(500).json({ error: "Fout" }); }
};

const createTransaction = async (req, res) => {
    try {
        const { amount, type, category, description, date } = req.body;
        const newTransaction = await prisma.transaction.create({
            data: { amount: Math.abs(parseFloat(amount)), type, category: category || 'Onvoorzien', description, date: date ? new Date(date) : new Date(), userId: req.user.userId }
        });
        res.status(201).json(newTransaction);
    } catch (e) { res.status(500).json({ error: "Fout" }); }
};

const deleteTransaction = async (req, res) => {
    try { await prisma.transaction.delete({ where: { id: req.params.id } }); res.json({ message: "Verwijderd" }); } 
    catch (e) { res.status(500).json({ error: "Fout" }); }
};

const deleteMultipleTransactions = async (req, res) => {
    try { await prisma.transaction.deleteMany({ where: { id: { in: req.body.ids }, userId: req.user.userId } }); res.json({ message: "Verwijderd" }); } 
    catch (e) { res.status(500).json({ error: "Fout" }); }
};

// --- NIEUWE FUNCTIE: TRANSACTIE VERBERGEN/TONEN ---
const toggleTransactionVisibility = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // 1. Zoek de transactie om te controleren of deze van de user is
        const transaction = await prisma.transaction.findUnique({
            where: { id: id }
        });

        if (!transaction || transaction.userId !== userId) {
            return res.status(404).json({ error: "Transactie niet gevonden of geen toegang." });
        }

        // 2. Update de status
        const updatedTransaction = await prisma.transaction.update({
            where: { id: id },
            data: { isHidden: !transaction.isHidden }
        });

        res.json(updatedTransaction);
    } catch (error) {
        console.error("Fout bij wijzigen zichtbaarheid:", error);
        res.status(500).json({ error: "Serverfout" });
    }
};

/**
 * UPLOAD FUNCTIE
 */
const uploadCSV = async (req, res) => {
    const filePath = req.file?.path;
    if (!req.file) return res.status(400).json({ error: "Geen bestand." });

    const userId = req.user.userId;
    const results = [];
    const aiCache = new Map();

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const isPremium = user?.isPremium || false;
        
        console.log(`Import gestart voor ${user.username} (${isPremium ? 'PREMIUM' : 'GRATIS'})`);

        const firstLine = await new Promise((resolve) => {
            const stream = fs.createReadStream(filePath, { end: 100 });
            stream.on('data', (c) => { resolve(c.toString().split('\n')[0]); stream.destroy(); });
        });
        const separator = firstLine.includes(';') ? ';' : ',';

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath).pipe(csv({ separator })).on('data', d => results.push(d)).on('error', reject).on('end', resolve);
        });

        const history = await prisma.transaction.findMany({
            where: { userId },
            select: { description: true, category: true },
            distinct: ['description'] 
        });
        const historyMap = new Map();
        history.forEach(t => { if (t.description) historyMap.set(t.description.toLowerCase(), t.category); });

        const existingHashes = new Set();
        const allUserTransactions = await prisma.transaction.findMany({ where: { userId }, select: { date: true, amount: true, description: true } });
        allUserTransactions.forEach(t => existingHashes.add(createTransactionHash(t.date, t.amount, t.description)));

        console.log(`Start verwerking van ${results.length} regels.`);

        let transactionsToCreate = [];
        let stats = { skipped: 0, static: 0, history: 0, ai_cache: 0, ai_cost: 0 };

        for (let i = 0; i < results.length; i += BATCH_SIZE) {
            const batch = results.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (row) => {
                const name = row['Name'] || row['Naam'] || '';
                const desc = row['Description'] || row['Omschrijving'] || row['Mededelingen'] || '';
                const rawDesc = `${name} ${desc}`.trim() || 'Import';
                const lowerDesc = rawDesc.toLowerCase();
                const rawAmt = row['Amount'] || row['Bedrag'] || '0';
                const amount = parseFloat(String(rawAmt).replace(',', '.'));
                
                if (isNaN(amount) || amount === 0) return null;

                const date = new Date(row['Date'] || row['Datum'] || new Date());
                const type = amount >= 0 ? 'income' : 'expense';

                let finalName = null;
                let finalCategory = null;

                for (const [key, val] of Object.entries(STATIC_KEYWORDS)) {
                    if (lowerDesc.includes(key)) {
                        finalName = val.cleanName;
                        finalCategory = val.category;
                        stats.static++;
                        break;
                    }
                }

                if (!finalCategory) {
                    for (const [histName, histCat] of historyMap) {
                        if (lowerDesc.includes(histName)) {
                            finalCategory = histCat;
                            if (!finalName) finalName = isPremium ? (histName.charAt(0).toUpperCase() + histName.slice(1)) : cleanNameLocal(rawDesc);
                            stats.history++;
                            break;
                        }
                    }
                }

                if (!finalCategory) {
                    if (aiCache.has(rawDesc)) {
                        const cached = aiCache.get(rawDesc);
                        finalCategory = cached.category;
                        finalName = cached.cleanName || cleanNameLocal(rawDesc);
                        stats.ai_cache++;
                    } else {
                        if (isPremium) {
                            const result = await analyzePremium(rawDesc);
                            finalName = result.cleanName;
                            finalCategory = result.category;
                            aiCache.set(rawDesc, result);
                            stats.ai_cost++;
                        } else {
                            const result = await analyzeCategoryOnly(rawDesc);
                            finalCategory = result.category;
                            finalName = cleanNameLocal(rawDesc);
                            aiCache.set(rawDesc, { ...result, cleanName: finalName });
                            stats.ai_cost++;
                        }
                    }
                } else if (!finalName) {
                    finalName = cleanNameLocal(rawDesc);
                }

                const hash = createTransactionHash(date, Math.abs(amount), finalName);
                if (existingHashes.has(hash)) {
                    stats.skipped++;
                    return null;
                }
                existingHashes.add(hash);

                return {
                    amount: Math.abs(amount),
                    type,
                    description: finalName.substring(0, 255),
                    category: finalCategory,
                    date,
                    userId,
                    isHidden: false // Standaard zichtbaar
                };
            });

            const validResults = (await Promise.all(batchPromises)).filter(r => r !== null);
            transactionsToCreate.push(...validResults);
        }

        if (transactionsToCreate.length > 0) {
            await prisma.transaction.createMany({ data: transactionsToCreate });
        }

        console.log(`Klaar. Nieuw: ${transactionsToCreate.length}. Skipped: ${stats.skipped}. AI calls: ${stats.ai_cost}`);

        res.json({ 
            message: `Klaar! ${transactionsToCreate.length} transacties toegevoegd.`,
            count: transactionsToCreate.length 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Fout" });
    } finally {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
};

module.exports = { 
    getTransactions, 
    createTransaction, 
    deleteTransaction, 
    deleteMultipleTransactions, 
    uploadCSV,
    toggleTransactionVisibility 
};