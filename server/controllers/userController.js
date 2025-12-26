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
                isPremium: true, // <--- NIEUW: Haal premium status op
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

// 3. Gebruiker updaten (Rol én Premium status)
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { role, isPremium } = req.body; 

    try {
        const updatedUser = await prisma.user.update({
            where: { id: id },
            data: { 
                role: role,
                isPremium: Boolean(isPremium) // Zorg dat het opgeslagen wordt
            },
            select: { 
                id: true, 
                username: true, 
                email: true, 
                role: true,
                isPremium: true // Stuur de nieuwe status terug naar frontend
            } 
        });
        res.json(updatedUser);
    } catch (error) {
        console.error("Fout bij updaten gebruiker:", error);
        res.status(500).json({ error: "Kon gebruiker niet updaten" });
    }
};

// Let op: updateUserRole is hernoemd naar updateUser
module.exports = { getAllUsers, deleteUser, updateUser };