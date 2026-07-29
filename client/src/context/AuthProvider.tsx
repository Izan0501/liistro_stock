import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { AuthContext, type User } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user:v1');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('auth:v1');
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let isCancelled = false;
    const fetchProfile = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me');
          if (!isCancelled) {
            setUser(response.data);
            localStorage.setItem('user:v1', JSON.stringify(response.data));
          }
        } catch (error) {
          console.error("Failed to fetch user profile", error);
        }
      }
    };
    fetchProfile();
    return () => { isCancelled = true; };
  }, [token]);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('auth:v1', newToken);
    localStorage.setItem('user:v1', JSON.stringify(newUser));
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth:v1');
    localStorage.removeItem('user:v1');
    queryClient.clear();
    navigate('/login', { replace: true });
  }, [navigate, queryClient]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const contextValue = useMemo(() => ({
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token
  }), [user, token, login, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
