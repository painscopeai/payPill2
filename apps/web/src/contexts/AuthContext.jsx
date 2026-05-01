import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRoleState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      console.log('[AuthContext] Checking initial auth state...');
      if (pb.authStore.isValid && pb.authStore.model) {
        try {
          console.log('[AuthContext] Valid auth store found, fetching latest user data for ID:', pb.authStore.model.id);
          const user = await pb.collection('users').getOne(pb.authStore.model.id, { $autoCancel: false });
          setCurrentUser(user);
          
          if (!user.role) {
            console.log('[AuthContext] User has no role, defaulting to individual...');
            const updatedUser = await pb.collection('users').update(user.id, { role: 'individual' }, { $autoCancel: false });
            setCurrentUser(updatedUser);
            setUserRoleState('individual');
          } else {
            console.log('[AuthContext] User role loaded:', user.role);
            setUserRoleState(user.role);
          }
        } catch (err) {
          console.error("[AuthContext] Failed to refresh user data:", err);
          pb.authStore.clear();
          setCurrentUser(null);
          setUserRoleState(null);
        }
      } else {
        console.log('[AuthContext] No valid auth session found.');
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email, password) => {
    console.log('[AuthContext] Login attempt started for:', email);
    setIsLoading(true);
    setError(null);
    try {
      const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
      let user = authData.record;
      console.log('[AuthContext] Login successful, user ID:', user.id);
      
      if (!user.role) {
        console.log('[AuthContext] Assigning default role to legacy user during login...');
        user = await pb.collection('users').update(user.id, { role: 'individual' }, { $autoCancel: false });
      }
      
      setCurrentUser(user);
      setUserRoleState(user.role);
      console.log('[AuthContext] Login flow complete. Role:', user.role);
      return user;
    } catch (err) {
      console.error('[AuthContext] Login error:', err);
      setError(err.message || 'Invalid email or password.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email, password, userData, role) => {
    console.log('[AuthContext] Signup attempt started for:', email, 'with role:', role);
    setIsLoading(true);
    setError(null);
    try {
      const data = {
        email,
        password,
        passwordConfirm: password,
        role,
        ...userData
      };
      
      console.log('[AuthContext] Creating user record in PocketBase...');
      await pb.collection('users').create(data, { $autoCancel: false });
      console.log('[AuthContext] User record created successfully. Proceeding to login...');
      
      const user = await login(email, password);
      console.log('[AuthContext] Signup flow complete.');
      return user;
    } catch (err) {
      console.error('[AuthContext] Signup error:', err);
      let errorMessage = 'Failed to create account.';
      
      if (err.status === 400) {
        const emailError = err.response?.data?.email?.message;
        const rawMessage = err.message?.toLowerCase() || '';
        
        if (emailError || rawMessage.includes('duplicate') || rawMessage.includes('email')) {
          console.warn(`[AuthContext] Duplicate email registration attempt detected for: ${email}`);
          errorMessage = 'This email is already registered. Please use a different email or try logging in.';
        } else {
          errorMessage = 'Validation error. Please check your input and try again.';
        }
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('[AuthContext] Logging out user...');
    pb.authStore.clear();
    setCurrentUser(null);
    setUserRoleState(null);
    navigate('/');
    console.log('[AuthContext] Logout complete, redirected to /');
  };

  const setUserRole = async (role) => {
    if (!currentUser?.id) return;
    console.log('[AuthContext] Updating user role to:', role);
    setIsLoading(true);
    try {
      const updatedUser = await pb.collection('users').update(currentUser.id, { role }, { $autoCancel: false });
      setCurrentUser(updatedUser);
      setUserRoleState(role);
      console.log('[AuthContext] Role update successful.');
      return updatedUser;
    } catch (err) {
      console.error('[AuthContext] Failed to update role:', err);
      setError('Failed to update user role.');
      toast.error('Failed to update user role.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentUser,
    userRole,
    isLoading,
    error,
    login,
    logout,
    signup,
    setUserRole,
    isAuthenticated: pb.authStore.isValid
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};