'use client';

import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/AppRoutes.jsx';

export default function CatchAllPage() {
	return (
		<BrowserRouter>
			<AppRoutes />
		</BrowserRouter>
	);
}
