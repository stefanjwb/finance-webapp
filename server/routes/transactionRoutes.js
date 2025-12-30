const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
    getTransactions, 
    createTransaction, 
    deleteTransaction, 
    updateTransaction,
    toggleVisibility,
    uploadCSV,
    bulkDelete
} = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');

// --- MULTER CONFIGURATIE (Voor bon uploads) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Slaat op in de map 'uploads'
    },
    filename: (req, file, cb) => {
        // Unieke naam: timestamp-bestandsnaam
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// --- ROUTES ---

router.use(authMiddleware);

router.get('/', getTransactions);
router.post('/', createTransaction);

// CSV Upload gebruikt memoryStorage (zoals je waarschijnlijk al had in je controller)
const csvUpload = multer({ storage: multer.memoryStorage() });
router.post('/upload', csvUpload.single('file'), uploadCSV);

router.post('/bulk-delete', bulkDelete);

// AANPASSING: Voeg 'upload.single' toe aan de PUT route
// We verwachten een veld genaamd 'receipt'
router.put('/:id', upload.single('receipt'), updateTransaction);

router.put('/:id/toggle-visibility', toggleVisibility);
router.delete('/:id', deleteTransaction);

module.exports = router;