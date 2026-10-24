import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

interface GoogleCompletePageProps {
  onNavigate: (path: string) => void;
}

export default function GoogleCompletePage({ onNavigate }: GoogleCompletePageProps) {
  const { user, completeGoogle } = useAuth();

  const [dateOfBirth, setDateOfBirth] = useState('');
  const [genderIdentity, setGenderIdentity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const newFieldErrors: Record<string, string> = {};

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

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await completeGoogle(dateOfBirth, genderIdentity, user?.email);
      onNavigate('/onboarding/profile');
    } catch (err: any) {
      if (err instanceof ApiError && err.data?.errors) {
        const backendErrors: Record<string, string> = {};
        err.data.errors.forEach((e: any) => {
          backendErrors[e.field] = e.message;
        });
        setFieldErrors(backendErrors);
      }
      setError(err.message || 'Could not complete your profile. Please check your entries.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page-root">
      <main className="auth-page-main">
        <div className="auth-page-container">
          {/* Left Column: Visual Brand Story */}
          <section className="auth-page-visual">
            <div className="auth-visual-inner">
              <div className="auth-visual-badge">Welcome to Saanjh</div>
              <h2>Just a couple more thoughtful details.</h2>
              <p>
                Because Saanjh is an adult matchmaking community, we confirm that all members are 18 or older and understand how you identify.
              </p>

              <div className="auth-steps-list">
                <div className="auth-step-item">
                  <span className="auth-step-num">✓</span>
                  <div>
                    <strong>Google account verified</strong>
                    <p>{user?.email || 'Your Google account'}</p>
                  </div>
                </div>
                <div className="auth-step-item">
                  <span className="auth-step-num" style={{ background: 'var(--coral)' }}>1</span>
                  <div>
                    <strong style={{ color: 'var(--coral)' }}>Basic eligibility</strong>
                    <p>Age and gender identity confirmation.</p>
                  </div>
                </div>
                <div className="auth-step-item" style={{ opacity: 0.65 }}>
                  <span className="auth-step-num" style={{ background: '#c8bfb8' }}>2</span>
                  <div>
                    <strong>Create your profile</strong>
                    <p>Who you want to meet and your relationship goals.</p>
                  </div>
                </div>
              </div>

              <div className="auth-visual-quote-static">
                <b>“</b>
                <span>
                  Authenticity is the foundation of genuine connection. <b>”</b>
                </span>
              </div>
            </div>
          </section>

          {/* Right Column: Form */}
          <section className="auth-page-form-wrap">
            <div className="auth-form-container">
              <div className="auth-form-header">
                <span className="auth-form-tag">Almost Ready</span>
                <h1>Complete your account</h1>
                <p>Welcome, {user?.fullName || 'friend'}. Please confirm your age and gender identity to continue.</p>
              </div>

              {error && (
                <div className="auth-alert error" role="alert" style={{ marginBottom: '20px' }}>
                  <span>⚠</span>
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <div className="auth-field">
                  <label htmlFor="google-dob">Date of Birth (18+) *</label>
                  <input
                    id="google-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                  />
                  {fieldErrors.dateOfBirth && (
                    <span className="auth-field-error">{fieldErrors.dateOfBirth}</span>
                  )}
                </div>

                <div className="auth-field" style={{ marginTop: '16px' }}>
                  <label htmlFor="google-gender">Gender Identity *</label>
                  <select
                    id="google-gender"
                    value={genderIdentity}
                    onChange={(e) => setGenderIdentity(e.target.value)}
                    required
                  >
                    <option value="">Select gender...</option>
                    <option value="woman">Woman</option>
                    <option value="man">Man</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                  {fieldErrors.genderIdentity && (
                    <span className="auth-field-error">{fieldErrors.genderIdentity}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isSubmitting}
                  style={{ width: '100%', marginTop: '24px' }}
                >
                  {isSubmitting ? 'Saving details...' : 'Continue to Profile Setup →'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
