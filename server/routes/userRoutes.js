// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/users -> Haal lijst op
router.get('/', authMiddleware, userController.getAllUsers);

// DELETE /api/users/:id -> Verwijder specifieke gebruiker
router.delete('/:id', authMiddleware, userController.deleteUser);

// PUT /api/users/:id/role -> Pas gebruiker aan (Rol & Premium)
// LET OP: Gebruik hier 'updateUser' omdat we de functie in de controller hebben hernoemd
router.put('/:id/role', authMiddleware, userController.updateUser);

module.exports = router;