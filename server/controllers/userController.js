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
                // We selecteren expres GEEN password
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
    const { id } = req.params; // Haal ID uit de URL

    try {
        await prisma.user.delete({
            where: { id: parseInt(id) } // Zorg dat het een getal is
        });
        res.json({ message: "Gebruiker succesvol verwijderd" });
    } catch (error) {
        console.error("Fout bij verwijderen:", error);
        res.status(500).json({ error: "Kon gebruiker niet verwijderen" });
    }
};

module.exports = { getAllUsers, deleteUser };
