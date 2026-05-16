import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ProviderKpiCard({ icon: Icon, label, value, iconClassName, chipClassName }) {
	return (
		<Card className="shadow-sm border-border/50">
			<CardContent className="p-6 flex items-center gap-4">
				<div className={cn('p-3 rounded-xl', chipClassName)}>
					<Icon className={cn('h-6 w-6', iconClassName)} />
				</div>
				<div>
					<p className="text-sm font-medium text-muted-foreground">{label}</p>
					<h3 className="text-2xl font-bold tabular-nums">{value ?? '—'}</h3>
				</div>
			</CardContent>
		</Card>
	);
}

export function ProviderDashboardShell({
	title,
	subtitle,
	primaryAction,
	kpis = [],
	quickActions = [],
	mainPanel,
	sidePanel,
	banner,
	accentButtonClass = 'bg-teal-600 hover:bg-teal-700 text-white',
}) {
	return (
		<div className="space-y-8 max-w-7xl mx-auto">
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{title}</h1>
					{subtitle ? <p className="text-muted-foreground mt-1">{subtitle}</p> : null}
				</div>
				{primaryAction ? (
					<Button onClick={primaryAction.onClick} className={cn('shrink-0', accentButtonClass)}>
						{primaryAction.label}
					</Button>
				) : null}
			</div>

			{banner}

			{kpis.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{kpis}</div> : null}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="lg:col-span-2">{mainPanel}</div>
				<div className="space-y-6">
					{quickActions.length > 0 ? (
						<Card className="shadow-sm border-border/50">
							<CardHeader className="pb-3 border-b">
								<CardTitle className="text-lg">Quick actions</CardTitle>
							</CardHeader>
							<CardContent className="p-4 flex flex-col gap-2">
								{quickActions.map((action) => (
									<Button key={action.label} variant="outline" onClick={action.onClick}>
										{action.label}
									</Button>
								))}
							</CardContent>
						</Card>
					) : null}
					{sidePanel}
				</div>
			</div>
		</div>
	);
}
