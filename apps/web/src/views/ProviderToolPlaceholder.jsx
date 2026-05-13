import React from 'react';
import { Helmet } from 'react-helmet';

export default function ProviderToolPlaceholder({ title, description }) {
	return (
		<div className="max-w-2xl space-y-3">
			<Helmet>
				<title>{title} - Provider - PayPill</title>
			</Helmet>
			<h1 className="text-2xl font-bold tracking-tight">{title}</h1>
			<p className="text-muted-foreground leading-relaxed">{description}</p>
		</div>
	);
}
