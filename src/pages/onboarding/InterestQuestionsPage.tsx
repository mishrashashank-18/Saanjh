import React, { useState, useEffect } from 'react';
import { api, CategoryQuestionData, QuestionItem } from '../../services/api';
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

  // Map of category -> { [questionIndex: number]: selectedValueString }
  const [answers, setAnswers] = useState<Record<string, Record<number, string>>>({});

  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await api.onboarding.getQuestions();
        if (res.categoriesQuestions && res.categoriesQuestions.length > 0) {
          setCategoriesQuestions(res.categoriesQuestions);

          // Populate existing answers if any
          const initialAnswers: Record<string, Record<number, string>> = {};
          let firstUnansweredIdx = 0;
          let foundUnanswered = false;

          res.categoriesQuestions.forEach((cq, catIdx) => {
            initialAnswers[cq.category] = {};
            let isCategorySkipped = false;
            let answeredCount = 0;

            if (cq.answers && cq.answers.length > 0) {
              cq.answers.forEach((ans: any) => {
                if (ans.skipped || ans.selectedValue === 'skipped') {
                  isCategorySkipped = true;
                } else if (ans.questionIndex !== undefined && ans.selectedValue) {
                  initialAnswers[cq.category][ans.questionIndex] = ans.selectedValue;
                  answeredCount++;
                }
              });
            } else if (cq.answer) {
              if (cq.answer.q1 && cq.answer.q1 !== 'skipped') {
                initialAnswers[cq.category][0] = cq.answer.q1;
                answeredCount++;
              }
              if (cq.answer.q2 && cq.answer.q2 !== 'skipped') {
                initialAnswers[cq.category][1] = cq.answer.q2;
                answeredCount++;
              }
              if (cq.answer.sharePreference && cq.answer.sharePreference !== 'skipped') {
                initialAnswers[cq.category][4] = cq.answer.sharePreference;
                answeredCount++;
              }
            }

            // Find first category that was skipped or not fully answered
            if (!foundUnanswered && (isCategorySkipped || answeredCount < 4)) {
              firstUnansweredIdx = catIdx;
              foundUnanswered = true;
            }
          });

          setAnswers(initialAnswers);
          setCurrentCatIndex(firstUnansweredIdx);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load your questions.');
      } finally {
        setIsLoading(false);
      }
    }

    loadQuestions();
  }, []);

  const totalCategories = categoriesQuestions.length;
  const currentCategoryData = categoriesQuestions[currentCatIndex];

  function getOptionLabel(opt: any): string {
    if (typeof opt === 'object' && opt !== null) return opt.label;
    return String(opt);
  }

  function getOptionValue(opt: any): string {
    if (typeof opt === 'object' && opt !== null) return opt.value;
    return String(opt);
  }

  function handleSelectAnswer(questionIndex: number, value: string) {
    if (!currentCategoryData) return;
    const cat = currentCategoryData.category;
    setAnswers((prev) => ({
      ...prev,
      [cat]: {
        ...(prev[cat] || {}),
        [questionIndex]: value,
      },
    }));
    setError(null);
  }

  async function handleNext() {
    if (!currentCategoryData) return;
    const cat = currentCategoryData.category;
    const catAns = answers[cat] || {};
    const questions = currentCategoryData.questions || [];

    // Validate required questions (Q1 to Q5)
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.skippable && (!catAns[i] || catAns[i].trim() === '')) {
        setError(`Please select an answer for question ${i + 1}.`);
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      const payloadAnswers = questions.map((q: QuestionItem, idx: number) => ({
        questionIndex: idx,
        questionId: q.questionId || `${cat}_q${idx + 1}`,
        dimension: q.dimension || (idx === 4 ? 'shared_activity' : 'intensity'),
        selectedValue: catAns[idx] || (q.skippable ? 'prefer_not_to_say' : ''),
        skipped: false,
      }));

      const q5Value = catAns[4] || '';
      const normalizedSharePref =
        q5Value === 'must_have' || q5Value === 'must-have'
          ? 'must-have'
          : q5Value === 'nice_to_have' || q5Value === 'nice-to-have'
          ? 'nice-to-have'
          : 'doesnt-matter';

      await api.onboarding.saveAnswer({
        category: cat,
        answers: payloadAnswers,
        sharePreference: normalizedSharePref,
        skipped: false,
      });

      if (currentCatIndex < totalCategories - 1) {
        setCurrentCatIndex((prev) => prev + 1);
      } else {
        await refreshUser();
        onNavigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Could not save your answers.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSkipCategory() {
    if (!currentCategoryData) return;
    const cat = currentCategoryData.category;
    const questions = currentCategoryData.questions || [];

    setIsSaving(true);
    setError(null);

    try {
      const payloadAnswers = questions.map((q: QuestionItem, idx: number) => ({
        questionIndex: idx,
        questionId: q.questionId || `${cat}_q${idx + 1}`,
        dimension: q.dimension || 'intensity',
        selectedValue: 'skipped',
        skipped: true,
      }));

      await api.onboarding.saveAnswer({
        category: cat,
        answers: payloadAnswers,
        sharePreference: '',
        skipped: true,
      });

      if (currentCatIndex < totalCategories - 1) {
        setCurrentCatIndex((prev) => prev + 1);
      } else {
        await refreshUser();
        onNavigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Could not skip category.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFinishLater() {
    await refreshUser();
    onNavigate('/dashboard');
  }

  function handleBack() {
    setError(null);
    if (currentCatIndex > 0) {
      setCurrentCatIndex((prev) => prev - 1);
    } else {
      onNavigate('/onboarding/interests');
    }
  }

  // Friendly skeleton loading state with full visual continuity & attractive image
  if (isLoading) {
    return (
      <div className="auth-page-root">
        <main className="auth-page-main">
          <div className="auth-page-container signup-container">
            {/* Left Column: Consistent Visual Brand Story */}
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
                      <p>Chosen categories and passions.</p>
                    </div>
                  </div>
                  <div className="auth-step-item">
                    <span className="auth-step-num" style={{ background: 'var(--coral)' }}>3</span>
                    <div>
                      <strong style={{ color: 'var(--coral)' }}>Thoughtful questions</strong>
                      <p>Tailoring prompts to your passions...</p>
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

            {/* Right Column: Attractive Loading Phase Card */}
            <section className="auth-page-form-wrap">
              <div className="auth-form-container" style={{ maxWidth: '520px' }}>
                {/* Header Tag */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="auth-form-tag">
                    Step 3 of 3: Reflections
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--coral)' }}>
                    Personalizing...
                  </span>
                </div>

                {/* Shimmer progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: '#f2e6dc',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    marginBottom: '18px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: '65%',
                      background: 'linear-gradient(90deg, var(--coral), var(--coral-dark))',
                      borderRadius: '999px',
                      animation: 'pulse 1.6s infinite ease-in-out',
                    }}
                  />
                </div>

                {/* Engaging Banner Image */}
                <div
                  style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    height: '160px',
                    marginBottom: '20px',
                    position: 'relative',
                    boxShadow: '0 8px 24px rgba(45, 30, 20, 0.08)',
                    border: '1px solid rgba(235, 220, 208, 0.8)',
                  }}
                >
                  <img
                    src="/images/notebook-reference.png"
                    alt="Thoughtful reflections"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(35, 25, 18, 0.65) 0%, rgba(35, 25, 18, 0.15) 50%, transparent 100%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '14px 16px',
                    }}
                  >
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.94)',
                        color: 'var(--coral-dark)',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        letterSpacing: '0.4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    >
                      Curating Deep Compatibility Prompts
                    </span>
                  </div>
                </div>

                <h1 style={{ fontSize: '24px', marginBottom: '6px' }}>
                  Preparing questions for you...
                </h1>
                <p style={{ fontSize: '14.5px', color: '#6a6158', marginBottom: '22px' }}>
                  Tailoring thoughtful prompts to your chosen passions and conversation style.
                </p>

                {/* Warm Animated Skeleton Question Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      border: '1px solid #ebdcd0',
                      background: '#fffdfa',
                      animation: 'pulse 1.8s infinite ease-in-out',
                    }}
                  >
                    <div style={{ height: '14px', width: '70%', background: '#f0e5dc', borderRadius: '6px', marginBottom: '12px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ height: '32px', width: '45%', background: '#faefe6', borderRadius: '999px' }} />
                      <div style={{ height: '32px', width: '45%', background: '#faefe6', borderRadius: '999px' }} />
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      border: '1px solid #ebdcd0',
                      background: '#fffdfa',
                      opacity: 0.65,
                    }}
                  >
                    <div style={{ height: '14px', width: '55%', background: '#f0e5dc', borderRadius: '6px', marginBottom: '12px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ height: '32px', width: '40%', background: '#faefe6', borderRadius: '999px' }} />
                      <div style={{ height: '32px', width: '40%', background: '#faefe6', borderRadius: '999px' }} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  if (!currentCategoryData) {
    return (
      <div className="auth-page-root">
        <div style={{ textAlign: 'center', color: '#5d534b', padding: '40px' }}>
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

  const cat = currentCategoryData.category;
  const currentCatAnswers = answers[cat] || {};
  const questions = currentCategoryData.questions || [];

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
                    <p>Chosen categories and passions.</p>
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
            <div className="auth-form-container" style={{ maxWidth: '540px' }}>
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

                {/* Category Navigation Pills */}
                {totalCategories > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      overflowX: 'auto',
                      paddingBottom: '6px',
                      marginBottom: '12px',
                    }}
                  >
                    {categoriesQuestions.map((cq, idx) => {
                      const isSelected = idx === currentCatIndex;
                      const catAns = answers[cq.category] || {};
                      const answeredCount = Object.values(catAns).filter((v) => v && v !== 'skipped').length;
                      const isComplete = answeredCount >= 4;
                      return (
                        <button
                          key={cq.category}
                          type="button"
                          onClick={() => {
                            setError(null);
                            setCurrentCatIndex(idx);
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            border: isSelected ? '1.5px solid var(--coral)' : '1px solid #ebdcd0',
                            background: isSelected ? 'var(--coral)' : isComplete ? 'var(--peach)' : '#ffffff',
                            color: isSelected ? '#ffffff' : isComplete ? 'var(--coral-dark)' : 'var(--ink)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isComplete ? '✓ ' : ''}{cq.categoryLabel}
                        </button>
                      );
                    })}
                  </div>
                )}

                <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>
                  {currentCategoryData.categoryLabel}
                </h1>
                <p style={{ fontSize: '14.5px', marginBottom: '4px' }}>
                  Single-tap your preferred answers. Take your time.
                </p>
                <p style={{ fontSize: '12px', color: '#8c827a' }}>
                  Your answers help us suggest better matches.
                </p>
              </div>

              {error && (
                <div className="auth-alert error" role="alert" style={{ marginBottom: '16px' }}>
                  <span>⚠</span>
                  <div>{error}</div>
                </div>
              )}

              {/* 5 Single-Choice Questions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {questions.map((q: QuestionItem, qIdx: number) => {
                  const selectedVal = currentCatAnswers[qIdx] || '';
                  return (
                    <div key={q.questionId || qIdx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--ink)' }}>
                          {qIdx + 1}. {q.text}
                        </label>
                        {q.skippable && (
                          <span style={{ fontSize: '11.5px', color: '#888' }}>(Optional)</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {q.options.map((opt: any) => {
                          const label = getOptionLabel(opt);
                          const value = getOptionValue(opt);
                          const isSelected = selectedVal === value;

                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => handleSelectAnswer(qIdx, value)}
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
                              {isSelected ? '✓ ' : ''}{label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Primary Action Buttons: Back, Next */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
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

              {/* Secondary Options: Skip this category & Finish later */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f2e8df',
                }}
              >
                <button
                  type="button"
                  onClick={handleSkipCategory}
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
                  Skip this category
                </button>

                <button
                  type="button"
                  onClick={handleFinishLater}
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
                  Finish later
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
