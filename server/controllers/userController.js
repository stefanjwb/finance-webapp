// server/controllers/userController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Alle gebruikers ophalen
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                createdAt: true
            }
        });
        res.json(users);
    } catch (error) {
        console.error("Fout bij ophalen gebruikers:", error);
        res.status(500).json({ error: "Kon gebruikers niet ophalen" });
    }
};

// 2. Een gebruiker verwijderen
const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.user.delete({
            where: { id: id } 
        });
        res.json({ message: "Gebruiker succesvol verwijderd" });
    } catch (error) {
        console.error("Fout bij verwijderen:", error);
        res.status(500).json({ error: "Kon gebruiker niet verwijderen" });
    }
};

// 3. (NIEUW) Gebruikersrol aanpassen
const updateUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body; // Verwacht { role: 'admin' } of { role: 'user' }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: id },
            data: { role: role },
            select: { id: true, username: true, email: true, role: true } // Stuur de nieuwe data terug
        });
        res.json(updatedUser);
    } catch (error) {
        console.error("Fout bij aanpassen rol:", error);
        res.status(500).json({ error: "Kon rol niet aanpassen" });
    }
};

module.exports = { getAllUsers, deleteUser, updateUserRole };