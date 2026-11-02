import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useFamilyStore } from '../store/familyStore';
import { soundFX } from '../utils/soundEffects';
import './Onboarding.css';

export function Onboarding() {
  const navigate = useNavigate();
  const isOnboarded = useFamilyStore((s) => s.isOnboarded);
  const completeOnboarding = useFamilyStore((s) => s.completeOnboarding);
  const containerRef = useRef(null);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [gender, setGender] = useState('unknown');
  const [step, setStep] = useState(0); // 0: welcome, 1: form

  useEffect(() => {
    if (isOnboarded) navigate('/app', { replace: true });
  }, [isOnboarded, navigate]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.onboarding__card',
        { opacity: 0, y: 32, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [step]);

  const handleStart = () => setStep(1);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    completeOnboarding({ name: name.trim(), birthDate, birthPlace, gender });
    navigate('/app');
  };

  return (
    <div className="onboarding" ref={containerRef}>
      <div className="onboarding__bg">
        {/* Ambient SVG decoration */}
        <svg className="onboarding__ambient" viewBox="0 0 800 600" fill="none" aria-hidden="true">
          <circle cx="400" cy="300" r="200" stroke="var(--accent)" strokeWidth="0.5" opacity="0.08" />
          <circle cx="400" cy="300" r="140" stroke="var(--accent)" strokeWidth="0.5" opacity="0.06" />
          <circle cx="400" cy="300" r="80" stroke="var(--accent)" strokeWidth="0.5" opacity="0.1" />
          <circle cx="400" cy="300" r="20" fill="var(--accent)" opacity="0.12" />
        </svg>
      </div>

      {step === 0 && (
        <div className="onboarding__card">
          <div className="onboarding__logo">
            <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="2.5" fill="var(--accent)" />
              <circle cx="4"  cy="4"  r="1.5" fill="var(--accent)" opacity="0.5" />
              <circle cx="16" cy="4"  r="1.5" fill="var(--accent)" opacity="0.5" />
              <circle cx="4"  cy="16" r="1.5" fill="var(--accent)" opacity="0.4" />
              <circle cx="16" cy="16" r="1.5" fill="var(--accent)" opacity="0.4" />
              <line x1="10" y1="10" x2="4"  y2="4"  stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
              <line x1="10" y1="10" x2="16" y2="4"  stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
              <line x1="10" y1="10" x2="4"  y2="16" stroke="var(--accent)" strokeWidth="1" opacity="0.3" />
              <line x1="10" y1="10" x2="16" y2="16" stroke="var(--accent)" strokeWidth="1" opacity="0.3" />
            </svg>
          </div>
          <p className="onboarding__eyebrow">Kinsutra</p>
          <h1 className="onboarding__welcome-title">
            Every network<br/>starts with <em>one person.</em>
          </h1>
          <p className="onboarding__welcome-sub">
            You. From there, your family story unfolds.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            <button
              className="onboarding__btn onboarding__btn--primary shimmer-btn"
              onClick={() => {
                soundFX.playPop();
                handleStart();
              }}
              id="onboarding-start-btn"
            >
              Start with me
            </button>

            <button
              type="button"
              className="onboarding__btn shimmer-btn"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-base-c)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
              onClick={() => {
                soundFX.playSuccess();
                useFamilyStore.getState().loadShowcaseFamily();
                navigate('/app');
              }}
            >
              ⚡ Explore 100M Showcase Dynasty (17 Relatives)
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="onboarding__card">
          <p className="onboarding__eyebrow">Step 1 of 1</p>
          <h1 className="onboarding__form-title">About you</h1>
          <p className="onboarding__form-sub">This creates the centre of your family graph.</p>

          <form className="onboarding__form" onSubmit={handleSubmit}>
            <div className="onboarding__field">
              <label className="onboarding__label" htmlFor="ob-name">Your full name *</label>
              <input
                id="ob-name"
                className="onboarding__input"
                type="text"
                placeholder="e.g. Bheema Sai Surya"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                autoComplete="name"
              />
            </div>

            <div className="onboarding__row">
              <div className="onboarding__field">
                <label className="onboarding__label" htmlFor="ob-birth">Birth date</label>
                <input
                  id="ob-birth"
                  className="onboarding__input"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="onboarding__field">
                <label className="onboarding__label" htmlFor="ob-gender">Gender</label>
                <select
                  id="ob-gender"
                  className="onboarding__input onboarding__select"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="unknown">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="onboarding__field">
              <label className="onboarding__label" htmlFor="ob-place">Birthplace</label>
              <input
                id="ob-place"
                className="onboarding__input"
                type="text"
                placeholder="City, Country"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
              />
            </div>

            <button
              className="onboarding__btn onboarding__btn--primary"
              type="submit"
              disabled={!name.trim()}
              id="onboarding-submit-btn"
            >
              Create my Kinsutra graph
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
