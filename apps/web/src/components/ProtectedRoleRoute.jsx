import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

const ProtectedRoleRoute = ({ requiredRole, children }) => {
  const { currentUser, userRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground font-medium mt-4">Verifying access...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  const baseRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const allowed = new Set(baseRoles);
  for (const r of baseRoles) {
    if (['individual', 'employer', 'insurance', 'provider'].includes(r)) {
      allowed.add('admin');
    }
  }

  if (!allowed.has(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoleRoute;