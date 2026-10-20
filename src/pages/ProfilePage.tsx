import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface ProfilePageProps {
  onNavigate: (path: string) => void;
}

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, logout, updateProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [occupation, setOccupation] = useState('');
  const [education, setEducation] = useState('');
  const [genderIdentity, setGenderIdentity] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      onNavigate('/login');
      return;
    }
    setFullName(user.fullName || '');
    setDisplayName(user.displayName || '');
    setBio(user.bio || '');
    setCity(user.city || '');
    setOccupation(user.occupation || '');
    setEducation(user.education || '');
    setGenderIdentity(user.genderIdentity || '');
    setMobileNumber(user.mobileNumber || '');
  }, [user, onNavigate]);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await updateProfile({
        fullName,
        displayName,
        bio,
        city,
        occupation,
        education,
        genderIdentity,
        mobileNumber,
      });
      setSuccess('Your profile has been updated successfully!');
      setTimeout(() => setSuccess(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    onNavigate('/');
  }

  return (
    <div className="auth-page-root">
      {/* Main Content */}
      <main className="auth-page-main">
        <div className="profile-page-card">
          <div className="profile-page-header">
            <div className="profile-avatar-large">
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt={user.fullName} />
              ) : (
                <span>{user.fullName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="profile-header-details">
              <span className="profile-badge">
                {user.emailVerified ? '✓ Verified Member' : 'Saanjh Member'}
              </span>
              <h1>{user.displayName || user.fullName}</h1>
              <p>{user.email}</p>
            </div>
            <button
              type="button"
              className="profile-logout-btn"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>

          {error && (
            <div className="auth-alert error" role="alert">
              <span>⚠</span>
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="auth-alert success" role="status">
              <span>✓</span>
              <div>{success}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="edit-name">Full Name</label>
                <input
                  id="edit-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="auth-field">
                <label htmlFor="edit-display">Display Name</label>
                <input
                  id="edit-display"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="edit-bio">Bio / About Me</label>
              <textarea
                id="edit-bio"
                rows={3}
                placeholder="Share your values, passions, and how you like spending your time."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="edit-city">City / Location</label>
                <input
                  id="edit-city"
                  type="text"
                  placeholder="e.g. Bangalore, India"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="edit-occupation">Occupation</label>
                <input
                  id="edit-occupation"
                  type="text"
                  placeholder="e.g. Product Designer"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </div>
            </div>

            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="edit-education">Education</label>
                <input
                  id="edit-education"
                  type="text"
                  placeholder="e.g. University / Degree"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="edit-gender">Gender</label>
                <select
                  id="edit-gender"
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
              <label htmlFor="edit-mobile">Mobile Number</label>
              <input
                id="edit-mobile"
                type="tel"
                placeholder="+91 98765 43210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>

            <div className="profile-actions-row">
              <button
                type="submit"
                className="auth-submit-btn profile-save-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
              <button
                type="button"
                className="auth-cancel-btn"
                onClick={() => onNavigate('/')}
              >
                Done
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
