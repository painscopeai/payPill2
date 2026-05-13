import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import apiServerClient from '@/lib/apiServerClient';

export default function ProviderClaimsPage() {
	const [note, setNote] = useState('');

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const res = await apiServerClient.fetch('/provider/claims');
			const body = await res.json().catch(() => ({}));
			if (!cancelled && res.ok) setNote(body.note || '');
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<div className="space-y-4 max-w-3xl">
			<Helmet>
				<title>Claims - Provider - PayPill</title>
			</Helmet>
			<h1 className="text-3xl font-bold tracking-tight">Claims</h1>
			<p className="text-muted-foreground leading-relaxed">{note || 'Loading…'}</p>
		</div>
	);
}
