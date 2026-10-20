import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
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

export default function LoginPage({ onNavigate }: LoginPageProps) {
  const { user, login, loginWithGoogle } = useAuth();
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect or display status
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
              await loginWithGoogle(response.credential);
              onNavigate('/');
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
          width: 320,
          text: 'signin_with',
          shape: 'pill',
        });
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
          setError('Google Sign-in prompt was closed. Please try clicking the button again.');
        }
      });
    } else {
      setError('Google Sign-in is currently loading. Please check your connection.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      onNavigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page-root">
      {/* Main Split Content */}
      <main className="auth-page-main">
        <div className="auth-page-container">
          {/* Left Column: Editorial Brand Showcase */}
          <section className="auth-page-visual">
            <div className="auth-visual-inner">
              <div className="auth-visual-badge">More Than a Match</div>
              <h2>Where meaningful connections begin.</h2>
              <p>
                Saanjh looks beyond surface-level swipes. We connect thoughtful people based on shared values, lifestyle rhythms, and authentic conversations.
              </p>

              <div className="auth-visual-image-wrap">
                <img
                  src="/images/notebook-reference.png"
                  alt="Thoughtful questions on a desk"
                />
              </div>

              <div className="auth-visual-quote">
                <b>“</b>
                <span>
                  The questions made all the difference. Real conversations, zero games. <b>”</b>
                </span>
              </div>

              <div className="auth-visual-tags">
                <span>Values</span>
                <span>Lifestyle</span>
                <span>Curiosity</span>
                <span>Kindness</span>
              </div>
            </div>
          </section>

          {/* Right Column: Clean Login Form */}
          <section className="auth-page-form-wrap">
            <div className="auth-form-container">
              <div className="auth-form-header">
                <span className="auth-form-tag">Welcome Back</span>
                <h1>Sign in to your account</h1>
                <p>Enter your details to view your matches and conversations.</p>
              </div>

              {error && (
                <div className="auth-alert error" role="alert">
                  <span>⚠</span>
                  <div>{error}</div>
                </div>
              )}

              {/* Google Sign-In */}
              <div className="auth-page-google">
                <div ref={googleBtnContainerRef} className="google-btn-rendered" />
                <button
                  type="button"
                  className="google-custom-btn"
                  onClick={handleGoogleClick}
                  disabled={isSubmitting}
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>
              </div>

              <div className="auth-divider">
                <span>or sign in with email</span>
              </div>

              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <div className="auth-field">
                  <label htmlFor="page-login-email">Email Address</label>
                  <input
                    id="page-login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="auth-field">
                  <div className="auth-field-header-row">
                    <label htmlFor="page-login-password">Password</label>
                    <button
                      type="button"
                      className="auth-forgot-link"
                      onClick={() => alert("Password recovery: Please contact support or sign in with Google.")}
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="auth-input-password-wrap">
                    <input
                      id="page-login-password"
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
                </div>

                <div className="auth-checkbox-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember my session on this device</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In to Saanjh →'}
                </button>
              </form>

              <div className="auth-footer-prompt">
                <p>
                  Don’t have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('/signup')}
                    className="auth-switch-link"
                  >
                    Create an account here →
                  </button>
                </p>
                <p style={{ marginTop: '4px' }}>
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
