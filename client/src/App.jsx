import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import AdminPanel from './AdminPanel';
import Main from './main'; 
import ProtectedRoute from './ProtectedRoute';
import Dashboard from './Dashboard';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"> <AdminPanel /> </ProtectedRoute>} />
      <Route path="/" element={<Dashboard />} />
      
      {/* Hoofdpagina (Dashboard) */}
      {/* 2. Hier koppelen we de '/' URL aan jouw nieuwe Main component */}
      <Route path="/" element={<Main />} />
    </Routes>
  );
}

export default App;