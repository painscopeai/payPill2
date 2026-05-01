import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function AdminLandingPage() {
	const { currentUser, userRole, isInitializing } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (isInitializing) return;
		if (currentUser && userRole === 'admin') {
			navigate('/admin/dashboard', { replace: true });
		} else {
			navigate('/auth/admin', { replace: true });
		}
	}, [currentUser, userRole, isInitializing, navigate]);

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="text-center space-y-4">
				<LoadingSpinner size="lg" />
				<p className="text-muted-foreground font-medium animate-pulse">Initializing Admin Portal...</p>
			</div>
		</div>
	);
}
