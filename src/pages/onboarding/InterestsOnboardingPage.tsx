import React, { useState, useEffect } from 'react';
import { api, InterestCategoryCatalog } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface InterestsOnboardingPageProps {
  onNavigate: (path: string) => void;
}

export default function InterestsOnboardingPage({ onNavigate }: InterestsOnboardingPageProps) {
  const { refreshUser, showToast } = useAuth();

  const [screen, setScreen] = useState<1 | 2 | 3>(1);
  const [catalog, setCatalog] = useState<Record<string, InterestCategoryCatalog>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selections
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [top3, setTop3] = useState<string[]>([]);

  // Active category filter for Screen 2
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('');

  useEffect(() => {
    async function init() {
      try {
        const [catRes, userInterestsRes] = await Promise.all([
          api.onboarding.getCatalog(),
          api.onboarding.getUserInterests(),
        ]);

        if (catRes.catalog) {
          setCatalog(catRes.catalog);
        }

        if (userInterestsRes.userInterests) {
          const ui = userInterestsRes.userInterests;
          if (ui.categories?.length) {
            setSelectedCategories(ui.categories);
            setActiveCategoryFilter(ui.categories[0]);
          }
          if (ui.interests?.length) setSelectedInterests(ui.interests);
          if (ui.top3?.length) setTop3(ui.top3);
        }
      } catch (err: any) {
        console.warn('Error loading catalog / user interests:', err.message);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  function toggleCategory(catKey: string) {
    if (selectedCategories.includes(catKey)) {
      const next = selectedCategories.filter((c) => c !== catKey);
      setSelectedCategories(next);
      // Remove interests from deselected category
      setSelectedInterests((prev) => prev.filter((slug) => !slug.startsWith(`${catKey}.`)));
      setTop3((prev) => prev.filter((slug) => !slug.startsWith(`${catKey}.`)));
    } else {
      setSelectedCategories([...selectedCategories, catKey]);
      if (!activeCategoryFilter) {
        setActiveCategoryFilter(catKey);
      }
    }
  }

  function toggleInterest(slug: string) {
    if (selectedInterests.includes(slug)) {
      setSelectedInterests(selectedInterests.filter((s) => s !== slug));
      setTop3(top3.filter((s) => s !== slug));
    } else {
      setSelectedInterests([...selectedInterests, slug]);
    }
  }

  function toggleTop3(slug: string) {
    if (top3.includes(slug)) {
      setTop3(top3.filter((s) => s !== slug));
    } else {
      if (top3.length >= 3) {
        showToast('You can only select exactly 3 top passions. Deselect one first.', 'info');
        return;
      }
      setTop3([...top3, slug]);
    }
  }

  function moveTop3Order(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= top3.length) return;
    const reordered = [...top3];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    setTop3(reordered);
  }

  function getInterestLabel(slug: string): string {
    const [catKey] = slug.split('.');
    const category = catalog[catKey];
    if (category) {
      const found = category.items.find((i) => i.slug === slug);
      if (found) return found.label;
    }
    return slug;
  }

  async function handleNext() {
    setError(null);

    // Screen 1: Pick categories (1 to 13, no arbitrary limit)
    if (screen === 1) {
      if (selectedCategories.length < 1) {
        setError('Please pick at least 1 category that inspires you.');
        return;
      }
      setActiveCategoryFilter(selectedCategories[0]);
      setScreen(2);
      return;
    }

    // Screen 2: Pick interests (no limit, counter is N selected)
    if (screen === 2) {
      if (selectedInterests.length < 1) {
        setError('Please pick at least 1 interest across your chosen categories.');
        return;
      }
      setScreen(3);
      return;
    }

    // Screen 3: Optional Top 3
    if (screen === 3) {
      setIsSaving(true);
      try {
        await api.onboarding.saveUserInterests({
          categories: selectedCategories,
          interests: selectedInterests,
          top3,
        });
        await refreshUser();
        onNavigate('/onboarding/interest-questions');
      } catch (err: any) {
        setError(err.message || 'Could not save your interests.');
      } finally {
        setIsSaving(false);
      }
    }
  }

  async function handleSkip() {
    setIsSaving(true);
    try {
      await api.onboarding.saveUserInterests({
        categories: selectedCategories,
        interests: selectedInterests,
        top3,
        skip: true,
      });
      await refreshUser();
      onNavigate('/onboarding/interest-questions');
    } catch (err: any) {
      setError(err.message || 'Could not skip interests right now.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    setError(null);
    if (screen > 1) {
      setScreen((prev) => (prev - 1) as 1 | 2 | 3);
    } else {
      onNavigate('/onboarding/profile');
    }
  }

  if (isLoading) {
    return (
      <div className="auth-page-root">
        <div style={{ textAlign: 'center', color: '#5d534b' }}>
          <p>Loading interest catalog...</p>
        </div>
      </div>
    );
  }

  const categoryKeys = Object.keys(catalog);

  return (
    <div className="auth-page-root">
      <main className="auth-page-main">
        <div className="auth-page-container signup-container">
          {/* Left Column: Visual Brand Story & Progress */}
          <section className="auth-page-visual">
            <div className="auth-visual-inner">
              <div className="auth-visual-badge">Step 2 of 3: Interests</div>
              <h2>Connect through the things you genuinely love.</h2>
              <p>
                From music moods and road trips to cooking and deep philosophy, mutual interests spark the easiest conversations.
              </p>

              <div className="auth-steps-list">
                <div className="auth-step-item">
                  <span className="auth-step-num">✓</span>
                  <div>
                    <strong>Profile completed</strong>
                    <p>Orientation, relationship goals, priorities.</p>
                  </div>
                </div>
                <div className="auth-step-item">
                  <span className="auth-step-num" style={{ background: 'var(--coral)' }}>2</span>
                  <div>
                    <strong style={{ color: 'var(--coral)' }}>Pick your interests</strong>
                    <p>
                      {screen === 1 && 'Screen 1: Choose categories that inspire you'}
                      {screen === 2 && 'Screen 2: Pick as many as you like'}
                      {screen === 3 && 'Screen 3: Rank your top 3 favourites (optional)'}
                    </p>
                  </div>
                </div>
                <div className="auth-step-item" style={{ opacity: 0.65 }}>
                  <span className="auth-step-num" style={{ background: '#c8bfb8' }}>3</span>
                  <div>
                    <strong>Answer thoughtful questions</strong>
                    <p>Unlock custom questions generated for your passions.</p>
                  </div>
                </div>
              </div>

              <div className="auth-visual-quote-static">
                <b>“</b>
                <span>
                  Seeing Aarohi's top 3 hobbies gave us an instant conversation starter that felt completely natural. <b>”</b>
                </span>
              </div>
            </div>
          </section>

          {/* Right Column: Interests Selection */}
          <section className="auth-page-form-wrap">
            <div className="auth-form-container" style={{ maxWidth: '520px' }}>
              {/* Header with Progress Bar */}
              <div className="auth-form-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="auth-form-tag">
                    Interests {screen} of 3
                  </span>
                  {screen === 2 && (
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--coral)' }}>
                      {selectedInterests.length} selected
                    </span>
                  )}
                  {screen === 3 && (
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--coral)' }}>
                      {top3.length} of 3 ranked
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: '#f2e6dc',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(screen / 3) * 100}%`,
                      background: 'var(--coral)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>
                  {screen === 1 && 'What areas light you up?'}
                  {screen === 2 && 'Select your specific interests'}
                  {screen === 3 && 'Which 3 matter most to you?'}
                </h1>
                <p style={{ fontSize: '14.5px' }}>
                  {screen === 1 && 'Pick any categories that speak to your life and passions.'}
                  {screen === 2 && 'Pick as many as you like across your chosen categories.'}
                  {screen === 3 && 'Pick and order your top favourites (optional).'}
                </p>
              </div>

              {error && (
                <div className="auth-alert error" role="alert" style={{ marginBottom: '16px' }}>
                  <span>⚠</span>
                  <div>{error}</div>
                </div>
              )}

              {/* SCREEN 1: 13 Large Category Cards */}
              {screen === 1 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '10px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    padding: '4px',
                  }}
                >
                  {categoryKeys.map((catKey) => {
                    const isSelected = selectedCategories.includes(catKey);
                    const catInfo = catalog[catKey];
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => toggleCategory(catKey)}
                        style={{
                          padding: '14px 10px',
                          borderRadius: '16px',
                          border: isSelected ? '2px solid var(--coral)' : '1px solid #ebdcd0',
                          background: isSelected ? 'var(--peach)' : '#ffffff',
                          color: isSelected ? 'var(--coral-dark)' : 'var(--ink)',
                          textAlign: 'center',
                          fontSize: '13.5px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>
                          {isSelected ? '✓' : '✦'}
                        </span>
                        <span>{catInfo?.label || catKey}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* SCREEN 2: Specific Interests (Category filter tabs + chips) */}
              {screen === 2 && (
                <div>
                  {/* Category Filter Tabs */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      overflowX: 'auto',
                      paddingBottom: '8px',
                      marginBottom: '14px',
                    }}
                  >
                    {selectedCategories.map((catKey) => {
                      const isActive = activeCategoryFilter === catKey;
                      const catInfo = catalog[catKey];
                      const countInCat = selectedInterests.filter((s) => s.startsWith(`${catKey}.`)).length;
                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => setActiveCategoryFilter(catKey)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '999px',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            border: isActive ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                            background: isActive ? 'var(--coral)' : '#ffffff',
                            color: isActive ? '#ffffff' : '#6a6158',
                            cursor: 'pointer',
                          }}
                        >
                          {catInfo?.label || catKey} {countInCat > 0 && `(${countInCat})`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Chips for the Active Category */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      maxHeight: '280px',
                      overflowY: 'auto',
                      padding: '4px',
                    }}
                  >
                    {catalog[activeCategoryFilter]?.items.map((item) => {
                      const isSelected = selectedInterests.includes(item.slug);
                      return (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => toggleInterest(item.slug)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '999px',
                            fontSize: '13.5px',
                            fontWeight: '500',
                            border: isSelected ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                            background: isSelected ? 'var(--peach)' : '#ffffff',
                            color: isSelected ? 'var(--coral-dark)' : 'var(--ink)',
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}{item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SCREEN 3: Rank Top 3 */}
              {screen === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Selected Top 3 Ordered List */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', marginBottom: '8px' }}>
                      Your Top 3 (order matters):
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[0, 1, 2].map((idx) => {
                        const slug = top3[idx];
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '12px',
                              border: slug ? '1.5px solid var(--coral)' : '1px dashed #ded8d0',
                              background: slug ? 'var(--peach)' : '#fbf8f5',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: 'var(--coral)',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {idx + 1}
                              </span>
                              <strong style={{ fontSize: '14px', color: slug ? 'var(--coral-dark)' : '#999' }}>
                                {slug ? getInterestLabel(slug) : 'Select an interest below'}
                              </strong>
                            </div>

                            {slug && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveTop3Order(idx, 'up')}
                                  style={{
                                    border: 'none',
                                    background: '#ffffff',
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                    opacity: idx === 0 ? 0.3 : 1,
                                  }}
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === top3.length - 1}
                                  onClick={() => moveTop3Order(idx, 'down')}
                                  style={{
                                    border: 'none',
                                    background: '#ffffff',
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    cursor: idx === top3.length - 1 ? 'not-allowed' : 'pointer',
                                    opacity: idx === top3.length - 1 ? 0.3 : 1,
                                  }}
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleTop3(slug)}
                                  style={{
                                    border: 'none',
                                    background: '#ffffff',
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    cursor: 'pointer',
                                    color: '#b33',
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pool of selected interests to pick from */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#6a6158' }}>
                      Click to add or remove from your Top 3:
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        padding: '4px',
                      }}
                    >
                      {selectedInterests.map((slug) => {
                        const isTop = top3.includes(slug);
                        return (
                          <button
                            key={slug}
                            type="button"
                            onClick={() => toggleTop3(slug)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '999px',
                              fontSize: '13px',
                              fontWeight: '500',
                              border: isTop ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                              background: isTop ? 'var(--peach)' : '#ffffff',
                              color: isTop ? 'var(--coral-dark)' : 'var(--ink)',
                              cursor: 'pointer',
                            }}
                          >
                            {isTop ? `★ ${top3.indexOf(slug) + 1}. ` : '+ '}
                            {getInterestLabel(slug)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons: Back, Next, Skip for now */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleBack}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '999px',
                    border: '1px solid #ded8d0',
                    background: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6a6158',
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isSaving}
                  className="auth-submit-btn"
                  style={{ flex: 1 }}
                >
                  {isSaving
                    ? 'Saving...'
                    : screen === 3
                    ? 'Save & Continue to Questions →'
                    : 'Continue →'}
                </button>
              </div>

              {/* Skip for now option */}
              <div style={{ textAlign: 'center', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSaving}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '13px',
                    color: '#8a7e75',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Skip for now (you can complete this anytime)
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
