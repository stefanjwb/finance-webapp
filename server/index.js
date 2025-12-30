require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // Nodig voor paden
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// NIEUW: Maak de 'uploads' map statisch toegankelijk
// Zorg dat je een map 'uploads' hebt aangemaakt in je server root
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server draait op poort ${PORT}`);
});