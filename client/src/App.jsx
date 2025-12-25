import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import AdminPanel from './AdminPanel';
import ProtectedRoute from './ProtectedRoute';
import Dashboard from './dashboard';
import LandingPage from './LandingPage';

function App() {
  return (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"> <AdminPanel /> </ProtectedRoute>} />
        <Route path="/dashboard" element={ <ProtectedRoute> <Dashboard /> </ProtectedRoute> } />
    </Routes>
  );
}

export default App;