import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, User, LoginData, SignupData, AuthResponse, ApiError } from '../services/api';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  pendingEmail: string;
  setPendingEmail: (email: string) => void;
  toast: Toast | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  signup: (data: SignupData) => Promise<AuthResponse>;
  verifyOtp: (code: string) => Promise<User>;
  resendOtp: (emailOverride?: string) => Promise<void>;
  login: (data: LoginData) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<User>;
  completeGoogle: (dateOfBirth: string, genderIdentity: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingEmail, setPendingEmailState] = useState<string>(() => {
    return localStorage.getItem('saanjh_pending_email') || '';
  });
  const [toast, setToast] = useState<Toast | null>(null);

  const setPendingEmail = useCallback((email: string) => {
    setPendingEmailState(email);
    if (email) {
      localStorage.setItem('saanjh_pending_email', email);
    } else {
      localStorage.removeItem('saanjh_pending_email');
    }
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 5000);
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await api.auth.getMe();
      if (response.success && response.user) {
        setUser(response.user);
        return response.user;
      }
      return null;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  // Check authentication session on initial page load
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const response = await api.auth.getMe();
        if (isMounted && response.success && response.user) {
          setUser(response.user);
        }
      } catch {
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

  const signup = async (data: SignupData): Promise<AuthResponse> => {
    const response = await api.auth.signup(data);
    setPendingEmail(data.email);
    showToast('A 6-digit verification code has been sent to your email.', 'info');
    return response;
  };

  const verifyOtp = async (code: string): Promise<User> => {
    const emailToVerify = pendingEmail || user?.email;
    if (!emailToVerify) {
      throw new ApiError('No email found to verify. Please return to the signup page.', 400);
    }

    const response = await api.auth.verifyOtp({ email: emailToVerify, code });
    if (!response.user) {
      throw new ApiError('Verification response was missing user data.', 500);
    }

    setUser(response.user);
    setPendingEmail(''); // Clear pending email
    showToast(`Welcome to Saanjh, ${response.user.displayName || response.user.fullName}!`, 'success');
    return response.user;
  };

  const resendOtp = async (emailOverride?: string): Promise<void> => {
    const email = emailOverride || pendingEmail || user?.email;
    if (!email) {
      throw new ApiError('Email address is missing. Please sign up or log in first.', 400);
    }

    await api.auth.resendOtp({ email });
    showToast('A new 6-digit verification code has been sent.', 'success');
  };

  const login = async (data: LoginData): Promise<User> => {
    try {
      const response = await api.auth.login(data);
      if (!response.user) {
        throw new ApiError('Login response was missing user data.', 500);
      }
      setUser(response.user);
      showToast(`Welcome back, ${response.user.displayName || response.user.fullName}!`, 'success');
      return response.user;
    } catch (err: any) {
      if (err.data?.code === 'UNVERIFIED_EMAIL') {
        if (data.email) {
          setPendingEmail(data.email);
        }
      }
      throw err;
    }
  };

  const loginWithGoogle = async (credential: string): Promise<User> => {
    const response = await api.auth.google(credential);
    if (!response.user) {
      throw new ApiError('Google login response was missing user data.', 500);
    }
    setUser(response.user);
    showToast(`Welcome, ${response.user.displayName || response.user.fullName}! Signed in with Google.`, 'success');
    return response.user;
  };

  const completeGoogle = async (dateOfBirth: string, genderIdentity: string): Promise<User> => {
    const response = await api.auth.googleComplete({ dateOfBirth, genderIdentity });
    if (!response.user) {
      throw new ApiError('Could not complete Google registration.', 500);
    }
    setUser(response.user);
    showToast('Your account details are complete.', 'success');
    return response.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.warn('Logout network error (clearing local state anyway):', err);
    } finally {
      setUser(null);
      setPendingEmail('');
      showToast('You have been logged out safely.', 'info');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        pendingEmail,
        setPendingEmail,
        toast,
        showToast,
        clearToast,
        signup,
        verifyOtp,
        resendOtp,
        login,
        loginWithGoogle,
        completeGoogle,
        logout,
        refreshUser,
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
