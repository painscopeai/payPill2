import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

/**
 * Fine-grained permissions can use profiles.permissions later.
 * Admins with role "admin" may access all modules for now.
 */
export default function PermissionGuard({ module, action, children, fallback }) {
  const { currentUser, userRole, isAuthenticated } = useAuth();

  if (!isAuthenticated || userRole !== 'admin' || !currentUser) {
    return (
      fallback || (
        <Alert variant="destructive" className="m-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>You must be logged in as an administrator to access this feature.</AlertDescription>
        </Alert>
      )
    );
  }

  const perms = currentUser.permissions;
  if (Array.isArray(perms) && perms.length > 0) {
    const key = `${module}:${action}`;
    const wildcard = `${module}:*`;
    if (!perms.includes(key) && !perms.includes(wildcard) && !perms.includes('*')) {
      return (
        fallback || (
          <Alert variant="destructive" className="m-4">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              You do not have permission to {action} {module}. Contact your administrator.
            </AlertDescription>
          </Alert>
        )
      );
    }
  }

  return <>{children}</>;
}
