import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
	Home,
	Calendar,
	Users,
	MessageSquare,
	CreditCard,
	Activity,
	Settings,
	LogOut,
	Menu,
	FileText,
	Shield,
	Package,
	Plug,
	Building2,
	UsersRound,
	MapPin,
	Radio,
	Pill,
	Share2,
	ClipboardList,
	Video,
	Stethoscope,
} from 'lucide-react';
import { PayPillLogo } from '@/components/PayPillLogo.jsx';
import apiServerClient from '@/lib/apiServerClient';
import NotificationBell from '@/components/NotificationBell.jsx';
import ThemeToggleButton from '@/components/ThemeToggleButton.jsx';
import { useProviderPracticeContext } from '@/hooks/useProviderPracticeContext';

const allNavItems = [
	{ label: 'Dashboard', icon: Home, path: '/provider/dashboard' },
	{ label: 'Appointments', icon: Calendar, path: '/provider/appointments' },
	{ label: 'Patients', icon: Users, path: '/provider/patients' },
	{ label: 'Consultations', icon: FileText, path: '/provider/consultations' },
	{ label: 'Messages', icon: MessageSquare, path: '/provider/messaging' },
	{ label: 'Billing', icon: CreditCard, path: '/provider/billing' },
	{ label: 'Claims', icon: Shield, path: '/provider/claims' },
	{ label: 'Analytics', icon: Activity, path: '/provider/analytics' },
	{ label: 'Prescriptions', icon: Pill, path: '/provider/prescriptions' },
	{ label: 'Referrals', icon: Share2, path: '/provider/referrals' },
	{ label: 'Forms', icon: ClipboardList, path: '/provider/forms' },
	{ label: 'Telemedicine', icon: Video, path: '/provider/telemedicine' },
	{ label: 'Insurance payers', icon: Building2, path: '/provider/insurance-payers' },
	{ label: 'Integrations', icon: Plug, path: '/provider/integrations' },
	{ label: 'Inventory', icon: Package, path: '/provider/inventory' },
	{ label: 'Compliance', icon: Shield, path: '/provider/compliance' },
	{ label: 'Team', icon: UsersRound, path: '/provider/team' },
	{ label: 'Locations', icon: MapPin, path: '/provider/locations' },
	{ label: 'Communications', icon: Radio, path: '/provider/communications' },
	{ label: 'Settings', icon: Settings, path: '/provider/settings' },
];

