import React, { useState, useEffect } from 'react';
import { api, ProfileData, UserInterestsData } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface SettingsPageProps {
  onNavigate: (path: string) => void;
}

export default function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { user, showToast } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'interests'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile fields
  const [city, setCity] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState(25);
  const [relationshipGoal, setRelationshipGoal] = useState('long-term');
  const [dealBreakers, setDealBreakers] = useState('');
  const [notes, setNotes] = useState('');

  // Interests
  const [userInterests, setUserInterests] = useState<UserInterestsData | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.onboarding.getSettings();
        if (res.profile) {
          setCity(res.profile.city || '');
          setMaxDistanceKm(res.profile.maxDistanceKm || 25);
          setRelationshipGoal(res.profile.relationshipGoal || 'long-term');
          setDealBreakers(res.profile.dealBreakers || '');
          setNotes(res.profile.notes || '');
        }
        if (res.userInterests) {
          setUserInterests(res.userInterests);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load your settings.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await api.onboarding.updateSettingsProfile({
        city: city.trim(),
        maxDistanceKm: Number(maxDistanceKm),
        relationshipGoal,
        dealBreakers: dealBreakers.trim(),
        notes: notes.trim(),
      });
      showToast('Profile preferences updated successfully.', 'success');
    } catch (err: any) {
      setError(err.message || 'Could not update profile preferences.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', color: 'var(--body)' }}>
      {/* Header */}
      <header
        style={{
          height: '76px',
          padding: '0 5.5%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(253, 248, 243, 0.95)',
          borderBottom: '1px solid #ebd9c8',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '28px',
            fontWeight: '600',
            color: 'var(--ink)',
            textDecoration: 'none',
          }}
        >
          <span className="logo-mark"><i /><i /><i /></span>
          <span>Saanjh</span>
        </a>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => onNavigate('/dashboard')}
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              border: '1px solid #ded8d0',
              background: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '780px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{ marginBottom: '28px' }}>
          <span className="auth-form-tag">Account Settings</span>
          <h1 style={{ fontFamily: '"Newsreader", serif', fontSize: '36px', margin: '4px 0 8px', color: 'var(--ink)' }}>
            Preferences & Passions
          </h1>
          <p style={{ color: '#6a6158', fontSize: '15px' }}>
            Update your location, matchmaking boundaries, or return to edit your catalog interests.
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #ebd9c8', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: '600',
              color: activeTab === 'profile' ? 'var(--coral)' : '#6c635b',
              borderBottom: activeTab === 'profile' ? '2.5px solid var(--coral)' : 'none',
              cursor: 'pointer',
            }}
          >
            Profile & Dating Goals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('interests')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: '600',
              color: activeTab === 'interests' ? 'var(--coral)' : '#6c635b',
              borderBottom: activeTab === 'interests' ? '2.5px solid var(--coral)' : 'none',
              cursor: 'pointer',
            }}
          >
            Interests & Passions
          </button>
        </div>

        {error && (
          <div className="auth-alert error" role="alert" style={{ marginBottom: '20px' }}>
            <span>⚠</span>
            <div>{error}</div>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6a6158' }}>
            Loading your settings...
          </div>
        ) : activeTab === 'profile' ? (
          <form
            onSubmit={handleSaveProfile}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #ebd9c8',
              padding: '32px',
              boxShadow: '0 8px 30px rgba(45, 30, 20, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                Your City or Area
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #ded8d0',
                  borderRadius: '12px',
                  fontSize: '15px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                Search Radius
              </label>
              <select
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #ded8d0',
                  borderRadius: '12px',
                  fontSize: '15px',
                }}
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100+ km</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                Relationship Goal
              </label>
              <select
                value={relationshipGoal}
                onChange={(e) => setRelationshipGoal(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #ded8d0',
                  borderRadius: '12px',
                  fontSize: '15px',
                }}
              >
                <option value="long-term">Long-term relationship</option>
                <option value="casual">Casual dating</option>
                <option value="friendship">Meaningful friendship</option>
                <option value="unsure">Still figuring it out</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                Important lifestyle deal-breakers
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={dealBreakers}
                onChange={(e) => setDealBreakers(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #ded8d0',
                  borderRadius: '12px',
                  fontSize: '14px',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="auth-submit-btn"
              style={{ alignSelf: 'flex-start', padding: '12px 28px' }}
            >
              {isSaving ? 'Saving changes...' : 'Save Profile Settings →'}
            </button>
          </form>
        ) : (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #ebd9c8',
              padding: '32px',
              boxShadow: '0 8px 30px rgba(45, 30, 20, 0.04)',
            }}
          >
            <h3 style={{ fontFamily: '"Newsreader", serif', fontSize: '22px', margin: '0 0 12px' }}>
              Your Interests
            </h3>
            <p style={{ fontSize: '14.5px', color: '#6a6158', marginBottom: '20px' }}>
              You currently have <strong>{userInterests?.interests?.length || 0}</strong> interests selected across{' '}
              <strong>{userInterests?.categories?.length || 0}</strong> categories.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <label style={{ fontSize: '13.5px', fontWeight: '700' }}>Your Top 3 Featured Passions:</label>
              {userInterests?.top3 && userInterests.top3.length > 0 ? (
                userInterests.top3.map((slug, idx) => (
                  <div
                    key={slug}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      background: 'var(--peach)',
                      color: 'var(--coral-dark)',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    ★ {idx + 1}. {slug.split('.')[1]?.replace(/_/g, ' ') || slug}
                  </div>
                ))
              ) : (
                <p style={{ color: '#888', fontSize: '14px' }}>No top interests ranked yet.</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => onNavigate('/onboarding/interest-questions')}
                className="primary-button"
              >
                Attempt / Review Compatibility Questions →
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/onboarding/interests')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '999px',
                  border: '1.5px solid #ded8d0',
                  background: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: 'var(--ink)',
                }}
              >
                Re-select Interests & Top 3
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
