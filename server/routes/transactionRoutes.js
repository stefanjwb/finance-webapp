// server/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const transactionController = require('../controllers/transactionController');
const authenticateToken = require('../middleware/authMiddleware');

// Configuratie
const upload = multer({ dest: 'uploads/' });

// Middleware: Alle onderstaande routes vereisen inloggen
router.use(authenticateToken);

// --- 1. Basis Lijst & Toevoegen ---
router.get('/', transactionController.getTransactions);      // Haal alles op
router.post('/', transactionController.createTransaction);   // Handmatig toevoegen

// --- 2. Speciale Acties ---
router.post('/upload', upload.single('file'), transactionController.uploadCSV); // CSV Upload
router.post('/bulk-delete', transactionController.deleteMultipleTransactions);  // Meerdere verwijderen

// --- 3. Specifieke Transactie Acties (op ID) ---
router.put('/:id', transactionController.updateTransaction);            // Bewerken (Update) [NIEUW]
router.delete('/:id', transactionController.deleteTransaction);         // Verwijderen
router.put('/:id/toggle-visibility', transactionController.toggleTransactionVisibility); // Oogje (Toggle)

module.exports = router;