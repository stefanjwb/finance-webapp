// server/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authenticateToken = require('../middleware/authMiddleware');
const upload = multer({ dest: 'uploads/' });

// Alle routes in dit bestand zijn beveiligd!
router.use(authenticateToken);

router.get('/', transactionController.getTransactions);
router.post('/', transactionController.createTransaction);
router.delete('/:id', transactionController.deleteTransaction);

router.post('/upload', upload.single('file'), transactionController.uploadCSV);

module.exports = router;