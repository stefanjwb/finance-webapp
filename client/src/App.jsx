import { Routes, Route } from 'react-router-dom';
import { Container, Title, Text } from '@mantine/core';
import Login from './Login';
import Register from './Register';
import AdminPanel from './AdminPanel';
import ProtectedRoute from './ProtectedRoute';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import Layout from './Layout';
import Transactions from './Transactions'; // Zorg dat deze import klopt

// Placeholder voor pagina's die nog niet af zijn
const PlaceholderPage = ({ title }) => (
    <Container size="lg" py="xl">
        <Title order={2}>{title}</Title>
        <Text c="dimmed">Deze pagina is nog in aanbouw.</Text>
    </Container>
);

function App() {
  return (
    <Routes>
        {/* Publieke routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Beschermde routes binnen de nieuwe Layout */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            
            {/* Het dashboard (nu met alleen samenvatting) */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* De nieuwe transacties pagina (volledige tabel + beheer) */}
            <Route path="/transactions" element={<Transactions />} />
            
            {/* Nog te bouwen pagina's */}
            <Route path="/statistics" element={<PlaceholderPage title="Statistieken & Rapportages" />} />
            <Route path="/budgets" element={<PlaceholderPage title="Budgetten" />} />
            <Route path="/settings" element={<PlaceholderPage title="Instellingen" />} />
            
            {/* Admin route */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"> <AdminPanel /> </ProtectedRoute>} />
        </Route>
    </Routes>
  );
}

export default App;