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
  const [questionsStats, setQuestionsStats] = useState<{
    totalCategories: number;
    completedCategories: number;
    skippedCategories: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, questionsRes] = await Promise.all([
          api.onboarding.getSettings(),
          api.onboarding.getQuestions().catch(() => null),
        ]);

        if (settingsRes.profile) setProfile(settingsRes.profile);
        if (settingsRes.userInterests) setUserInterests(settingsRes.userInterests);

        if (questionsRes && questionsRes.categoriesQuestions) {
          const total = questionsRes.categoriesQuestions.length;
          let completed = 0;
          let skipped = 0;

          questionsRes.categoriesQuestions.forEach((cq) => {
            const ans = cq.answers || [];
            const hasSkipped = ans.some((a: any) => a.skipped || a.selectedValue === 'skipped');
            const validAnswerCount = ans.filter(
              (a: any) => !a.skipped && a.selectedValue && a.selectedValue !== 'skipped'
            ).length;

            if (validAnswerCount >= 4 && !hasSkipped) {
              completed++;
            } else {
              skipped++;
            }
          });

          setQuestionsStats({
            totalCategories: total,
            completedCategories: completed,
            skippedCategories: skipped,
          });
        }
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
            {questionsStats && questionsStats.skippedCategories > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('/onboarding/interest-questions')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '999px',
                  border: '1.5px solid var(--coral)',
                  background: 'var(--coral)',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(224, 102, 60, 0.25)',
                }}
              >
                Attempt Skipped Questions →
              </button>
            )}
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

        {/* Skipped Questions / Incomplete Reflections Alert Card */}
        {questionsStats && questionsStats.skippedCategories > 0 && (
          <div
            style={{
              background: 'linear-gradient(135deg, #fff8f3 0%, #ffffff 100%)',
              borderRadius: '24px',
              border: '1.5px solid var(--coral)',
              boxShadow: '0 12px 36px rgba(224, 102, 60, 0.1)',
              padding: '28px 32px',
              marginBottom: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div style={{ maxWidth: '580px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: 'var(--peach)',
                    color: 'var(--coral-dark)',
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  Reflections Skipped
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--coral-dark)' }}>
                  {questionsStats.skippedCategories} of {questionsStats.totalCategories} categories incomplete
                </span>
              </div>
              <h3 style={{ fontFamily: '"Newsreader", serif', fontSize: '24px', color: 'var(--ink)', margin: '0 0 6px' }}>
                Complete your skipped compatibility questions
              </h3>
              <p style={{ fontSize: '14.5px', color: '#5d534b', margin: 0, lineHeight: 1.55 }}>
                You skipped some questions during onboarding. Taking 2 minutes to answer them helps our matchmaking system understand your lifestyle rhythm and suggest significantly more compatible connections.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('/onboarding/interest-questions')}
              className="primary-button"
              style={{
                padding: '14px 26px',
                fontSize: '15px',
                fontWeight: '700',
                whiteSpace: 'nowrap',
              }}
            >
              Attempt Skipped Questions →
            </button>
          </div>
        )}

        {/* Profile & Interests Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Card 1: Profile Highlights */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #ebd9c8',
              padding: '28px',
              boxShadow: '0 4px 18px rgba(45, 30, 20, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
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

            <button
              type="button"
              onClick={() => onNavigate('/settings')}
              style={{
                marginTop: '20px',
                padding: '8px 16px',
                borderRadius: '999px',
                border: '1px solid #ded8d0',
                background: '#ffffff',
                color: 'var(--ink)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              Edit Preferences
            </button>
          </div>

          {/* Card 2: Top Interests */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #ebd9c8',
              padding: '28px',
              boxShadow: '0 4px 18px rgba(45, 30, 20, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: '"Newsreader", serif', fontSize: '20px', color: 'var(--ink)', margin: 0 }}>
                  Featured Passions
                </h3>
                <span style={{ fontSize: '12.5px', color: '#7a7068', fontWeight: '600' }}>
                  {userInterests?.interests?.length || 0} selected
                </span>
              </div>

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
                <div style={{ padding: '12px', background: '#fcf8f5', borderRadius: '12px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '13.5px', color: '#888', margin: 0 }}>
                    You skipped selecting specific interests.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('/onboarding/interests')}
              style={{
                marginTop: '20px',
                padding: '8px 16px',
                borderRadius: '999px',
                border: '1px solid #ded8d0',
                background: '#ffffff',
                color: 'var(--ink)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              Re-select Passions
            </button>
          </div>

          {/* Card 3: Compatibility Reflections */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: questionsStats && questionsStats.skippedCategories > 0 ? '1.5px solid var(--coral)' : '1px solid #ebd9c8',
              padding: '28px',
              boxShadow: '0 4px 18px rgba(45, 30, 20, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: '"Newsreader", serif', fontSize: '20px', color: 'var(--ink)', margin: 0 }}>
                  Reflections
                </h3>
                {questionsStats && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: questionsStats.skippedCategories > 0 ? 'var(--peach)' : '#e7f5ea',
                      color: questionsStats.skippedCategories > 0 ? 'var(--coral-dark)' : '#1e7e34',
                    }}
                  >
                    {questionsStats.skippedCategories > 0
                      ? `${questionsStats.skippedCategories} Skipped`
                      : 'All Completed ✓'}
                  </span>
                )}
              </div>

              <p style={{ fontSize: '14.5px', color: '#5d534b', lineHeight: 1.5, margin: '0 0 12px' }}>
                {questionsStats && questionsStats.totalCategories > 0
                  ? `${questionsStats.completedCategories} of ${questionsStats.totalCategories} categories completed.`
                  : 'Capture what matters to you in your passions.'}
              </p>

              <p style={{ fontSize: '13px', color: '#8c827a', lineHeight: 1.45, margin: 0 }}>
                {questionsStats && questionsStats.skippedCategories > 0
                  ? 'Answering skipped questions sharpens your match quality significantly.'
                  : 'You can update your answers anytime as your perspective evolves.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('/onboarding/interest-questions')}
              style={{
                marginTop: '20px',
                padding: '10px 18px',
                borderRadius: '999px',
                border: '1.5px solid var(--coral)',
                background: questionsStats && questionsStats.skippedCategories > 0 ? 'var(--coral)' : '#ffffff',
                color: questionsStats && questionsStats.skippedCategories > 0 ? '#ffffff' : 'var(--coral-dark)',
                fontSize: '13.5px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center',
                alignSelf: 'flex-start',
                transition: 'all 0.15s ease',
              }}
            >
              {questionsStats && questionsStats.skippedCategories > 0
                ? 'Attempt Skipped Questions →'
                : 'Review & Edit Answers →'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
