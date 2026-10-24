import React, { useState, useEffect } from 'react';
import { api, CategoryQuestionData } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface InterestQuestionsPageProps {
  onNavigate: (path: string) => void;
}

export default function InterestQuestionsPage({ onNavigate }: InterestQuestionsPageProps) {
  const { refreshUser } = useAuth();

  const [categoriesQuestions, setCategoriesQuestions] = useState<CategoryQuestionData[]>([]);
  const [currentCatIndex, setCurrentCatIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-category answers state: map of category -> { q1, q2, sharePreference }
  const [answers, setAnswers] = useState<Record<string, { q1: string; q2: string; sharePreference: string }>>({});

  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await api.onboarding.getQuestions();
        if (res.categoriesQuestions) {
          setCategoriesQuestions(res.categoriesQuestions);

          // Populate existing answers if any
          const initialAnswers: Record<string, { q1: string; q2: string; sharePreference: string }> = {};
          res.categoriesQuestions.forEach((cq) => {
            initialAnswers[cq.category] = {
              q1: cq.answer?.q1 || '',
              q2: cq.answer?.q2 || '',
              sharePreference: cq.answer?.sharePreference || '',
            };
          });
          setAnswers(initialAnswers);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load your questions.');
      } finally {
        setIsLoading(false);
      }
    }

    loadQuestions();
  }, []);

  const currentCategoryData = categoriesQuestions[currentCatIndex];
  const totalCategories = categoriesQuestions.length;

  function handleSelectAnswer(questionKey: 'q1' | 'q2' | 'sharePreference', value: string) {
    if (!currentCategoryData) return;
    const cat = currentCategoryData.category;
    setAnswers((prev) => ({
      ...prev,
      [cat]: {
        ...(prev[cat] || { q1: '', q2: '', sharePreference: '' }),
        [questionKey]: value,
      },
    }));
    setError(null);
  }

  async function handleNext() {
    if (!currentCategoryData) return;
    const cat = currentCategoryData.category;
    const currentAns = answers[cat] || { q1: '', q2: '', sharePreference: '' };

    // Validate that questions are answered unless skippable
    const q1 = currentCategoryData.questions[0];
    const q2 = currentCategoryData.questions[1];

    if (!q1?.skippable && !currentAns.q1) {
      setError('Please answer the first question (or tap an option).');
      return;
    }
    if (!q2?.skippable && !currentAns.q2) {
      setError('Please answer the second question.');
      return;
    }
    if (!currentAns.sharePreference) {
      setError('Please answer how much you want a partner to share this interest.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Save answer for this category
      await api.onboarding.saveAnswer({
        category: cat,
        q1: currentAns.q1,
        q2: currentAns.q2,
        sharePreference: currentAns.sharePreference,
      });

      // If more categories remain, advance to next category screen
      if (currentCatIndex < totalCategories - 1) {
        setCurrentCatIndex((prev) => prev + 1);
      } else {
        // Completed all categories!
        await refreshUser();
        onNavigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Could not save your answers.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleBack() {
    setError(null);
    if (currentCatIndex > 0) {
      setCurrentCatIndex((prev) => prev - 1);
    } else {
      onNavigate('/onboarding/interests');
    }
  }

  if (isLoading) {
    return (
      <div className="auth-page-root">
        <div style={{ textAlign: 'center', color: '#5d534b' }}>
          <p>Generating thoughtful questions for your passions...</p>
        </div>
      </div>
    );
  }

  if (!currentCategoryData) {
    return (
      <div className="auth-page-root">
        <div style={{ textAlign: 'center', color: '#5d534b' }}>
          <p>No questions found. Please make sure you have selected interests.</p>
          <button
            type="button"
            onClick={() => onNavigate('/onboarding/interests')}
            className="auth-submit-btn"
            style={{ marginTop: '16px' }}
          >
            Go to Interests
          </button>
        </div>
      </div>
    );
  }

  const currentAns = answers[currentCategoryData.category] || { q1: '', q2: '', sharePreference: '' };
  const q1 = currentCategoryData.questions[0];
  const q2 = currentCategoryData.questions[1];

  return (
    <div className="auth-page-root">
      <main className="auth-page-main">
        <div className="auth-page-container signup-container">
          {/* Left Column: Visual Brand Story & Progress */}
          <section className="auth-page-visual">
            <div className="auth-visual-inner">
              <div className="auth-visual-badge">Step 3 of 3: Deep Compatibility</div>
              <h2>How you experience what you love.</h2>
              <p>
                Two people can both love music or travel, but live it very differently. These single-tap reflections bring out your genuine personal rhythm.
              </p>

              <div className="auth-steps-list">
                <div className="auth-step-item">
                  <span className="auth-step-num">✓</span>
                  <div>
                    <strong>Profile completed</strong>
                    <p>Orientation, priorities, and lifestyle.</p>
                  </div>
                </div>
                <div className="auth-step-item">
                  <span className="auth-step-num">✓</span>
                  <div>
                    <strong>Interests selected</strong>
                    <p>Top categories and ranked passions.</p>
                  </div>
                </div>
                <div className="auth-step-item">
                  <span className="auth-step-num" style={{ background: 'var(--coral)' }}>3</span>
                  <div>
                    <strong style={{ color: 'var(--coral)' }}>Thoughtful questions</strong>
                    <p>Category {currentCatIndex + 1} of {totalCategories}: {currentCategoryData.categoryLabel}</p>
                  </div>
                </div>
              </div>

              <div className="auth-visual-quote-static">
                <b>“</b>
                <span>
                  The questions weren't a test — they just captured who I really am on a free Sunday afternoon. <b>”</b>
                </span>
              </div>
            </div>
          </section>

          {/* Right Column: Questions Form Card */}
          <section className="auth-page-form-wrap">
            <div className="auth-form-container" style={{ maxWidth: '520px' }}>
              {/* Header with Progress Bar */}
              <div className="auth-form-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="auth-form-tag">
                    Category {currentCatIndex + 1} of {totalCategories}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--coral)' }}>
                    {currentCategoryData.categoryLabel}
                  </span>
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
                      width: `${((currentCatIndex + 1) / totalCategories) * 100}%`,
                      background: 'var(--coral)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>
                  {currentCategoryData.categoryLabel}
                </h1>
                <p style={{ fontSize: '14.5px' }}>
                  Single-tap your preferred answers. Take your time.
                </p>
              </div>

              {error && (
                <div className="auth-alert error" role="alert" style={{ marginBottom: '16px' }}>
                  <span>⚠</span>
                  <div>{error}</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* QUESTION 1 */}
                {q1 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)' }}>
                        1. {q1.text}
                      </label>
                      {q1.skippable && (
                        <span style={{ fontSize: '11.5px', color: '#888' }}>(Optional)</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {q1.options.map((opt) => {
                        const isSelected = currentAns.q1 === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectAnswer('q1', opt)}
                            style={{
                              padding: '9px 16px',
                              borderRadius: '999px',
                              fontSize: '13.5px',
                              fontWeight: '600',
                              border: isSelected ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                              background: isSelected ? 'var(--peach)' : '#ffffff',
                              color: isSelected ? 'var(--coral-dark)' : 'var(--ink)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isSelected ? '✓ ' : ''}{opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* QUESTION 2 */}
                {q2 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)' }}>
                        2. {q2.text}
                      </label>
                      {q2.skippable && (
                        <span style={{ fontSize: '11.5px', color: '#888' }}>(Optional)</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {q2.options.map((opt) => {
                        const isSelected = currentAns.q2 === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectAnswer('q2', opt)}
                            style={{
                              padding: '9px 16px',
                              borderRadius: '999px',
                              fontSize: '13.5px',
                              fontWeight: '600',
                              border: isSelected ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                              background: isSelected ? 'var(--peach)' : '#ffffff',
                              color: isSelected ? 'var(--coral-dark)' : 'var(--ink)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isSelected ? '✓ ' : ''}{opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SHARED QUESTION */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--ink)', marginBottom: '8px' }}>
                    3. How much do you want a partner to share this interest?
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'must-have', label: 'Must have' },
                      { id: 'nice-to-have', label: 'Nice to have' },
                      { id: 'doesnt-matter', label: "Doesn't matter" },
                    ].map((opt) => {
                      const isSelected = currentAns.sharePreference === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectAnswer('sharePreference', opt.id)}
                          style={{
                            padding: '9px 16px',
                            borderRadius: '999px',
                            fontSize: '13.5px',
                            fontWeight: '600',
                            border: isSelected ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                            background: isSelected ? 'var(--peach)' : '#ffffff',
                            color: isSelected ? 'var(--coral-dark)' : 'var(--ink)',
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected ? '✓ ' : ''}{opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button
                  type="button"
                  onClick={handleBack}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '999px',
                    border: '1px solid #ded8d0',
                    background: '#ffffff',
                    fontSize: '14.5px',
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
                    : currentCatIndex === totalCategories - 1
                    ? 'Finish & Go to Dashboard →'
                    : 'Next Category →'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
