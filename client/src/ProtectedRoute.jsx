import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole }) => {
    // Haal gegevens uit localStorage
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    // 1. Check: Is de gebruiker überhaupt ingelogd?
    if (!token || !user) {
        // Zo nee -> Stuur terug naar login
        return <Navigate to="/login" replace />;
    }

    // 2. Check: Heeft de gebruiker de vereiste rol? (Alleen als we erom vragen)
    if (requiredRole && user.role !== requiredRole) {
        // Zo nee -> Stuur naar homepagina (of toon een foutmelding)
        // Je kunt hier eventueel een "403 Unauthorized" pagina tonen
        return <Navigate to="/" replace />;
    }

    // 3. Alles veilig? Toon de pagina (children)
    return children;
};

export default ProtectedRoute;
