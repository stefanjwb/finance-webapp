const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); // Logger tool
require('dotenv').config();

// Routes importeren
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================
// 1. Middleware
// ==========================
app.use(cors());              // Sta verbindingen van buitenaf (Frontend) toe
app.use(express.json());      // Zorg dat we JSON data kunnen lezen
app.use(morgan('dev'));       // Log elk verzoek in de terminal (voor debugging)

// ==========================
// 2. Routes
// ==========================
// Koppel specifieke routes
app.use('/api/auth', authRoutes);

// Health Check (om te testen of server leeft)
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'online', 
        message: 'De Overdruiven API werkt correct!' 
    });
});

// ==========================
// 3. Foutafhandeling
// ==========================

// 404 Handler: Als een route niet bestaat
app.use((req, res, next) => {
    const error = new Error('Niet gevonden');
    error.status = 404;
    next(error);
});

// Global Error Handler: Vangt alle andere fouten op (bijv. database fouten)
app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

// ==========================
// 4. Server Starten
// ==========================
app.listen(PORT, () => {
    console.log(`Server draait en luistert op http://localhost:${PORT}`);
});