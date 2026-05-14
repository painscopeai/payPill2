import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import apiServerClient from '@/lib/apiServerClient';

function mapPatientRow(rel) {
	const d = rel.patient_details || {};
	const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || d.name || 'Patient';
	return {
		...rel,
		id: rel.id,
		patient_id: rel.patient_id,
		patient_name: name,
		linked_via: Array.isArray(rel.linked_via) ? rel.linked_via : [],
		patient_activity_status: rel.patient_activity_status || '',
		patient_activity_kind: rel.patient_activity_kind || '',
	};
}

export function usePatients() {
	const { currentUser, userRole } = useAuth();
	const [patients, setPatients] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchPatients = useCallback(async () => {
		if (!currentUser) {
			setPatients([]);
			setLoading(false);
			return;
		}
		if (userRole !== 'provider') {
			setPatients([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const res = await apiServerClient.fetch('/provider/patients');
			const data = await res.json().catch(() => []);
			if (!res.ok) {
				console.error('[usePatients]', data?.error || res.status);
				setPatients([]);
				return;
			}
			const list = Array.isArray(data) ? data : [];
			setPatients(list.map(mapPatientRow));
		} catch (err) {
			console.error('Error fetching patients:', err);
			setPatients([]);
		} finally {
			setLoading(false);
		}
	}, [currentUser, userRole]);

	useEffect(() => {
		void fetchPatients();
	}, [fetchPatients]);

	return { patients, loading, fetchPatients };
}
