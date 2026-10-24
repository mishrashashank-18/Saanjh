import React, { useState, useEffect } from 'react';
import { api, ProfileData, PartnerPriorities } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ProfileOnboardingPageProps {
  onNavigate: (path: string) => void;
}

const allLanguages = [
  'English', 'Hindi', 'Marathi', 'Gujarati', 'Bengali', 'Tamil',
  'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Other'
];

export default function ProfileOnboardingPage({ onNavigate }: ProfileOnboardingPageProps) {
  const { user, refreshUser, showToast } = useAuth();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  // Step A: Who you want to meet
  const [genderPreference, setGenderPreference] = useState<string[]>(['everyone']);
  const [minAge, setMinAge] = useState<number>(21);
  const [maxAge, setMaxAge] = useState<number>(32);
  const [relationshipGoal, setRelationshipGoal] = useState<string>('long-term');

  // Step B: Where and how
  const [city, setCity] = useState<string>('');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(25);
  const [languages, setLanguages] = useState<string[]>(['English', 'Hindi']);
  const [langSearch, setLangSearch] = useState<string>('');

  // Step C: Partner Priorities (1-10)
  const [partnerPriorities, setPartnerPriorities] = useState<PartnerPriorities>({
    attractiveness: 7,
    sincerity: 9,
    intelligence: 8,
    humour: 8,
    ambition: 7,
    sharedInterests: 8,
  });

  // Step D: Lifestyle
  const [goingOutFrequency, setGoingOutFrequency] = useState<string>('sometimes');
  const [culturalImportance, setCulturalImportance] = useState<string>('somewhat');
  const [dealBreakers, setDealBreakers] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Load existing profile if any (resuming where left off)
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.onboarding.getProfile();
        if (res.profile) {
          const p = res.profile;
          if (p.genderPreference?.length) setGenderPreference(p.genderPreference);
          if (p.ageRange) {
            setMinAge(p.ageRange.min || 21);
            setMaxAge(p.ageRange.max || 32);
          }
          if (p.relationshipGoal) setRelationshipGoal(p.relationshipGoal);
          if (p.city) setCity(p.city);
          if (p.maxDistanceKm) setMaxDistanceKm(p.maxDistanceKm);
          if (p.languages?.length) setLanguages(p.languages);
          if (p.partnerPriorities) setPartnerPriorities(p.partnerPriorities);
          if (p.goingOutFrequency) setGoingOutFrequency(p.goingOutFrequency);
          if (p.culturalImportance) setCulturalImportance(p.culturalImportance);
          if (p.dealBreakers) setDealBreakers(p.dealBreakers);
          if (p.notes) setNotes(p.notes);
        }
      } catch (err: any) {
        console.warn('Could not pre-load profile:', err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  // Auto-save helper
  async function persistProfile(isFinal: boolean = false) {
    setIsSaving(true);
    setError(null);
    try {
      const payload: Partial<ProfileData> = {
        genderPreference,
        ageRange: { min: Number(minAge), max: Number(maxAge) },
        relationshipGoal,
        city: city.trim(),
        maxDistanceKm: Number(maxDistanceKm),
        languages,
        partnerPriorities,
        goingOutFrequency,
        culturalImportance: culturalImportance || undefined,
        dealBreakers: dealBreakers.trim(),
        notes: notes.trim(),
        isFinalSubmit: isFinal,
      };

      const res = await api.onboarding.saveProfile(payload);
      if (isFinal) {
        await refreshUser();
        onNavigate('/onboarding/interests');
      }
      return res;
    } catch (err: any) {
      setError(err.message || 'Could not save profile changes.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  // Multi-select toggle for gender preference
  function toggleGender(val: string) {
    if (val === 'everyone') {
      setGenderPreference(['everyone']);
      return;
    }
    const filtered = genderPreference.filter((g) => g !== 'everyone');
    if (filtered.includes(val)) {
      const next = filtered.filter((g) => g !== val);
      setGenderPreference(next.length ? next : ['everyone']);
    } else {
      setGenderPreference([...filtered, val]);
    }
  }

  // Multi-select toggle for languages
  function toggleLanguage(lang: string) {
    if (languages.includes(lang)) {
      if (languages.length > 1) {
        setLanguages(languages.filter((l) => l !== lang));
      } else {
        showToast('Please keep at least one language selected', 'info');
      }
    } else {
      setLanguages([...languages, lang]);
    }
  }

  function handlePriorityChange(key: keyof PartnerPriorities, value: number) {
    setPartnerPriorities((prev) => ({ ...prev, [key]: value }));
  }

  async function handleNext() {
    if (currentStep === 1) {
      if (!relationshipGoal) {
        setError('Please select what relationship you are looking for.');
        return;
      }
      await persistProfile(false);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!city.trim()) {
        setError('Please specify your current city or area.');
        return;
      }
      if (languages.length === 0) {
        setError('Please select at least one language.');
        return;
      }
      await persistProfile(false);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      await persistProfile(false);
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!goingOutFrequency) {
        setError('Please select how often you like going out socially.');
        return;
      }
      await persistProfile(true);
    }
  }

  function handleBack() {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    } else {
      onNavigate('/');
    }
  }

  if (isLoading) {
    return (
      <div className="auth-page-root">
        <div style={{ textAlign: 'center', color: '#5d534b' }}>
          <p>Loading your profile setup...</p>
        </div>
      </div>
    );
  }

  const filteredLangs = allLanguages.filter((l) =>
    l.toLowerCase().includes(langSearch.toLowerCase())
  );

  return (
    <div className="auth-page-root">
      <main className="auth-page-main">
        <div className="auth-page-container signup-container">
          {/* Left Column: Visual Brand Story & Progress */}
          <section className="auth-page-visual">
            <div className="auth-visual-inner">
              <div className="auth-visual-badge">Step 1 of 3: Profile</div>
              <h2>Tell us what truly matters to you.</h2>
              <p>
                We look far beyond superficial bios. Your answers shape who you see and why you align with them.
              </p>

              <div className="auth-steps-list">
                <div className="auth-step-item">
                  <span className="auth-step-num" style={{ background: 'var(--coral)' }}>1</span>
                  <div>
                    <strong style={{ color: 'var(--coral)' }}>Create your profile</strong>
                    <p>Who you want to meet, location radius, priorities, and lifestyle.</p>
                  </div>
                </div>
                <div className="auth-step-item" style={{ opacity: 0.65 }}>
                  <span className="auth-step-num" style={{ background: '#c8bfb8' }}>2</span>
                  <div>
                    <strong>Pick your interests</strong>
                    <p>13 categories, 251 passions. Choose what you love most.</p>
                  </div>
                </div>
                <div className="auth-step-item" style={{ opacity: 0.65 }}>
                  <span className="auth-step-num" style={{ background: '#c8bfb8' }}>3</span>
                  <div>
                    <strong>Answer thoughtful questions</strong>
                    <p>Single-tap questions generated for your top categories.</p>
                  </div>
                </div>
              </div>

              <div className="auth-visual-quote-static">
                <b>“</b>
                <span>
                  Rating what matters gave me matches that actually respected my pace of life. <b>”</b>
                </span>
              </div>
            </div>
          </section>

          {/* Right Column: Multi-step Profile Card */}
          <section className="auth-page-form-wrap">
            <div className="auth-form-container" style={{ maxWidth: '500px' }}>
              {/* Header with Progress Bar */}
              <div className="auth-form-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="auth-form-tag">
                    Profile Part {currentStep} of 4
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--coral)' }}>
                    {currentStep === 1 && 'Who You Want to Meet'}
                    {currentStep === 2 && 'Where & How'}
                    {currentStep === 3 && 'Partner Priorities'}
                    {currentStep === 4 && 'Lifestyle Rhythms'}
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
                    marginBottom: '18px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(currentStep / 4) * 100}%`,
                      background: 'var(--coral)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>

                <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>
                  {currentStep === 1 && 'Who would you like to meet?'}
                  {currentStep === 2 && 'Where are you based?'}
                  {currentStep === 3 && 'What matters to you in a partner?'}
                  {currentStep === 4 && 'Your lifestyle and values'}
                </h1>
                <p style={{ fontSize: '14.5px' }}>
                  {currentStep === 1 && 'Share your orientation, age preferences, and relationship intentions.'}
                  {currentStep === 2 && 'Help us suggest people within your geographic and linguistic comfort zone.'}
                  {currentStep === 3 && 'Rate each dimension from 1 (not important) to 10 (essential).'}
                  {currentStep === 4 && 'Help us understand your everyday rhythm and social habits.'}
                </p>
              </div>

              {error && (
                <div className="auth-alert error" role="alert" style={{ marginBottom: '16px' }}>
                  <span>⚠</span>
                  <div>{error}</div>
                </div>
              )}

              {/* STEP A: Who you want to meet */}
              {currentStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      Which gender(s) would you like to be matched with?
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'women', label: 'Women' },
                        { id: 'men', label: 'Men' },
                        { id: 'non-binary', label: 'Non-binary' },
                        { id: 'everyone', label: 'Everyone' },
                      ].map((item) => {
                        const isSelected = genderPreference.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleGender(item.id)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '999px',
                              fontSize: '14px',
                              fontWeight: '600',
                              border: isSelected ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                              background: isSelected ? 'var(--peach)' : '#ffffff',
                              color: isSelected ? 'var(--coral-dark)' : 'var(--ink)',
                              cursor: 'pointer',
                            }}
                          >
                            {isSelected ? '✓ ' : ''}{item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      What age range are you comfortable with? ({minAge} – {maxAge} years)
                    </label>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '12px', color: '#6a6158' }}>Min Age: {minAge}</span>
                        <input
                          type="range"
                          min="18"
                          max="60"
                          value={minAge}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val <= maxAge) setMinAge(val);
                          }}
                          style={{ width: '100%', accentColor: 'var(--coral)' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '12px', color: '#6a6158' }}>Max Age: {maxAge}</span>
                        <input
                          type="range"
                          min="18"
                          max="70"
                          value={maxAge}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val >= minAge) setMaxAge(val);
                          }}
                          style={{ width: '100%', accentColor: 'var(--coral)' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      What kind of relationship are you looking for?
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { id: 'long-term', label: 'Long-term relationship' },
                        { id: 'casual', label: 'Casual dating' },
                        { id: 'friendship', label: 'Meaningful friendship' },
                        { id: 'unsure', label: 'Still figuring it out' },
                      ].map((item) => {
                        const isSelected = relationshipGoal === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setRelationshipGoal(item.id)}
                            style={{
                              padding: '12px',
                              textAlign: 'left',
                              borderRadius: '14px',
                              fontSize: '13.5px',
                              fontWeight: '600',
                              border: isSelected ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                              background: isSelected ? 'var(--peach)' : '#ffffff',
                              color: isSelected ? 'var(--coral-dark)' : 'var(--ink)',
                              cursor: 'pointer',
                            }}
                          >
                            {isSelected ? '✓ ' : ''}{item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP B: Where and how */}
              {currentStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      What city or area do you live in? *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bangalore, South Delhi, Bandra West"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1.5px solid #ded8d0',
                        borderRadius: '12px',
                        fontSize: '15px',
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      How far are you willing to travel to meet someone?
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {[5, 10, 25, 50, 100].map((km) => {
                        const isSelected = maxDistanceKm === km;
                        return (
                          <button
                            key={km}
                            type="button"
                            onClick={() => setMaxDistanceKm(km)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '999px',
                              fontSize: '14px',
                              fontWeight: '600',
                              border: isSelected ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                              background: isSelected ? 'var(--peach)' : '#ffffff',
                              color: isSelected ? 'var(--coral-dark)' : 'var(--ink)',
                              cursor: 'pointer',
                            }}
                          >
                            {km === 100 ? '100+ km' : `${km} km`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600' }}>
                        Which languages are you comfortable speaking? *
                      </label>
                      <span style={{ fontSize: '12px', color: 'var(--coral)' }}>
                        {languages.length} selected
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Search languages..."
                      value={langSearch}
                      onChange={(e) => setLangSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 14px',
                        border: '1px solid #ded8d0',
                        borderRadius: '8px',
                        fontSize: '13px',
                        marginBottom: '10px',
                      }}
                    />

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '130px', overflowY: 'auto' }}>
                      {filteredLangs.map((lang) => {
                        const isSelected = languages.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => toggleLanguage(lang)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '999px',
                              fontSize: '13px',
                              fontWeight: '500',
                              border: isSelected ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                              background: isSelected ? 'var(--peach)' : '#ffffff',
                              color: isSelected ? 'var(--coral-dark)' : 'var(--ink)',
                              cursor: 'pointer',
                            }}
                          >
                            {isSelected ? '✓ ' : '+ '}{lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP C: What matters to you in a partner */}
              {currentStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { key: 'attractiveness' as const, label: 'Attractiveness & Chemistry' },
                    { key: 'sincerity' as const, label: 'Sincerity & Honesty' },
                    { key: 'intelligence' as const, label: 'Intelligence & Wit' },
                    { key: 'humour' as const, label: 'Sense of Humour & Playfulness' },
                    { key: 'ambition' as const, label: 'Ambition & Drive' },
                    { key: 'sharedInterests' as const, label: 'Shared Interests & Lifestyle' },
                  ].map((attr) => (
                    <div
                      key={attr.key}
                      style={{
                        background: '#ffffff',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid #ded8d0',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{attr.label}</span>
                        <strong style={{ color: 'var(--coral)', fontSize: '14px' }}>
                          {partnerPriorities[attr.key]} / 10
                        </strong>
                      </div>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                          const isSelected = partnerPriorities[attr.key] === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handlePriorityChange(attr.key, num)}
                              style={{
                                flex: 1,
                                height: '28px',
                                fontSize: '12px',
                                fontWeight: '700',
                                border: isSelected ? '1.5px solid var(--coral)' : '1px solid #eee',
                                background: isSelected ? 'var(--coral)' : '#f9f6f2',
                                color: isSelected ? '#ffffff' : '#6a6158',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STEP D: Lifestyle */}
              {currentStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      How often do you like going out socially? *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { id: 'rarely', label: 'Rarely (Homebody)' },
                        { id: 'sometimes', label: 'Sometimes (1-2x week)' },
                        { id: 'often', label: 'Often (3-4x week)' },
                        { id: 'very-often', label: 'Very often (Social butterfly)' },
                      ].map((item) => {
                        const isSelected = goingOutFrequency === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setGoingOutFrequency(item.id)}
                            style={{
                              padding: '10px 12px',
                              textAlign: 'left',
                              borderRadius: '12px',
                              fontSize: '13px',
                              fontWeight: '600',
                              border: isSelected ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                              background: isSelected ? 'var(--peach)' : '#ffffff',
                              color: isSelected ? 'var(--coral-dark)' : 'var(--ink)',
                              cursor: 'pointer',
                            }}
                          >
                            {isSelected ? '✓ ' : ''}{item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      How important is it that a partner shares your cultural or racial background?
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'not-important', label: 'Not important' },
                        { id: 'a-little', label: 'A little' },
                        { id: 'somewhat', label: 'Somewhat' },
                        { id: 'very-important', label: 'Very important' },
                        { id: 'prefer-not-to-say', label: 'Prefer not to say' },
                      ].map((item) => {
                        const isSelected = culturalImportance === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setCulturalImportance(item.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '999px',
                              fontSize: '13px',
                              fontWeight: '500',
                              border: isSelected ? '1.5px solid var(--coral)' : '1px solid #ded8d0',
                              background: isSelected ? 'var(--peach)' : '#ffffff',
                              color: isSelected ? 'var(--coral-dark)' : 'var(--ink)',
                              cursor: 'pointer',
                            }}
                          >
                            {isSelected ? '✓ ' : ''}{item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      Any important lifestyle preferences or deal-breakers? (Optional)
                    </label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      placeholder="e.g. Non-smoker, loves animals, values weekends in nature..."
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

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                      Anything else the app should know when suggesting people? (Optional)
                    </label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      placeholder="e.g. Open to long distance, looking to move cities next year..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1.5px solid #ded8d0',
                        borderRadius: '12px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons: Back + Continue */}
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
                    : currentStep === 4
                    ? 'Complete Profile & Pick Interests →'
                    : 'Continue →'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
