import React from 'react';
import { useProviderPracticeContext } from '@/hooks/useProviderPracticeContext';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';
import ClinicalProviderDashboard from '@/views/provider/dashboard/ClinicalProviderDashboard.jsx';
import PharmacyProviderDashboard from '@/views/provider/dashboard/PharmacyProviderDashboard.jsx';
import LaboratoryProviderDashboard from '@/views/provider/dashboard/LaboratoryProviderDashboard.jsx';

export default function ProviderDashboard() {
	const { portalProfile, loading } = useProviderPracticeContext();

	if (loading) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<LoadingSpinner size="lg" />
			</div>
		);
	}

	if (portalProfile === 'pharmacist') return <PharmacyProviderDashboard />;
	if (portalProfile === 'laboratory') return <LaboratoryProviderDashboard />;
	return <ClinicalProviderDashboard />;
}
