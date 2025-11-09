import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenManager, authAPI } from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState(tokenManager.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(tokenManager.isAuthenticated());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Odśwież stan gdy tokeny się zmienią
  useEffect(() => {
    const checkAuth = () => {
      setUser(tokenManager.getUser());
      setIsAuthenticated(tokenManager.isAuthenticated());
    };

    // Nasłuchuj na zmiany w localStorage
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await authAPI.login(credentials);
      setUser(tokenManager.getUser());
      setIsAuthenticated(true);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Błąd logowania' 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Nawet jeśli backend nie odpowie, wyczyść lokalnie
      tokenManager.clearTokens();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      navigate('/login');
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await authAPI.register(userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors || 'Błąd rejestracji' 
      };
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role) => {
    // TODO: Dodać obsługę ról z JWT claims
    return user?.roles?.includes(role) || false;
  };

  const getFullName = () => {
    if (!user) return '';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  };

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    register,
    hasRole,
    getFullName,
    userId: user?.userId,
    email: user?.email,
    firstName: user?.firstName,
    lastName: user?.lastName
  };
};
