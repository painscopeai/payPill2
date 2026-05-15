import React, { useEffect, useState } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { publicFormUrl } from '@/lib/publicFormUrl';
import { ExternalLink, Loader2 } from 'lucide-react';

/**
 * Read-only links to published consent / intake forms for a catalog service.
 * Uses the public API so employer, insurance, and provider UIs can share the same surface.
 */
export default function ServiceFormLinks({ serviceId, className = '' }) {
	const [state, setState] = useState({ loading: true, consent: null, intake: null, error: '' });

	useEffect(() => {
		if (!serviceId) {
			setState({ loading: false, consent: null, intake: null, error: '' });
			return;
		}
		let cancelled = false;
		(async () => {
			setState((s) => ({ ...s, loading: true, error: '' }));
			try {
				const res = await apiServerClient.fetch(`/public/provider-services/${serviceId}/forms`, {
					headers: {},
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body.error || 'Could not load forms');
				if (cancelled) return;
				setState({
					loading: false,
					consent: body.consentForm || null,
					intake: body.intakeForm || null,
					error: '',
				});
			} catch (e) {
				if (!cancelled) {
					setState({ loading: false, consent: null, intake: null, error: e?.message || 'Failed to load' });
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [serviceId]);

	if (!serviceId) return null;
	if (state.loading) {
		return (
			<div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
				<Loader2 className="h-3 w-3 animate-spin" /> Forms…
			</div>
		);
	}
	if (state.error) {
		return <p className={`text-xs text-muted-foreground ${className}`}>{state.error}</p>;
	}
	if (!state.consent && !state.intake) {
		return <span className={`text-xs text-muted-foreground ${className}`}>No published forms</span>;
	}

	return (
		<div className={`flex flex-wrap gap-x-3 gap-y-1 text-xs ${className}`}>
			{state.consent ? (
				<a
					href={publicFormUrl(state.consent.id)}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
				>
					View consent form
					<ExternalLink className="h-3 w-3" />
				</a>
			) : null}
			{state.intake ? (
				<a
					href={publicFormUrl(state.intake.id)}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
				>
					View intake form
					<ExternalLink className="h-3 w-3" />
				</a>
			) : null}
		</div>
	);
}
