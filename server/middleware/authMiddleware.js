// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    // Haal de token uit de header (vorm: "Bearer <token>")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Geen toegang. Log opnieuw in." });

    jwt.verify(token, process.env.JWT_SECRET || 'geheim_sleutel', (err, user) => {
        if (err) return res.status(403).json({ error: "Sessie verlopen." });
        
        // Token is geldig! We plakken de user info aan het verzoek.
        req.user = user; 
        next();
    });
};

module.exports = authenticateToken;