const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- REGISTREREN ---
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Check of gebruiker al bestaat
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: username },
                    { email: email }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ error: "Gebruikersnaam of e-mail is al in gebruik." });
        }

        // 2. Wachtwoord veilig hashen (versleutelen)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Gebruiker opslaan in database
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: 'user' // Standaard rol
            }
        });

        res.status(201).json({ message: "Account succesvol aangemaakt!" });

    } catch (error) {
        console.error("Registratie fout:", error);
        res.status(500).json({ error: "Er ging iets mis bij het registreren." });
    }
};

// --- INLOGGEN ---
const login = async (req, res) => {
    try {
        // We noemen het veld 'username' omdat de frontend dat stuurt,
        // maar de gebruiker kan hier ook een e-mail invullen.
        const { username, password } = req.body;

        // 1. Zoek de gebruiker op gebruikersnaam OF e-mail
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: username },
                    { email: username } // Zoek de input ook in de email kolom
                ]
            }
        });

        if (!user) {
            return res.status(401).json({ error: "Ongeldige inloggegevens." });
        }

        // 2. Controleer het wachtwoord
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Ongeldige inloggegevens." });
        }

        // 3. Maak een token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET || 'geheim_sleutel',
            { expiresIn: '7d' }
        );

        res.json({ 
            token, 
            user: {
                username: user.username,
                email: user.email, // Handig om ook terug te sturen
                role: user.role
            }
        });

    } catch (error) {
         console.error("Login fout:", error);
         res.status(500).json({ error: "Er ging iets mis bij het inloggen." });
    }
};

module.exports = { register, login };