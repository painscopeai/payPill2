import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Redirects users who must change password (e.g. bulk-imported employees) before using the app.
 */
export default function ForcePasswordChangeGuard({ children }) {
	const { isInitializing, passwordChangeRequired, currentUser } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => {
		if (isInitializing) return;
		if (!currentUser || !passwordChangeRequired) return;
		if (location.pathname === '/auth/reset-password-required') return;
		navigate('/auth/reset-password-required', { replace: true });
	}, [isInitializing, passwordChangeRequired, currentUser, location.pathname, navigate]);

	return children;
}
