import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useProviderPracticeContext } from '@/hooks/useProviderPracticeContext';
import ProviderPharmacyInventory from '@/components/provider/ProviderPharmacyInventory.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ProviderInventoryPage() {
	const { loading, isPharmacy, providerTypeLabel } = useProviderPracticeContext();

	if (loading) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (!isPharmacy) {
		return (
			<div className="max-w-lg space-y-4">
				<Helmet>
					<title>Inventory — Provider</title>
				</Helmet>
				<Card>
					<CardHeader>
						<CardTitle>Pharmacy inventory unavailable</CardTitle>
						<CardDescription>
							Inventory is enabled for practices with the <strong>Pharmacy</strong> specialty
							{providerTypeLabel ? ` (your specialty: ${providerTypeLabel})` : ''}. Contact your administrator if
							this should be a pharmacy practice.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="outline" asChild>
							<Link to="/provider/dashboard">Back to dashboard</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return <ProviderPharmacyInventory />;
}
