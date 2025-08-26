import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, setAccessToken, clearAccessToken } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Clear auth state and redirect to login
  const clearAuth = useCallback(() => {
    setUser(null);
    clearAccessToken();
    // Clear any stored tokens in localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we have a session in this tab
        const sessionUser = sessionStorage.getItem('authUser');
        
        if (!sessionUser) {
          // No session in this tab, clear everything
          clearAuth();
          setLoading(false);
          return;
        }

        // Try to refresh token on app start
        const response = await fetch('http://localhost:5000/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setAccessToken(data.accessToken);
          
          // Decode token to get user info
          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          const userData = {
            id: payload.id,
            role: payload.role,
          };
          setUser(userData);
          
          // Update session storage
          sessionStorage.setItem('authUser', JSON.stringify(userData));
        } else {
          // Refresh failed, clear everything
          clearAuth();
          sessionStorage.removeItem('authUser');
        }
      } catch (error) {
        console.log('No valid session found');
        clearAuth();
        sessionStorage.removeItem('authUser');
      } finally {
        setLoading(false);
      }
    };

    // Check auth status
    checkAuth();

    // Listen for storage events to sync logout across tabs
    const handleStorageChange = (e) => {
      if (e.key === 'logout-event') {
        clearAuth();
        // Force page reload to redirect to login
        window.location.href = '/admin-login';
      }
    };

    // Listen for auth changes in other tabs
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [clearAuth]);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { accessToken, user: userData } = response;
      
      setUser(userData);
      
      // Store minimal user data in sessionStorage for tab sync
      sessionStorage.setItem('authUser', JSON.stringify(userData));
      
      return { success: true, user: userData };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, error: message };
    }
  };

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      // Clear session storage
      sessionStorage.removeItem('authUser');
      // Notify other tabs about logout
      localStorage.setItem('logout-event', Date.now().toString());
      localStorage.removeItem('logout-event');
    }
  }, [clearAuth]);

  // Handle browser/tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear session storage on tab close
      sessionStorage.removeItem('authUser');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
