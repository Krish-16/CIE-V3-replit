import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children, role }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Security: Clear any potential cached data on route access attempt
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear any residual auth data when accessing protected routes
      sessionStorage.removeItem('authUser');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, [isAuthenticated, location.pathname]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          padding: '20px',
          borderRadius: '8px',
          backgroundColor: 'white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    // Redirect to appropriate login page based on requested role
    const loginRoutes = {
      admin: '/admin-login',
      faculty: '/faculty',
      student: '/',
    };
    
    // Log the unauthorized access attempt
    console.warn(`Unauthorized access attempt to ${location.pathname} for role: ${role}`);
    
    return <Navigate to={loginRoutes[role] || '/'} replace state={{ from: location }} />;
  }

  // Check if user has the correct role for this route
  if (user.role !== role) {
    // Log the role mismatch
    console.warn(`Role mismatch: User role '${user.role}' attempted to access '${role}' route: ${location.pathname}`);
    
    // Redirect to their appropriate dashboard
    const dashboardRoutes = {
      admin: '/admin',
      faculty: '/faculty',
      student: '/student',
    };
    
    return <Navigate to={dashboardRoutes[user.role] || '/'} replace />;
  }

  // Additional security check: verify session storage matches
  try {
    const sessionUser = sessionStorage.getItem('authUser');
    if (!sessionUser) {
      // Hydrate minimal session from current context and continue
      sessionStorage.setItem('authUser', JSON.stringify({ id: user.id, role: user.role }));
    } else {
      const parsed = JSON.parse(sessionUser);
      // Enforce role consistency only (avoid id mismatch between adminId and _id)
      if (parsed.role !== user.role) {
        console.warn('Session role mismatch, redirecting to login');
        sessionStorage.removeItem('authUser');
        return <Navigate to={`/${role === 'admin' ? 'admin-login' : role}`} replace />;
      }
    }
  } catch (_) {
    // Reset bad session and continue with hydrated session
    sessionStorage.removeItem('authUser');
    try { sessionStorage.setItem('authUser', JSON.stringify({ id: user.id, role: user.role })); } catch (_) {}
  }

  return children;
};

export default PrivateRoute;
