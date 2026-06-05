import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import {
	getAdminAppOrigin,
	getAppHostKind,
	isAdminAppPath,
	isPortalAppPath,
} from '@/lib/appHost.js';

/**
 * Enforces portal vs admin subdomain routing in production hosts.
 * localhost / *.vercel.app remain unrestricted for development.
 */
export default function HostRouteGuard({ children }) {
	const location = useLocation();
	const hostKind = getAppHostKind();
	const { pathname, search, hash } = location;
	const redirectStarted = useRef(false);

	useEffect(() => {
		redirectStarted.current = false;
	}, [pathname, search, hash, hostKind]);

	if (hostKind === 'admin') {
		if (pathname === '/') {
			return <Navigate to="/admin" replace />;
		}
		if (isPortalAppPath(pathname)) {
			return <Navigate to="/admin" replace />;
		}
	}

	if (hostKind === 'portal' && isAdminAppPath(pathname)) {
		if (!redirectStarted.current) {
			redirectStarted.current = true;
			const target = `${getAdminAppOrigin()}${pathname}${search}${hash}`;
			window.location.replace(target);
		}
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	return children;
}
