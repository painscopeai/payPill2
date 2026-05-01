'use client';

import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/AppRoutes.jsx';

export default function LegacyCatchAllInner() {
	return (
		<BrowserRouter>
			<AppRoutes />
		</BrowserRouter>
	);
}
