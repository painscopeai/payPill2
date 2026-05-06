'use client';

import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/AppRoutes.jsx';
import ForcePasswordChangeGuard from '@/components/ForcePasswordChangeGuard.jsx';

export default function LegacyCatchAllInner() {
	return (
		<BrowserRouter>
			<ForcePasswordChangeGuard>
				<AppRoutes />
			</ForcePasswordChangeGuard>
		</BrowserRouter>
	);
}