export default function ProviderLayout({ children }) {
	const { currentUser, logout } = useAuth();
	const location = useLocation();
	const { isPharmacy, loading: practiceLoading } = useProviderPracticeContext();
	const [unreadMessageCount, setUnreadMessageCount] = useState(0);
	const [breadcrumbTick, setBreadcrumbTick] = useState(0);

	const navItems = useMemo(() => {
		return allNavItems.filter((item) => {
			if (item.path === '/provider/inventory') return isPharmacy;
			return true;
		});
	}, [isPharmacy]);

	const handleLogout = () => {
		void logout();
	};

	const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

	useEffect(() => {
		let mounted = true;
		const loadUnread = async () => {
			try {
				const res = await apiServerClient.fetch('/provider/messages');
				const body = await res.json().catch(() => ({}));
				if (!res.ok || !mounted) return;
				const threads = Array.isArray(body.threads) ? body.threads : [];
				const fromThreads = threads.reduce((sum, t) => sum + Number(t.unread_for_provider || 0), 0);
				if (fromThreads > 0) {
					setUnreadMessageCount(fromThreads);
					return;
				}
				const items = Array.isArray(body.items) ? body.items : [];
				const uid = currentUser?.id;
				const count = items.filter((m) => !m.read_at && m.sender_user_id !== uid).length;
				setUnreadMessageCount(count);
			} catch {
				/* keep layout usable */
			}
		};
		void loadUnread();
		const t = window.setInterval(() => void loadUnread(), 30000);
		return () => {
			mounted = false;
			window.clearInterval(t);
		};
	}, [location.pathname, currentUser?.id]);

	useEffect(() => {
		const bump = () => setBreadcrumbTick((n) => n + 1);
		window.addEventListener('paypill-provider-chart-bc', bump);
		return () => window.removeEventListener('paypill-provider-chart-bc', bump);
	}, []);

	const unreadBadgeText = useMemo(() => {
		if (unreadMessageCount <= 0) return '';
		if (unreadMessageCount > 99) return '99+';
		return String(unreadMessageCount);
	}, [unreadMessageCount]);

	const UUID_RE =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

	const breadcrumbLabel = useMemo(() => {
		const path = location.pathname;
		const segments = path.split('/').filter(Boolean);
		if (segments[0] !== 'provider') {
			return segments.map((s) => s.replace(/-/g, ' ')).join(' / ');
		}
		if (segments[1] === 'patients' && segments[2] && UUID_RE.test(segments[2])) {
			try {
				const name = sessionStorage.getItem(`paypill_provider_chart_bc_${segments[2]}`);
				if (name) return `Provider / Patients / ${name}`;
			} catch {
				/* ignore */
			}
			return 'Provider / Patients / Patient chart';
		}
		return segments
			.map((seg) =>
				seg
					.split('-')
					.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
					.join(' '),
			)
			.join(' / ');
	}, [location.pathname, breadcrumbTick]);

	/** Self-serve practice / services / schedule wizard until profile flag is set. */
	const mustFinishProviderOnboarding =
		currentUser?.role === 'provider' &&
		currentUser?.provider_onboarding_completed !== true &&
		!location.pathname.startsWith('/provider/onboarding');

	if (mustFinishProviderOnboarding) {
		return <Navigate to="/provider/onboarding" replace />;
	}

	return (
		<div className="min-h-screen bg-background flex flex-col md:flex-row">
			<header className="md:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur flex items-center justify-between px-4 h-16">
				<Link to="/provider/dashboard" className="flex items-center gap-2">
					<PayPillLogo className="h-7 max-h-8 w-auto" />
				</Link>
				<div className="flex items-center gap-2">
					<ThemeToggleButton />
					<NotificationBell />
					<Sheet>
						<SheetTrigger asChild>
							<Button variant="ghost" size="icon">
								<Menu className="h-5 w-5" />
							</Button>
						</SheetTrigger>
						<SheetContent side="right" className="w-[280px] flex flex-col overflow-y-auto">
							<div className="py-4 flex items-center gap-2">
								<div className="h-9 w-9 rounded-lg bg-teal-500/15 flex items-center justify-center">
									<Stethoscope className="h-5 w-5 text-teal-600" />
								</div>
								<div>
									<p className="font-medium truncate">
										{currentUser?.first_name} {currentUser?.last_name}
									</p>
									<p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
								</div>
							</div>
							<nav className="flex flex-col gap-0.5 flex-1 pb-6">
								{navItems.map((item) => (
									<Link
										key={item.path}
										to={item.path}
										className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
											isActive(item.path) ? 'bg-teal-500/10 text-teal-800 dark:text-teal-200' : 'hover:bg-muted'
										}`}
									>
										<item.icon className="h-4 w-4 shrink-0" />
										<span className="flex-1 truncate">{item.label}</span>
										{item.path === '/provider/messaging' && unreadMessageCount > 0 ? (
											<span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
												{unreadBadgeText}
											</span>
										) : null}
									</Link>
								))}
							</nav>
							<Button variant="ghost" className="justify-start text-destructive mt-auto" onClick={handleLogout}>
								<LogOut className="h-4 w-4 mr-2" /> Logout
							</Button>
						</SheetContent>
					</Sheet>
				</div>
			</header>

			<aside className="hidden md:flex flex-col w-64 border-r bg-card min-h-screen sticky top-0 overflow-y-auto">
				<div className="h-16 flex items-center px-6 border-b shrink-0">
					<Link to="/provider/dashboard" className="flex items-center gap-2">
						<PayPillLogo className="h-8 max-h-9 w-auto" />
					</Link>
				</div>
				<div className="p-4 border-b shrink-0">
					<div className="flex items-center gap-2 mb-1">
						<div className="h-9 w-9 rounded-lg bg-teal-500/15 flex items-center justify-center">
							<Stethoscope className="h-5 w-5 text-teal-600" />
						</div>
						<div className="min-w-0">
							<p className="font-medium truncate text-sm">
								{currentUser?.first_name} {currentUser?.last_name}
							</p>
							<p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
						</div>
					</div>
					{currentUser?.role === 'provider' && currentUser?.provider_onboarding_completed !== true ? (
						<p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
							<Link to="/provider/onboarding" className="underline font-medium">
								Continue practice setup
							</Link>{' '}
							to finish onboarding.
						</p>
					) : null}
				</div>
				<nav className="flex-1 p-3 space-y-0.5 pb-8">
					{navItems.map((item) => (
						<Link
							key={item.path}
							to={item.path}
							className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
								isActive(item.path)
									? 'bg-teal-500/10 text-teal-800 dark:text-teal-200'
									: 'text-muted-foreground hover:bg-muted hover:text-foreground'
							}`}
						>
							<item.icon className="h-4 w-4 shrink-0" />
							<span className="flex-1 truncate">{item.label}</span>
							{item.path === '/provider/messaging' && unreadMessageCount > 0 ? (
								<span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
									{unreadBadgeText}
								</span>
							) : null}
						</Link>
					))}
				</nav>
				<div className="p-4 border-t mt-auto shrink-0">
					<Button
						variant="ghost"
						className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={handleLogout}
					>
						<LogOut className="h-4 w-4 mr-2" /> Logout
					</Button>
				</div>
			</aside>

			<main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
				<header className="hidden md:flex h-16 items-center justify-between px-8 border-b bg-background/95 backdrop-blur sticky top-0 z-40">
					<div className="text-sm text-muted-foreground truncate max-w-[70%]" title={breadcrumbLabel}>
						{breadcrumbLabel}
					</div>
					<div className="flex items-center gap-4">
						<ThemeToggleButton />
						<NotificationBell />
					</div>
				</header>
				<div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
			</main>

			<nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t bg-background flex items-center justify-around px-1 z-50 pb-safe">
				{(practiceLoading ? allNavItems.slice(0, 4) : navItems.slice(0, 4)).map((item) => (
					<Link
						key={item.path}
						to={item.path}
						className={`flex flex-col items-center justify-center w-16 h-full gap-1 ${
							isActive(item.path) ? 'text-teal-600' : 'text-muted-foreground'
						}`}
					>
						<span className="relative">
							<item.icon className="h-5 w-5" />
							{item.path === '/provider/messaging' && unreadMessageCount > 0 ? (
								<span className="absolute -right-2 -top-1 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-semibold text-white">
									{unreadMessageCount > 9 ? '9+' : unreadBadgeText}
								</span>
							) : null}
						</span>
						<span className="text-[10px] font-medium truncate max-w-[4.5rem] text-center">{item.label}</span>
					</Link>
				))}
			</nav>
		</div>
	);
}
