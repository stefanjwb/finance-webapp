// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users -> Haal lijst op
router.get('/', userController.getAllUsers);

// DELETE /api/users/:id -> Verwijder specifieke gebruiker
router.delete('/:id', userController.deleteUser);

module.exports = router;