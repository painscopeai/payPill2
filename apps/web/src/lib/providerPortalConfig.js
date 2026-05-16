import {
	Activity,
	Calendar,
	ClipboardList,
	CreditCard,
	FileText,
	FlaskConical,
	Home,
	MessageSquare,
	Package,
	Pill,
	Settings,
	Shield,
	Stethoscope,
	Users,
} from 'lucide-react';

/** Shared provider portal navigation (all operational profiles). */
export const PROVIDER_BASE_NAV = [
	{ label: 'Dashboard', icon: Home, path: '/provider/dashboard' },
	{ label: 'Appointments', icon: Calendar, path: '/provider/appointments' },
	{ label: 'Patients', icon: Users, path: '/provider/patients' },
	{ label: 'Messages', icon: MessageSquare, path: '/provider/messaging' },
	{ label: 'Billing', icon: CreditCard, path: '/provider/billing' },
	{ label: 'Claims', icon: Shield, path: '/provider/claims' },
	{ label: 'Analytics', icon: Activity, path: '/provider/analytics' },
];

const CLINICAL_CONSULTATIONS_NAV = {
	label: 'Consultations',
	icon: FileText,
	path: '/provider/consultations',
};

const PHARMACY_DISPENSING_NAV = {
	label: 'Dispensing',
	icon: Pill,
	path: '/provider/dispensing',
};

const LAB_ORDERS_NAV = {
	label: 'Lab orders',
	icon: FlaskConical,
	path: '/provider/lab-orders',
};

const ROLE_EXTENSION_NAV = {
	doctor: [{ label: 'Forms', icon: ClipboardList, path: '/provider/forms' }],
	pharmacist: [{ label: 'Inventory', icon: Package, path: '/provider/inventory' }],
	laboratory: [{ label: 'Lab catalog', icon: ClipboardList, path: '/provider/settings/catalog/labs' }],
};

const SETTINGS_NAV = { label: 'Settings', icon: Settings, path: '/provider/settings' };

export const PROVIDER_PORTAL_PROFILES = ['doctor', 'pharmacist', 'laboratory'];

export function normalizeProviderPortalProfile(operationsProfile, practiceRoleSlug, isPharmacy) {
	const op = String(operationsProfile || practiceRoleSlug || '')
		.trim()
		.toLowerCase();
	if (op === 'pharmacist' || isPharmacy) return 'pharmacist';
	if (op === 'laboratory' || op === 'lab') return 'laboratory';
	return 'doctor';
}

export function getProviderNavItems(portalProfile) {
	const profile = PROVIDER_PORTAL_PROFILES.includes(portalProfile) ? portalProfile : 'doctor';

	if (profile === 'doctor') {
		const [dashboard, appointments, ...restBase] = PROVIDER_BASE_NAV;
		return [
			dashboard,
			appointments,
			CLINICAL_CONSULTATIONS_NAV,
			...restBase,
			...ROLE_EXTENSION_NAV.doctor,
			SETTINGS_NAV,
		];
	}

	if (profile === 'pharmacist') {
		const [dashboard, appointments, ...restBase] = PROVIDER_BASE_NAV;
		return [
			dashboard,
			appointments,
			PHARMACY_DISPENSING_NAV,
			...restBase,
			...ROLE_EXTENSION_NAV.pharmacist,
			SETTINGS_NAV,
		];
	}

	if (profile === 'laboratory') {
		const [dashboard, appointments, ...restBase] = PROVIDER_BASE_NAV;
		return [
			dashboard,
			appointments,
			LAB_ORDERS_NAV,
			...restBase,
			...ROLE_EXTENSION_NAV.laboratory,
			SETTINGS_NAV,
		];
	}

	const extensions = ROLE_EXTENSION_NAV[profile] || ROLE_EXTENSION_NAV.doctor;
	return [...PROVIDER_BASE_NAV, ...extensions, SETTINGS_NAV];
}

export const PROVIDER_PORTAL_BRANDING = {
	doctor: {
		title: 'Clinical practice',
		portalName: 'Provider Portal',
		icon: Stethoscope,
		accentClass: 'text-teal-600',
		chipClass: 'bg-teal-500/10',
		buttonClass: 'bg-teal-600 hover:bg-teal-700 text-white',
		activeNavClass: 'bg-teal-500/10 text-teal-800 dark:text-teal-200',
	},
	pharmacist: {
		title: 'Pharmacy operations',
		portalName: 'Pharmacy Portal',
		icon: Pill,
		accentClass: 'text-violet-600',
		chipClass: 'bg-violet-500/10',
		buttonClass: 'bg-violet-600 hover:bg-violet-700 text-white',
		activeNavClass: 'bg-violet-500/10 text-violet-800 dark:text-violet-200',
	},
	laboratory: {
		title: 'Laboratory services',
		portalName: 'Laboratory Portal',
		icon: FlaskConical,
		accentClass: 'text-sky-600',
		chipClass: 'bg-sky-500/10',
		buttonClass: 'bg-sky-600 hover:bg-sky-700 text-white',
		activeNavClass: 'bg-sky-500/10 text-sky-800 dark:text-sky-200',
	},
};

export function getProviderBranding(portalProfile) {
	return PROVIDER_PORTAL_BRANDING[portalProfile] || PROVIDER_PORTAL_BRANDING.doctor;
}

/** Routes restricted to a single operational profile (others redirect to dashboard). */
export const PROVIDER_ROUTE_PROFILES = {
	'/provider/consultations': ['doctor'],
	'/provider/forms': ['doctor'],
	'/provider/forms/builder': ['doctor'],
	'/provider/inventory': ['pharmacist'],
	'/provider/dispensing': ['pharmacist'],
	'/provider/lab-orders': ['laboratory'],
	'/provider/settings/catalog/labs': ['laboratory', 'doctor'],
	'/provider/settings/catalog/drugs': ['doctor', 'pharmacist'],
};

export function allowedProfilesForPath(pathname) {
	for (const [prefix, profiles] of Object.entries(PROVIDER_ROUTE_PROFILES)) {
		if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return profiles;
	}
	return null;
}
