import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';

export function ProviderServicesSidePanel({ services, onManage }) {
	return (
		<Card className="shadow-sm border-border/50">
			<CardHeader className="pb-3 border-b">
				<CardTitle className="text-lg flex items-center gap-2">
					<ListChecks className="h-4 w-4" />
					Services & pricing
				</CardTitle>
			</CardHeader>
			<CardContent className="p-4 text-sm">
				{services?.recent?.length ? (
					<ul className="space-y-2">
						{services.recent.map((svc) => (
							<li key={svc.id} className="flex justify-between gap-2">
								<span className={svc.is_active ? '' : 'text-muted-foreground line-through'}>{svc.name}</span>
								<span className="text-muted-foreground shrink-0">${Number(svc.price).toFixed(2)}</span>
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground">
						No billable services yet. Services added in admin Service Catalog appear here when your practice is linked.
					</p>
				)}
				{onManage ? (
					<button type="button" className="mt-3 text-teal-600 font-medium underline text-sm" onClick={onManage}>
						Manage catalog
					</button>
				) : null}
			</CardContent>
		</Card>
	);
}
