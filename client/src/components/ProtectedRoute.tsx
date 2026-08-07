import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── KILL SWITCH ─────────────────────────────────────────────────────────────
// Set to false to restore normal access.
const IS_SYSTEM_LOCKED = true;

export default function ProtectedRoute() {
  const { isAuthenticated, logout } = useAuth();

  // Force-evict any active session when the system is locked.
  // Dependency on `logout` (stable useCallback ref) prevents infinite loops.
  useEffect(() => {
    if (IS_SYSTEM_LOCKED && isAuthenticated) {
      logout();
    }
  }, [isAuthenticated, logout]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // While locked, never render child routes — the useEffect above
  // will trigger logout() and the isAuthenticated guard above redirects.
  if (IS_SYSTEM_LOCKED) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
