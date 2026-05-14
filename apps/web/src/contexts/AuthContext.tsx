'use client';

import React, {
	createContext,
	useState,
	useEffect,
	useContext,
	useCallback,
	useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { withTimeout } from '@/lib/withTimeout';

const AuthContext = createContext<unknown>(null);

/** Matches GET /api/patient/insurance-change-request `is_employee` (employer roster + assigned option). */
async function fetchEmployeePatientFlag(userId: string): Promise<boolean> {
	const { data, error } = await supabase
		.from('employer_employees')
		.select('id')
		.eq('user_id', userId)
		.in('status', ['active', 'pending', 'draft'])
		.not('insurance_option_slug', 'is', null)
		.limit(1)
		.maybeSingle();
	if (error) {
		console.error('[AuthContext] employer_employees roster check failed:', error);
		return false;
	}
	return Boolean(data);
}

function mapProfileToCurrentUser(
	profile: Record<string, unknown> | null,
	authUser: { email?: string | null } | null,
) {
	if (!profile) return null;
	return {
		id: profile.id,
		email: (profile.email as string) || authUser?.email || null,
		role: profile.role,
		permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
		first_name: profile.first_name,
		last_name: profile.last_name,
		name: profile.name,
		company_name: profile.company_name,
		phone: profile.phone,
		date_of_birth: profile.date_of_birth,
		terms_accepted: profile.terms_accepted,
		privacy_preferences: profile.privacy_preferences,
		onboarding_completed: profile.onboarding_completed === true,
		provider_onboarding_completed: profile.provider_onboarding_completed === true,
		provider_org_id: profile.provider_org_id ?? null,
		specialty: profile.specialty ?? null,
		npi: profile.npi ?? null,
		primary_insurance_user_id: profile.primary_insurance_user_id ?? null,
		insurance_member_id: profile.insurance_member_id ?? null,
		patient_coverage_source: profile.patient_coverage_source ?? null,
	};
}

/** Profile row mapped for session; excludes `null` from `mapProfileToCurrentUser`. */
type MappedUser = NonNullable<ReturnType<typeof mapProfileToCurrentUser>>;

/** Session user; `employee_patient` is set when `role === 'individual'`. */
type CurrentUserState = MappedUser & { employee_patient?: boolean };

const profileInflight = new Map<string, Promise<CurrentUserState>>();

async function fetchProfileWithRetry(userId: string, authEmail: string | undefined) {
	let pending = profileInflight.get(userId);
	if (pending) return pending;

	pending = (async () => {
		const delays = [0, 100, 200, 350, 500, 800];
		for (const ms of delays) {
			if (ms) await new Promise((r) => setTimeout(r, ms));
			const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
			if (error) throw error;
			if (data) {
				const mapped = mapProfileToCurrentUser(data as Record<string, unknown>, { email: authEmail });
				if (!mapped) continue;
				if (mapped.role === 'individual') {
					const employee_patient = await fetchEmployeePatientFlag(userId);
					return { ...mapped, employee_patient };
				}
				return mapped;
			}
		}
		throw new Error(
			'Could not load your profile. Ensure Supabase migrations are applied (supabase/migrations) and try again.',
		);
	})();

	profileInflight.set(userId, pending);
	return pending.finally(() => {
		if (profileInflight.get(userId) === pending) profileInflight.delete(userId);
	});
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [currentUser, setCurrentUser] = useState<CurrentUserState | null>(null);
	const [userRole, setUserRoleState] = useState<string | null>(null);
	const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);
	const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
	const [isInitializing, setIsInitializing] = useState(true);
	const [isAuthPending, setIsAuthPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const applySession = useCallback(async (nextSession: import('@supabase/supabase-js').Session | null) => {
		setSession(nextSession);
		if (!nextSession?.user) {
			setCurrentUser(null);
			setUserRoleState(null);
			setPasswordChangeRequired(false);
			return null;
		}
		const meta = (nextSession.user.user_metadata || {}) as Record<string, unknown>;
		setPasswordChangeRequired(meta.must_change_password === true);
		const user = await withTimeout(
			fetchProfileWithRetry(nextSession.user.id, nextSession.user.email),
			18_000,
			'Profile load',
		);
		setCurrentUser(user);
		setUserRoleState((user?.role as string) ?? null);
		return user;
	}, []);

	useEffect(() => {
		let cancelled = false;

		const boot = async () => {
			const {
				data: { session: initial },
			} = await supabase.auth.getSession();
			if (cancelled) return;
			try {
				if (initial?.user) await applySession(initial);
			} catch (err) {
				console.error('[AuthContext] Failed to restore session:', err);
				await supabase.auth.signOut();
				setCurrentUser(null);
				setUserRoleState(null);
				setSession(null);
			} finally {
				if (!cancelled) setIsInitializing(false);
			}
		};

		void boot();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, nextSession) => {
			if (cancelled) return;
			window.setTimeout(() => {
				if (cancelled) return;
				void (async () => {
					try {
						if (nextSession?.user) await applySession(nextSession);
						else {
							setSession(null);
							setCurrentUser(null);
							setUserRoleState(null);
						}
					} catch (err) {
						console.error('[AuthContext] Auth state change error:', err);
						setCurrentUser(null);
						setUserRoleState(null);
						setSession(null);
					}
				})();
			}, 0);
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, [applySession]);

	const login = useCallback(
		async (email: string, password: string) => {
			setIsAuthPending(true);
			setError(null);
			try {
				const normalizedEmail = String(email || '').trim().toLowerCase();
				const first = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
				let data = first.data;
				let signErr = first.error;

				// Newly created admin-provisioned users can occasionally fail on first auth attempt while propagating.
				if (signErr?.message?.toLowerCase().includes('invalid login credentials')) {
					await new Promise((r) => setTimeout(r, 650));
					const second = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
					data = second.data;
					signErr = second.error;
				}

				if (signErr) throw signErr;
				const user = await applySession(data.session);
				return user;
			} catch (err: unknown) {
				console.error('[AuthContext] Login error:', err);
				const msg = err instanceof Error ? err.message : 'Invalid email or password.';
				setError(msg);
				throw err;
			} finally {
				setIsAuthPending(false);
			}
		},
		[applySession],
	);

	const signup = useCallback(
		async (email: string, password: string, userData: Record<string, unknown>, role: string) => {
			setIsAuthPending(true);
			setError(null);
			try {
				const meta = {
					role,
					first_name: userData.first_name,
					last_name: userData.last_name,
					name: userData.name,
					phone: userData.phone,
					date_of_birth: userData.date_of_birth,
					specialty: userData.specialty,
					npi: userData.npi,
					terms_accepted: userData.terms_accepted === true || userData.terms_accepted === 'true',
					privacy_preferences:
						userData.privacy_preferences === true || userData.privacy_preferences === 'true',
					primary_insurance_user_id: userData.primary_insurance_user_id,
					insurance_member_id: userData.insurance_member_id,
				};

				const { data, error: signUpErr } = await supabase.auth.signUp({
					email,
					password,
					options: { data: meta },
				});

				if (signUpErr) {
					const raw = (signUpErr.message || '').toLowerCase();
					if (raw.includes('already') || raw.includes('registered')) {
						const msg =
							'This email is already registered. Please use a different email or try logging in.';
						setError(msg);
						throw new Error(msg);
					}
					throw signUpErr;
				}

				if (data.session) {
					const user = await applySession(data.session);
					return { outcome: 'session' as const, user };
				}

				if (data.user) {
					return { outcome: 'verify_email' as const, email };
				}

				const msg = 'Could not complete signup. Check your email or try again.';
				setError(msg);
				throw new Error(msg);
			} catch (err: unknown) {
				console.error('[AuthContext] Signup error:', err);
				const errorMessage = err instanceof Error ? err.message : 'Failed to create account.';
				setError(errorMessage);
				throw err instanceof Error ? err : new Error(errorMessage);
			} finally {
				setIsAuthPending(false);
			}
		},
		[applySession],
	);

	const verifySignupEmail = useCallback(
		async (email: string, token: string) => {
			setIsAuthPending(true);
			setError(null);
			try {
				const trimmed = (token || '').trim();
				if (!trimmed) {
					const msg = 'Please enter the verification code from your email.';
					setError(msg);
					throw new Error(msg);
				}
				const { data, error: verifyErr } = await supabase.auth.verifyOtp({
					email,
					token: trimmed,
					type: 'signup',
				});
				if (verifyErr) throw verifyErr;
				if (!data.session) {
					const msg = 'Verification did not complete. Check the code and try again.';
					setError(msg);
					throw new Error(msg);
				}
				const user = await applySession(data.session);
				return user;
			} catch (err: unknown) {
				console.error('[AuthContext] verifySignupEmail error:', err);
				const errorMessage = err instanceof Error ? err.message : 'Verification failed.';
				setError(errorMessage);
				throw err instanceof Error ? err : new Error(errorMessage);
			} finally {
				setIsAuthPending(false);
			}
		},
		[applySession],
	);

	const logout = useCallback(async () => {
		await supabase.auth.signOut();
		setCurrentUser(null);
		setUserRoleState(null);
		setSession(null);
		router.push('/');
	}, [router]);

	/** Reload `profiles` into session (e.g. after onboarding complete). */
	const refreshProfile = useCallback(async () => {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (session?.user) {
			await applySession(session);
		}
	}, [applySession]);

	const setUserRole = useCallback(async (role: string) => {
		setIsAuthPending(true);
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user?.id) return;
			const { data, error: upErr } = await supabase
				.from('profiles')
				.update({ role })
				.eq('id', user.id)
				.select()
				.single();
			if (upErr) throw upErr;
			const mapped = mapProfileToCurrentUser(data as Record<string, unknown>, { email: user.email });
			if (!mapped) {
				setError('Profile not found after role update.');
				toast.error('Profile not found after role update.');
				return null;
			}
			let next: CurrentUserState = mapped;
			if (mapped.role === 'individual') {
				next = { ...mapped, employee_patient: await fetchEmployeePatientFlag(user.id) };
			}
			setCurrentUser(next);
			setUserRoleState(role);
			return next;
		} catch (err) {
			console.error('[AuthContext] Failed to update role:', err);
			setError('Failed to update user role.');
			toast.error('Failed to update user role.');
			throw err;
		} finally {
			setIsAuthPending(false);
		}
	}, []);

	const value = useMemo(
		() => ({
			currentUser,
			userRole,
			passwordChangeRequired,
			isInitializing,
			isAuthPending,
			error,
			login,
			logout,
			signup,
			verifySignupEmail,
			setUserRole,
			refreshProfile,
			isAuthenticated: Boolean(session?.user),
		}),
		[
			currentUser,
			userRole,
			passwordChangeRequired,
			isInitializing,
			isAuthPending,
			error,
			session,
			login,
			logout,
			signup,
			verifySignupEmail,
			setUserRole,
			refreshProfile,
		],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context as {
		currentUser: CurrentUserState | null;
		userRole: string | null;
		passwordChangeRequired: boolean;
		isInitializing: boolean;
		isAuthPending: boolean;
		error: string | null;
		login: (email: string, password: string) => Promise<unknown>;
		logout: () => Promise<void>;
		signup: (
			email: string,
			password: string,
			userData: Record<string, unknown>,
			role: string,
		) => Promise<unknown>;
		verifySignupEmail: (email: string, token: string) => Promise<unknown>;
		setUserRole: (role: string) => Promise<unknown>;
		refreshProfile: () => Promise<void>;
		isAuthenticated: boolean;
	};
};
