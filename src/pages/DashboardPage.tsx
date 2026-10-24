import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, ProfileData, UserInterestsData } from '../services/api';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userInterests, setUserInterests] = useState<UserInterestsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.onboarding.getSettings();
        if (res.profile) setProfile(res.profile);
        if (res.userInterests) setUserInterests(res.userInterests);
      } catch (err) {
        console.warn('Dashboard load note:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const displayName = user?.displayName || user?.fullName || 'friend';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', color: 'var(--body)' }}>
      {/* Top Header */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={() => onNavigate('/settings')}
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              border: '1px solid #ded8d0',
              background: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          >
            ⚙ Settings & Preferences
          </button>

          <button
            type="button"
            onClick={logout}
            style={{
              padding: '8px 16px',
              borderRadius: '999px',
              border: 'none',
              background: '#faeae0',
              color: 'var(--coral-dark)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Dashboard Hero */}
      <main style={{ maxWidth: '960px', margin: '48px auto', padding: '0 24px' }}>
        <div
          style={{
            background: '#ffffff',
            borderRadius: '28px',
            border: '1px solid #ebd9c8',
            boxShadow: '0 16px 48px rgba(45, 30, 20, 0.06)',
            padding: '48px 40px',
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              fontFamily: '"Source Sans 3", sans-serif',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--coral)',
              background: 'var(--peach)',
              padding: '6px 16px',
              borderRadius: '999px',
              display: 'inline-block',
              marginBottom: '16px',
            }}
          >
            Onboarding Complete
          </span>

          <h1
            style={{
              fontFamily: '"Newsreader", serif',
              fontSize: 'clamp(32px, 3.5vw, 44px)',
              fontWeight: '500',
              color: 'var(--ink)',
              margin: '0 0 16px',
              lineHeight: 1.15,
            }}
          >
            Welcome, {displayName}. Your matches are coming.
          </h1>

          <p
            style={{
              fontSize: '17px',
              lineHeight: 1.6,
              color: '#5d534b',
              maxWidth: '600px',
              margin: '0 auto 28px',
            }}
          >
            Thank you for thoughtfully completing your profile and sharing what matters to you.
            Our matching system is curating your first set of compatible connections.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="primary-button"
            >
              Explore Saanjh Home →
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/settings')}
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
              Edit Profile & Interests
            </button>
          </div>
        </div>

        {/* Profile & Interests Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Card 1: Profile Highlights */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #ebd9c8',
              padding: '28px',
              boxShadow: '0 4px 18px rgba(45, 30, 20, 0.04)',
            }}
          >
            <h3 style={{ fontFamily: '"Newsreader", serif', fontSize: '20px', color: 'var(--ink)', margin: '0 0 16px' }}>
              Your Preferences
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14.5px', color: '#5d534b' }}>
              <div>
                <strong>Location:</strong> {profile?.city || 'Not specified'}
              </div>
              <div>
                <strong>Radius:</strong> Up to {profile?.maxDistanceKm || 25} km
              </div>
              <div>
                <strong>Looking for:</strong>{' '}
                <span style={{ textTransform: 'capitalize' }}>{profile?.relationshipGoal || 'Long-term'}</span>
              </div>
              <div>
                <strong>Age comfort:</strong> {profile?.ageRange?.min || 18} – {profile?.ageRange?.max || 40} years
              </div>
              <div>
                <strong>Languages:</strong> {profile?.languages?.join(', ') || 'English'}
              </div>
            </div>
          </div>

          {/* Card 2: Top Interests */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #ebd9c8',
              padding: '28px',
              boxShadow: '0 4px 18px rgba(45, 30, 20, 0.04)',
            }}
          >
            <h3 style={{ fontFamily: '"Newsreader", serif', fontSize: '20px', color: 'var(--ink)', margin: '0 0 16px' }}>
              Featured Passions
            </h3>
            {userInterests?.top3 && userInterests.top3.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {userInterests.top3.map((slug, idx) => (
                  <div
                    key={slug}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      background: 'var(--peach)',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--coral-dark)',
                    }}
                  >
                    <span>★ {idx + 1}.</span>
                    <span>{slug.split('.')[1]?.replace(/_/g, ' ') || slug}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: '#888' }}>No top interests ranked yet.</p>
            )}

            <div style={{ marginTop: '16px', fontSize: '13px', color: '#7a7068' }}>
              Total interests selected: {userInterests?.interests?.length || 0}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
