import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

declare global {
  interface Window {
    google?: any;
  }
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function AuthModal() {
  const {
    user,
    isAuthModalOpen,
    authModalView,
    closeAuthModal,
    openLogin,
    openSignup,
    login,
    signup,
    loginWithGoogle,
    logout,
    updateProfile,
  } = useAuth();

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [genderIdentity, setGenderIdentity] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Profile Edit states
  const [profileFullName, setProfileFullName] = useState('');
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileOccupation, setProfileOccupation] = useState('');
  const [profileEducation, setProfileEducation] = useState('');
  const [profileGender, setProfileGender] = useState('');

  // Status feedback
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset or initialize state whenever modal opens or view changes
  useEffect(() => {
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);
    setIsSubmitting(false);

    if (user && authModalView === 'profile') {
      setProfileFullName(user.fullName || '');
      setProfileDisplayName(user.displayName || '');
      setProfileBio(user.bio || '');
      setProfileCity(user.city || '');
      setProfileOccupation(user.occupation || '');
      setProfileEducation(user.education || '');
      setProfileGender(user.genderIdentity || '');
    }
  }, [isAuthModalOpen, authModalView, user]);

  // Handle ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  // Google Identity Services setup
  useEffect(() => {
    if (!isAuthModalOpen || authModalView === 'profile') return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          if (response?.credential) {
            setIsSubmitting(true);
            setError(null);
            try {
              await loginWithGoogle(response.credential);
            } catch (err: any) {
              setError(err.message || 'Google sign-in failed');
            } finally {
              setIsSubmitting(false);
            }
          }
        },
      });

      if (googleBtnContainerRef.current) {
        googleBtnContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 340,
          text: authModalView === 'signup' ? 'signup_with' : 'signin_with',
          shape: 'pill',
        });
      }
    } catch (e) {
      console.warn('Google Identity button initialization note:', e);
    }
  }, [isAuthModalOpen, authModalView, loginWithGoogle]);

  if (!isAuthModalOpen) return null;

  // Custom Google Click Handler (fallback if native button not rendered)
  async function handleGoogleButtonClick() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError(
        'Google Login is in preview mode. To connect real Google Sign-In, set VITE_GOOGLE_CLIENT_ID in your .env and GOOGLE_CLIENT_ID in backend/.env.'
      );
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setError('Google Sign-in prompt was closed. Please try clicking the button again.');
        }
      });
    } else {
      setError('Google Sign-in service is currently loading. Please check your internet connection.');
    }
  }

  // Handle Login submission
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!email) {
      setFieldErrors({ email: 'Please enter your email address' });
      return;
    }
    if (!password) {
      setFieldErrors({ password: 'Please enter your password' });
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Signup submission
  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const newFieldErrors: Record<string, string> = {};

    if (!fullName.trim()) newFieldErrors.fullName = 'Full name is required';
    if (!email.trim()) newFieldErrors.email = 'Email address is required';
    if (!password) {
      newFieldErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newFieldErrors.password = 'Password must be at least 8 characters long';
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      newFieldErrors.password = 'Password must contain at least 1 letter and 1 number';
    }

    if (password !== confirmPassword) {
      newFieldErrors.confirmPassword = 'Passwords do not match';
    }

    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      if (dob > cutoff) {
        newFieldErrors.dateOfBirth = 'You must be at least 18 years old to join Saanjh';
      }
    }

    if (!termsAccepted) {
      newFieldErrors.termsAccepted = 'You must accept the terms and privacy policy to continue';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({
        fullName,
        email,
        password,
        confirmPassword,
        mobileNumber: mobileNumber || undefined,
        dateOfBirth: dateOfBirth || undefined,
        genderIdentity: genderIdentity || undefined,
        termsAccepted,
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.data?.errors) {
        const backendFieldErrors: Record<string, string> = {};
        err.data.errors.forEach((e: any) => {
          backendFieldErrors[e.field] = e.message;
        });
        setFieldErrors(backendFieldErrors);
      }
      setError(err.message || 'Signup failed. Please check the form.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Profile Update submission
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await updateProfile({
        fullName: profileFullName,
        displayName: profileDisplayName,
        bio: profileBio,
        city: profileCity,
        occupation: profileOccupation,
        education: profileEducation,
        genderIdentity: profileGender,
      });
      setSuccessMessage('Profile saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="auth-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="auth-modal-card">
        {/* Close Button */}
        <button
          className="auth-close-btn"
          onClick={closeAuthModal}
          aria-label="Close dialog"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="auth-modal-header">
          <span className="auth-brand-badge">Saanjh</span>
          <h2>
            {authModalView === 'login' && 'Sign in to Saanjh'}
            {authModalView === 'signup' && 'Create Your Account'}
            {authModalView === 'profile' && 'Your Saanjh Profile'}
          </h2>
          <p>
            {authModalView === 'login' &&
              'Welcome back to calmer, more meaningful connections.'}
            {authModalView === 'signup' &&
              'Answer thoughtful questions and meet people who truly align with you.'}
            {authModalView === 'profile' &&
              'Manage your personal details and matchmaking preferences.'}
          </p>
        </div>

        {/* Tabs for Login / Signup (if not in profile view) */}
        {authModalView !== 'profile' && (
          <div className="auth-tabs">
            <button
              type="button"
              className={authModalView === 'login' ? 'active' : ''}
              onClick={openLogin}
            >
              Sign In
            </button>
            <button
              type="button"
              className={authModalView === 'signup' ? 'active' : ''}
              onClick={openSignup}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="auth-alert error" role="alert">
            <span>⚠</span>
            <div>{error}</div>
          </div>
        )}

        {/* Success Notification */}
        {successMessage && (
          <div className="auth-alert success" role="status">
            <span>✓</span>
            <div>{successMessage}</div>
          </div>
        )}

        {/* ===================== LOGIN VIEW ===================== */}
        {authModalView === 'login' && (
          <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="auth-input-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
              {fieldErrors.password && (
                <span className="auth-field-error">{fieldErrors.password}</span>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In →'}
            </button>

            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            {/* Google Authentication Container */}
            <div className="google-auth-section">
              <div ref={googleBtnContainerRef} className="google-btn-rendered" />
              <button
                type="button"
                className="google-custom-btn"
                onClick={handleGoogleButtonClick}
                disabled={isSubmitting}
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
            </div>

            <p className="auth-switch-text">
              Don’t have an account?{' '}
              <button type="button" onClick={openSignup} className="auth-switch-btn">
                Create one now
              </button>
            </p>
          </form>
        )}

        {/* ===================== SIGNUP VIEW ===================== */}
        {authModalView === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="auth-form" noValidate>
            <div className="auth-field">
              <label htmlFor="signup-name">Full Name *</label>
              <input
                id="signup-name"
                type="text"
                placeholder="e.g. Aarohi Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              {fieldErrors.fullName && (
                <span className="auth-field-error">{fieldErrors.fullName}</span>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="signup-email">Email Address *</label>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
            </div>

            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="signup-password">Password *</label>
                <div className="auth-input-password-wrap">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, 1 letter & 1 number"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="auth-field-error">{fieldErrors.password}</span>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="signup-confirm-password">Confirm Password *</label>
                <input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {fieldErrors.confirmPassword && (
                  <span className="auth-field-error">{fieldErrors.confirmPassword}</span>
                )}
              </div>
            </div>

            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="signup-dob">Date of Birth (18+)</label>
                <input
                  id="signup-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
                {fieldErrors.dateOfBirth && (
                  <span className="auth-field-error">{fieldErrors.dateOfBirth}</span>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="signup-gender">Gender Identity</label>
                <select
                  id="signup-gender"
                  value={genderIdentity}
                  onChange={(e) => setGenderIdentity(e.target.value)}
                >
                  <option value="">Select gender...</option>
                  <option value="woman">Woman</option>
                  <option value="man">Man</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="signup-mobile">Mobile Number (Optional)</label>
              <input
                id="signup-mobile"
                type="tel"
                placeholder="+91 98765 43210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>

            <div className="auth-checkbox-field">
              <label>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <span>
                  I agree to Saanjh’s <b>Terms of Service</b> and <b>Privacy Policy</b>, and confirm I am at least 18 years old.
                </span>
              </label>
              {fieldErrors.termsAccepted && (
                <span className="auth-field-error">{fieldErrors.termsAccepted}</span>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating account...' : 'Create Account →'}
            </button>

            <div className="auth-divider">
              <span>or sign up with</span>
            </div>

            {/* Google Authentication */}
            <div className="google-auth-section">
              <div ref={googleBtnContainerRef} className="google-btn-rendered" />
              <button
                type="button"
                className="google-custom-btn"
                onClick={handleGoogleButtonClick}
                disabled={isSubmitting}
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
            </div>

            <p className="auth-switch-text">
              Already have an account?{' '}
              <button type="button" onClick={openLogin} className="auth-switch-btn">
                Sign in here
              </button>
            </p>
          </form>
        )}

        {/* ===================== PROFILE VIEW ===================== */}
        {authModalView === 'profile' && user && (
          <form onSubmit={handleProfileSubmit} className="auth-form">
            <div className="profile-banner">
              <div className="profile-avatar-circle">
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user.fullName} />
                ) : (
                  <span>{user.fullName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="profile-banner-info">
                <h3>{user.displayName || user.fullName}</h3>
                <p>{user.email}</p>
                <span className="profile-status-tag">
                  {user.emailVerified ? '✓ Verified Account' : 'Member'}
                </span>
              </div>
            </div>

            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="prof-name">Full Name</label>
                <input
                  id="prof-name"
                  type="text"
                  value={profileFullName}
                  onChange={(e) => setProfileFullName(e.target.value)}
                  required
                />
              </div>
              <div className="auth-field">
                <label htmlFor="prof-display">Display Name</label>
                <input
                  id="prof-display"
                  type="text"
                  value={profileDisplayName}
                  onChange={(e) => setProfileDisplayName(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="prof-bio">Bio / About Me</label>
              <textarea
                id="prof-bio"
                rows={3}
                placeholder="What brings you joy? What values matter to you?"
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
              />
            </div>

            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="prof-city">City / Location</label>
                <input
                  id="prof-city"
                  type="text"
                  placeholder="e.g. Bangalore, India"
                  value={profileCity}
                  onChange={(e) => setProfileCity(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="prof-occ">Occupation</label>
                <input
                  id="prof-occ"
                  type="text"
                  placeholder="e.g. Product Designer"
                  value={profileOccupation}
                  onChange={(e) => setProfileOccupation(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="prof-edu">Education</label>
                <input
                  id="prof-edu"
                  type="text"
                  placeholder="e.g. University / Degree"
                  value={profileEducation}
                  onChange={(e) => setProfileEducation(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="prof-gender">Gender</label>
                <select
                  id="prof-gender"
                  value={profileGender}
                  onChange={(e) => setProfileGender(e.target.value)}
                >
                  <option value="">Select gender...</option>
                  <option value="woman">Woman</option>
                  <option value="man">Man</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="profile-actions-bar">
              <button
                type="submit"
                className="auth-submit-btn profile-save-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Profile Changes'}
              </button>
              <button
                type="button"
                className="auth-logout-btn"
                onClick={logout}
              >
                Log Out
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
