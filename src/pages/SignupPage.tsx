import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

interface SignupPageProps {
  onNavigate: (path: string) => void;
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

export default function SignupPage({ onNavigate }: SignupPageProps) {
  const { user, signup, loginWithGoogle } = useAuth();
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);
  const [isGoogleRendered, setIsGoogleRendered] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [genderIdentity, setGenderIdentity] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      onNavigate('/');
    }
  }, [user, onNavigate]);

  // Google Identity Services setup
  useEffect(() => {
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
              const loggedInUser = await loginWithGoogle(response.credential);
              if (loggedInUser.onboardingStep === 'google_complete') {
                onNavigate('/onboarding/google-complete');
              } else if (loggedInUser.onboardingStep === 'profile') {
                onNavigate('/onboarding/profile');
              } else if (loggedInUser.onboardingStep === 'interests') {
                onNavigate('/onboarding/interests');
              } else if (loggedInUser.onboardingStep === 'interest_questions') {
                onNavigate('/onboarding/interest-questions');
              } else {
                onNavigate('/dashboard');
              }
            } catch (err: any) {
              setError(err.message || 'Google signup failed');
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
          width: 320,
          text: 'signup_with',
          shape: 'pill',
        });
        setIsGoogleRendered(true);
      }
    } catch (e) {
      console.warn('Google Identity button note:', e);
    }
  }, [loginWithGoogle, onNavigate]);

  async function handleGoogleClick() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError(
        'Google Login is in setup mode. Please set VITE_GOOGLE_CLIENT_ID in .env and GOOGLE_CLIENT_ID in backend/.env.'
      );
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setError('Google Sign-up prompt was closed. Please try clicking the button again.');
        }
      });
    } else {
      setError('Google Sign-up is currently loading. Please check your connection.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
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

    if (!dateOfBirth) {
      newFieldErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      if (dob > cutoff) {
        newFieldErrors.dateOfBirth = 'You must be at least 18 years old to join Saanjh';
      }
    }

    if (!genderIdentity) {
      newFieldErrors.genderIdentity = 'Please select your gender identity';
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
        dateOfBirth,
        genderIdentity,
        termsAccepted,
      });
      onNavigate('/verify-email');
    } catch (err: any) {
      if (err instanceof ApiError && err.data?.errors) {
        const backendFieldErrors: Record<string, string> = {};
        err.data.errors.forEach((e: any) => {
          backendFieldErrors[e.field] = e.message;
        });
        setFieldErrors(backendFieldErrors);
      }
      setError(err.message || 'Signup failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page-root">
      {/* Main Split Content */}
      <main className="auth-page-main">
        <div className="auth-page-container signup-container">
          {/* Left Column: Editorial Brand Showcase */}
          <section className="auth-page-visual">
            <div className="auth-visual-inner">
              <div className="auth-visual-badge">Join Saanjh</div>
              <h2>Find someone who truly aligns with you.</h2>
              <p>
                Experience a calm, values-first matchmaking community where depth, kindness, and authentic life goals come first.
              </p>

              <div className="auth-steps-list">
                <div className="auth-step-item">
                  <span className="auth-step-num">1</span>
                  <div>
                    <strong>Create your profile</strong>
                    <p>Share your interests, lifestyle, and values.</p>
                  </div>
                </div>
                <div className="auth-step-item">
                  <span className="auth-step-num">2</span>
                  <div>
                    <strong>Answer thoughtful questions</strong>
                    <p>Explore real-life scenarios that reveal genuine compatibility.</p>
                  </div>
                </div>
                <div className="auth-step-item">
                  <span className="auth-step-num">3</span>
                  <div>
                    <strong>Meet curated matches</strong>
                    <p>Hand-picked daily suggestions with natural guided icebreakers.</p>
                  </div>
                </div>
              </div>

              <div className="auth-visual-quote-static">
                <b>“</b>
                <span>It feels refreshing to connect based on shared values rather than endless superficial swipes.</span>
              </div>
            </div>
          </section>

          {/* Right Column: Clean Signup Form */}
          <section className="auth-page-form-wrap">
            <div className="auth-form-container">
              <div className="auth-form-header">
                <span className="auth-form-tag">New Member Registration</span>
                <h1>Create your account</h1>
                <p>Begin your journey to calm, meaningful connections.</p>
              </div>

              {error && (
                <div className="auth-alert error" role="alert">
                  <span>⚠</span>
                  <div>{error}</div>
                </div>
              )}

              {/* Google Sign-Up */}
              <div className="auth-page-google">
                <div ref={googleBtnContainerRef} className="google-btn-rendered" />
                {!isGoogleRendered && (
                  <button
                    type="button"
                    className="google-custom-btn"
                    onClick={handleGoogleClick}
                    disabled={isSubmitting}
                  >
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </button>
                )}
              </div>

              <div className="auth-divider">
                <span>or register with email</span>
              </div>

              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <div className="auth-field">
                  <label htmlFor="signup-page-name">Full Name *</label>
                  <input
                    id="signup-page-name"
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
                  <label htmlFor="signup-page-email">Email Address *</label>
                  <input
                    id="signup-page-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                  {fieldErrors.email && (
                    <span className="auth-field-error">{fieldErrors.email}</span>
                  )}
                </div>

                <div className="auth-field-row">
                  <div className="auth-field">
                    <label htmlFor="signup-page-password">Password *</label>
                    <div className="auth-input-password-wrap">
                      <input
                        id="signup-page-password"
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
                    <label htmlFor="signup-page-confirm">Confirm Password *</label>
                    <input
                      id="signup-page-confirm"
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
                    <label htmlFor="signup-page-dob">Date of Birth (18+)</label>
                    <input
                      id="signup-page-dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                    {fieldErrors.dateOfBirth && (
                      <span className="auth-field-error">{fieldErrors.dateOfBirth}</span>
                    )}
                  </div>

                  <div className="auth-field">
                    <label htmlFor="signup-page-gender">Gender Identity</label>
                    <select
                      id="signup-page-gender"
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
                  <label htmlFor="signup-page-mobile">Mobile Number (Optional)</label>
                  <input
                    id="signup-page-mobile"
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
                  {isSubmitting ? 'Creating account...' : 'Create My Saanjh Account →'}
                </button>
              </form>

              <div className="auth-footer-prompt">
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('/login')}
                    className="auth-switch-link"
                  >
                    Sign in here →
                  </button>
                </p>
                <p style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => onNavigate('/')}
                    className="auth-back-simple"
                  >
                    ← Back to website
                  </button>
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
