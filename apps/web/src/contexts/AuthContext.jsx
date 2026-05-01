import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient.js';
import { toast } from 'sonner';

const AuthContext = createContext(null);

function mapProfileToCurrentUser(profile, authUser) {
	if (!profile) return null;
	return {
		id: profile.id,
		email: profile.email || authUser?.email || null,
		role: profile.role,
		permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
		first_name: profile.first_name,
		last_name: profile.last_name,
		name: profile.name,
		phone: profile.phone,
		date_of_birth: profile.date_of_birth,
		terms_accepted: profile.terms_accepted,
		privacy_preferences: profile.privacy_preferences,
	};
}

async function fetchProfileWithRetry(userId, authEmail) {
	const delays = [0, 100, 200, 350, 500];
	for (const ms of delays) {
		if (ms) await new Promise((r) => setTimeout(r, ms));
		const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
		if (error) throw error;
		if (data) return mapProfileToCurrentUser(data, { email: authEmail });
	}
	throw new Error(
		'Could not load your profile. Ensure Supabase migrations are applied (supabase/migrations) and try again.',
	);
}

export const AuthProvider = ({ children }) => {
	const [currentUser, setCurrentUser] = useState(null);
	const [userRole, setUserRoleState] = useState(null);
	const [session, setSession] = useState(null);
	/** True until first getSession + profile hydrate completes (route guards). */
	const [isInitializing, setIsInitializing] = useState(true);
	/** True only during login / signup / verify / setUserRole — not during bootstrap. */
	const [isAuthPending, setIsAuthPending] = useState(false);
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	const applySession = useCallback(async (nextSession) => {
		setSession(nextSession);
		if (!nextSession?.user) {
			setCurrentUser(null);
			setUserRoleState(null);
			return null;
		}
		const user = await fetchProfileWithRetry(nextSession.user.id, nextSession.user.email);
		setCurrentUser(user);
		setUserRoleState(user?.role ?? null);
		return user;
	}, []);

	useEffect(() => {
		let cancelled = false;

		const boot = async () => {
			const { data: { session: initial } } = await supabase.auth.getSession();
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

		boot();

		const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
			if (cancelled) return;
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
		});

		return () => {
			cancelled = true;
			subscription.unsubscribe();
		};
	}, [applySession]);

	const login = useCallback(async (email, password) => {
		setIsAuthPending(true);
		setError(null);
		try {
			const { data, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
			if (signErr) throw signErr;
			let user = await applySession(data.session);
			if (user && !user.role) {
				const { data: updated, error: upErr } = await supabase
					.from('profiles')
					.update({ role: 'individual' })
					.eq('id', user.id)
					.select()
					.single();
				if (!upErr && updated) {
					user = mapProfileToCurrentUser(updated, data.user);
					setCurrentUser(user);
					setUserRoleState(user.role);
				}
			}
			return user;
		} catch (err) {
			console.error('[AuthContext] Login error:', err);
			const msg = err.message || 'Invalid email or password.';
			setError(msg);
			throw err;
		} finally {
			setIsAuthPending(false);
		}
	}, [applySession]);

	const signup = useCallback(async (email, password, userData, role) => {
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
				terms_accepted: userData.terms_accepted === true || userData.terms_accepted === 'true',
				privacy_preferences: userData.privacy_preferences === true || userData.privacy_preferences === 'true',
			};

			const { data, error: signUpErr } = await supabase.auth.signUp({
				email,
				password,
				options: { data: meta },
			});

			if (signUpErr) {
				const raw = (signUpErr.message || '').toLowerCase();
				if (raw.includes('already') || raw.includes('registered')) {
					const msg = 'This email is already registered. Please use a different email or try logging in.';
					setError(msg);
					throw new Error(msg);
				}
				throw signUpErr;
			}

			if (data.session) {
				const user = await applySession(data.session);
				return { outcome: 'session', user };
			}

			// Email confirmation / token flow: no session until verifyOtp
			if (data.user) {
				return { outcome: 'verify_email', email };
			}

			const msg = 'Could not complete signup. Check your email or try again.';
			setError(msg);
			throw new Error(msg);
		} catch (err) {
			console.error('[AuthContext] Signup error:', err);
			const errorMessage = err.message || 'Failed to create account.';
			setError(errorMessage);
			throw err instanceof Error ? err : new Error(errorMessage);
		} finally {
			setIsAuthPending(false);
		}
	}, [applySession]);

	const verifySignupEmail = useCallback(async (email, token) => {
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
		} catch (err) {
			console.error('[AuthContext] verifySignupEmail error:', err);
			const errorMessage = err.message || 'Verification failed.';
			setError(errorMessage);
			throw err instanceof Error ? err : new Error(errorMessage);
		} finally {
			setIsAuthPending(false);
		}
	}, [applySession]);

	const logout = useCallback(async () => {
		await supabase.auth.signOut();
		setCurrentUser(null);
		setUserRoleState(null);
		setSession(null);
		navigate('/');
	}, [navigate]);

	const setUserRole = useCallback(async (role) => {
		setIsAuthPending(true);
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user?.id) return;
			const { data, error: upErr } = await supabase
				.from('profiles')
				.update({ role })
				.eq('id', user.id)
				.select()
				.single();
			if (upErr) throw upErr;
			const mapped = mapProfileToCurrentUser(data, { email: user.email });
			setCurrentUser(mapped);
			setUserRoleState(role);
			return mapped;
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
			isInitializing,
			isAuthPending,
			error,
			login,
			logout,
			signup,
			verifySignupEmail,
			setUserRole,
			isAuthenticated: Boolean(session?.user),
		}),
		[currentUser, userRole, isInitializing, isAuthPending, error, session, login, logout, signup, verifySignupEmail, setUserRole],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};
