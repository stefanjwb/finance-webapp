import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';

function App() {
  return (
    <Routes>
      {/* De route naar de inlogpagina */}
      <Route path="/login" element={<Login />} />

      {/* De route naar de registratiepagina */}
      <Route path="/register" element={<Register />} />

      {/* Vangnet: Als iemand een onbekende URL typt, stuur ze naar /login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;