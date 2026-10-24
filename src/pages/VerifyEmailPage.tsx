import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';

interface VerifyEmailPageProps {
  onNavigate: (path: string) => void;
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'your email';
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user.charAt(0)}***@${domain}`;
  }
  return `${user.charAt(0)}***${user.charAt(user.length - 1)}@${domain}`;
}

export default function VerifyEmailPage({ onNavigate }: VerifyEmailPageProps) {
  const { user, pendingEmail, verifyOtp, resendOtp, setPendingEmail } = useAuth();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const emailToVerify = pendingEmail || user?.email || '';

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus the first input on load
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handle individual digit input
  function handleChange(index: number, value: string) {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const char = cleaned.charAt(cleaned.length - 1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setError(null);

    // Auto-advance to next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if full code entered
    if (newDigits.every((d) => d !== '')) {
      submitCode(newDigits.join(''));
    }
  }

  // Handle backspace key navigation
  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  // Handle paste of 6-digit code
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    const numericOnly = pasteData.replace(/\D/g, '').slice(0, 6);

    if (!numericOnly) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = numericOnly[i] || '';
    }
    setDigits(newDigits);
    setError(null);

    // Focus appropriate box
    const focusIndex = Math.min(numericOnly.length, 5);
    inputRefs.current[focusIndex]?.focus();

    if (numericOnly.length === 6) {
      submitCode(numericOnly);
    }
  }

  async function submitCode(codeToSubmit: string) {
    if (codeToSubmit.length !== 6) {
      setError('Please enter all 6 digits of your verification code');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const verifiedUser = await verifyOtp(codeToSubmit);
      if (verifiedUser.onboardingStep === 'profile') {
        onNavigate('/onboarding/profile');
      } else if (verifiedUser.onboardingStep === 'interests') {
        onNavigate('/onboarding/interests');
      } else if (verifiedUser.onboardingStep === 'interest_questions') {
        onNavigate('/onboarding/interest-questions');
      } else {
        onNavigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect verification code. Please check your email.');
      // Select the first input again on failure
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      await resendOtp();
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 429) {
        setError(err.message || 'Please wait before requesting another code.');
      } else {
        setError(err.message || "Couldn't send the code, try again");
      }
    } finally {
      setIsResending(false);
    }
  }

  function handleChangeEmail() {
    setPendingEmail('');
    onNavigate('/signup');
  }

  return (
    <div className="auth-page-root">
      <main className="auth-page-main">
        <div className="auth-page-container">
          {/* Left Column: Visual Brand Story with Progress Highlight */}
          <section className="auth-page-visual">
            <div className="auth-visual-inner">
              <div className="auth-visual-badge">Email Verification</div>
              <h2>Your journey starts with genuine trust.</h2>
              <p>
                To keep Saanjh safe, authentic, and intentional, every member verifies their email address before beginning.
              </p>

              <div className="auth-steps-list">
                <div className="auth-step-item" style={{ opacity: 1 }}>
                  <span className="auth-step-num" style={{ background: 'var(--coral)' }}>1</span>
                  <div>
                    <strong style={{ color: 'var(--coral)' }}>Verify your email</strong>
                    <p>Enter the 6-digit code sent to your inbox.</p>
                  </div>
                </div>
                <div className="auth-step-item" style={{ opacity: 0.65 }}>
                  <span className="auth-step-num" style={{ background: '#c8bfb8' }}>2</span>
                  <div>
                    <strong>Create your profile</strong>
                    <p>Share your lifestyle rhythms, partner priorities, and relationship goals.</p>
                  </div>
                </div>
                <div className="auth-step-item" style={{ opacity: 0.65 }}>
                  <span className="auth-step-num" style={{ background: '#c8bfb8' }}>3</span>
                  <div>
                    <strong>Explore interests & questions</strong>
                    <p>Choose what matters and unlock curated mutual compatibility.</p>
                  </div>
                </div>
              </div>

              <div className="auth-visual-quote-static">
                <b>“</b>
                <span>
                  Knowing that everyone is verified makes each conversation feel safer and so much more intentional. <b>”</b>
                </span>
              </div>
            </div>
          </section>

          {/* Right Column: 6-Digit OTP Form Card */}
          <section className="auth-page-form-wrap">
            <div className="auth-form-container">
              <div className="auth-form-header">
                <span className="auth-form-tag">Security & Verification</span>
                <h1>Verify your email</h1>
                <p>
                  We sent a 6-digit verification code to{' '}
                  <strong style={{ color: 'var(--ink)' }}>{maskEmail(emailToVerify)}</strong>.
                </p>
              </div>

              {error && (
                <div className="auth-alert error" role="alert" style={{ marginBottom: '20px' }}>
                  <span>⚠</span>
                  <div>{error}</div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitCode(digits.join(''));
                }}
                noValidate
              >
                {/* 6 Digit Inputs */}
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'space-between',
                    marginBottom: '28px',
                  }}
                  onPaste={handlePaste}
                >
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      autoComplete="one-time-code"
                      aria-label={`Digit ${idx + 1} of verification code`}
                      style={{
                        width: '52px',
                        height: '62px',
                        fontSize: '26px',
                        fontWeight: '700',
                        textAlign: 'center',
                        color: 'var(--ink)',
                        background: '#ffffff',
                        border: digit ? '2px solid var(--coral)' : '1.5px solid #ded8d0',
                        borderRadius: '14px',
                        boxShadow: '0 2px 8px rgba(45, 30, 20, 0.04)',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                      }}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isSubmitting || digits.some((d) => d === '')}
                  style={{ width: '100%', marginBottom: '16px' }}
                >
                  {isSubmitting ? 'Verifying code...' : 'Confirm & Continue →'}
                </button>
              </form>

              {/* Resend & Change Email Footer */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#6c635b',
                }}
              >
                <div>
                  Didn't receive the email?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isResending}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: resendCooldown > 0 ? '#999' : 'var(--coral)',
                      fontWeight: '600',
                      cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    {isResending
                      ? 'Sending code...'
                      : resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : 'Resend code'}
                  </button>
                </div>

                <div>
                  Entered the wrong email?{' '}
                  <button
                    type="button"
                    onClick={handleChangeEmail}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--teal)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    Change email address
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
