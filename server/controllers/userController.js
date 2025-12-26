// server/controllers/userController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Alle gebruikers ophalen (Alleen voor admins)
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isPremium: true,
                createdAt: true
            }
        });
        res.json(users);
    } catch (error) {
        console.error("Fout bij ophalen gebruikers:", error);
        res.status(500).json({ error: "Kon gebruikers niet ophalen" });
    }
};

// 2. Een gebruiker verwijderen (Alleen voor admins)
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

// 3. Gebruiker updaten (Rol én Premium status) (Alleen voor admins)
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { role, isPremium } = req.body; 

    try {
        const updatedUser = await prisma.user.update({
            where: { id: id },
            data: { 
                role: role,
                isPremium: Boolean(isPremium) 
            },
            select: { 
                id: true, 
                username: true, 
                email: true, 
                role: true,
                isPremium: true 
            } 
        });
        res.json(updatedUser);
    } catch (error) {
        console.error("Fout bij updaten gebruiker:", error);
        res.status(500).json({ error: "Kon gebruiker niet updaten" });
    }
};

// 4. NIEUW: Haal profiel op van de ingelogde gebruiker (Voor Dashboard premium check)
const getUserProfile = async (req, res) => {
    try {
        // req.user.userId komt uit de authenticateToken middleware
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { 
                id: true, 
                username: true, 
                email: true, 
                isPremium: true, 
                role: true 
            }
        });
        
        if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden" });
        
        res.json(user);
    } catch (error) {
        console.error("Profiel fout:", error);
        res.status(500).json({ error: "Kon profiel niet ophalen" });
    }
};

module.exports = { getAllUsers, deleteUser, updateUser, getUserProfile };