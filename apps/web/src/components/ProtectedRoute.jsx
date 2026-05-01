import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, userRole, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    return <Navigate to={userRole === 'provider' ? '/provider/dashboard' : '/dashboard'} replace />;
  }

  return children;
}