// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// --- Middleware om te checken of iemand admin is ---
const requireAdmin = (req, res, next) => {
    // authMiddleware heeft req.user al gevuld met de data uit het token
    if (req.user && req.user.role === 'admin') {
        next(); // Gebruiker is admin, ga door naar de controller
    } else {
        res.status(403).json({ error: "Geen toegang: Alleen voor beheerders." });
    }
};

// NIEUW: Route voor eigen profiel (voor Premium check)
// Deze moet BOVEN de /:id routes staan, anders denkt Express dat 'me' een ID is.
// Geen requireAdmin hier, want iedereen mag zijn eigen info zien.
router.get('/me', authMiddleware, userController.getUserProfile);

// GET /api/users -> Haal lijst op (Alleen voor admins)
router.get('/', authMiddleware, requireAdmin, userController.getAllUsers);

// DELETE /api/users/:id -> Verwijder specifieke gebruiker (Alleen voor admins)
router.delete('/:id', authMiddleware, requireAdmin, userController.deleteUser);

// PUT /api/users/:id/role -> Pas gebruiker aan (Rol & Premium) (Alleen voor admins)
router.put('/:id/role', authMiddleware, requireAdmin, userController.updateUser);

module.exports = router;