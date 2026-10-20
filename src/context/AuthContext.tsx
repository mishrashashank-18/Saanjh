import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, User, LoginData, SignupData, UpdateProfileData, ApiError } from '../services/api';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  toast: Toast | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  login: (data: LoginData) => Promise<User>;
  signup: (data: SignupData) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<User>;
  isAuthModalOpen: boolean;
  authModalView: 'login' | 'signup' | 'profile';
  openLogin: () => void;
  openSignup: () => void;
  openProfile: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'login' | 'signup' | 'profile'>('login');
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4500);
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  // Check authentication session on initial page load (persistence across refreshes)
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const response = await api.auth.getMe();
        if (isMounted && response.success && response.user) {
          setUser(response.user);
        }
      } catch {
        // User is not authenticated yet or backend not reachable; set user to null
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const openLogin = useCallback(() => {
    setAuthModalView('login');
    setIsAuthModalOpen(true);
  }, []);

  const openSignup = useCallback(() => {
    setAuthModalView('signup');
    setIsAuthModalOpen(true);
  }, []);

  const openProfile = useCallback(() => {
    setAuthModalView('profile');
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const login = async (data: LoginData): Promise<User> => {
    const response = await api.auth.login(data);
    setUser(response.user);
    closeAuthModal();
    showToast(`Welcome back, ${response.user.displayName || response.user.fullName}!`, 'success');
    return response.user;
  };

  const signup = async (data: SignupData): Promise<User> => {
    const response = await api.auth.signup(data);
    setUser(response.user);
    closeAuthModal();
    showToast(`Welcome to Saanjh, ${response.user.fullName}! Your account is ready.`, 'success');
    return response.user;
  };

  const loginWithGoogle = async (credential: string): Promise<User> => {
    const response = await api.auth.google(credential);
    setUser(response.user);
    closeAuthModal();
    showToast(`Welcome, ${response.user.displayName || response.user.fullName}! Signed in with Google.`, 'success');
    return response.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.warn('Logout network error (clearing local state anyway):', err);
    } finally {
      setUser(null);
      closeAuthModal();
      showToast('You have been logged out safely.', 'info');
    }
  };

  const updateProfile = async (data: UpdateProfileData): Promise<User> => {
    const response = await api.users.updateMe(data);
    setUser(response.user);
    showToast('Your profile has been updated.', 'success');
    return response.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        toast,
        showToast,
        clearToast,
        login,
        signup,
        loginWithGoogle,
        logout,
        updateProfile,
        isAuthModalOpen,
        authModalView,
        openLogin,
        openSignup,
        openProfile,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
