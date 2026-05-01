import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function AdminLandingPage() {
	const { user, userRole, isLoading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (isLoading) return;
		if (user && userRole === 'admin') {
			navigate('/admin/dashboard', { replace: true });
		} else {
			navigate('/auth/admin', { replace: true });
		}
	}, [user, userRole, isLoading, navigate]);

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="text-center space-y-4">
				<LoadingSpinner size="lg" />
				<p className="text-muted-foreground font-medium animate-pulse">Initializing Admin Portal...</p>
			</div>
		</div>
	);
}
