import React from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMessages } from '@/hooks/useMessages.js';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

export default function ProviderMessagingPage() {
	const { messages, loading } = useMessages();

	return (
		<div className="space-y-8 max-w-7xl mx-auto">
			<Helmet>
				<title>Messages - PayPill</title>
			</Helmet>
			<h1 className="text-3xl font-bold tracking-tight">Secure messaging</h1>

			<Card className="shadow-sm border-border/50">
				<CardHeader>
					<CardTitle>Inbox</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<LoadingSpinner />
					) : messages.length > 0 ? (
						<div className="space-y-4">
							{messages.map((msg) => (
								<div key={msg.id} className="p-4 border rounded-lg">
									<h4 className="font-semibold">{msg.subject}</h4>
									{msg.patient_label ? (
										<p className="text-xs text-muted-foreground mb-1">Patient: {msg.patient_label}</p>
									) : null}
									<p className="text-sm text-muted-foreground">{msg.content}</p>
								</div>
							))}
						</div>
					) : (
						<div className="text-center p-12 border rounded-xl border-dashed text-muted-foreground">
							No messages yet. Send from a patient record when compose is enabled.
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
