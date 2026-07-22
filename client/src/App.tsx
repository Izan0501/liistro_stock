import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Profile from './pages/Profile';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import { useAuth } from './context/AuthContext';

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
