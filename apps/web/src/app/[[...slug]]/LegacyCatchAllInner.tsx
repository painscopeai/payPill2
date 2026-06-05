'use client';

import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/AppRoutes.jsx';
import ForcePasswordChangeGuard from '@/components/ForcePasswordChangeGuard.jsx';
import HostRouteGuard from '@/components/HostRouteGuard.jsx';

export default function LegacyCatchAllInner() {
	return (
		<BrowserRouter>
			<ForcePasswordChangeGuard>
				<HostRouteGuard>
					<AppRoutes />
				</HostRouteGuard>
			</ForcePasswordChangeGuard>
		</BrowserRouter>
	);
}
