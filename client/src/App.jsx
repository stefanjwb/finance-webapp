import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import AdminPanel from './AdminPanel';
import ProtectedRoute from './ProtectedRoute';
import Dashboard from './dashboard';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"> <AdminPanel /> </ProtectedRoute>} />
      <Route path="/" element={<Dashboard />} />
    </Routes>
  );
}

export default App;