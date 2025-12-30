import { Routes, Route } from 'react-router-dom';
import { Container, Title, Text } from '@mantine/core';
import Login from './Login';
import Register from './Register';
import AdminPanel from './AdminPanel';
import ProtectedRoute from './ProtectedRoute';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import Layout from './Layout';
import Transactions from './Transactions';
import Statistics from './Statistics'; 
import Budgets from './Budgets';

const PlaceholderPage = ({ title }) => (
    <Container size="lg" py="xl">
        <Title order={2}>{title}</Title>
        <Text c="dimmed">Deze pagina is nog in aanbouw.</Text>
    </Container>
);

function App() {
  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* BELANGRIJK: Hier stond eerst een losse route naar /budgets. 
            Die MOET weg zijn, anders zie je geen navbar. */}

        {/* Alle pagina's binnen dit blok krijgen de Layout (Navbar + Header) */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/statistics" element={<Statistics />} />
            
            {/* Hier plaatsen we Budgets, zodat hij IN de Layout valt */}
            <Route path="/budgets" element={<Budgets />} />
            
            <Route path="/settings" element={<PlaceholderPage title="Instellingen" />} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"> <AdminPanel /> </ProtectedRoute>} />
        </Route>
    </Routes>
  );
}

export default App;