import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useFamilyStore } from '../../store/familyStore';
import { FamilyPortalModal } from '../modals/FamilyPortalModal';
import { soundFX } from '../../utils/soundEffects';
import './Navigation.css';

function getInitials(name) {
  return name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'ME';
}

export function Navigation({ onSearch, onToggleTheme }) {
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [portalOpen,   setPortalOpen]   = useState(false);
  const [audioMuted,   setAudioMuted]   = useState(soundFX.isMuted);
  const profileRef = useRef(null);
  const location   = useLocation();
  const navigate   = useNavigate();

  const theme              = useFamilyStore((s) => s.theme);
  const meId               = useFamilyStore((s) => s.meId);
  const people             = useFamilyStore((s) => s.people);
  const isOnboarded        = useFamilyStore((s) => s.isOnboarded);
  const logout             = useFamilyStore((s) => s.logout);
  const activeFamilyId     = useFamilyStore((s) => s.activeFamilyId);
  const families           = useFamilyStore((s) => s.families);
  const loadShowcaseFamily = useFamilyStore((s) => s.loadShowcaseFamily);

  const currentFamily = families.find((f) => f.id === activeFamilyId) || families[0];
  const me = meId ? people[meId] : null;
  const isAppRoute = location.pathname.startsWith('/app') || location.pathname.startsWith('/chat') || location.pathname.startsWith('/groups');
  const isActive = (path) => location.pathname === path;

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const handleLogout = () => {
    setProfileOpen(false);
    setMobileOpen(false);
    logout();
    navigate('/');
  };

  const scrollToSection = (id) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.querySelector(id);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      const el = document.querySelector(id);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className="nav">
        <div className="nav__inner">

          {/* ── Brand Logo & Family Switcher Pill ───────────── */}
          <div className="nav__brand-group">
            <Link to="/" className="nav__logo" aria-label="Kinsutra AI Home">
              <div className="nav__logo-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3.2" fill="var(--accent)" />
                  <circle cx="5"  cy="6"  r="2" fill="var(--accent)" opacity="0.7" />
                  <circle cx="19" cy="6"  r="2" fill="var(--accent)" opacity="0.7" />
                  <circle cx="5"  cy="18" r="2" fill="var(--accent)" opacity="0.6" />
                  <circle cx="19" cy="18" r="2" fill="var(--accent)" opacity="0.6" />
                  <line x1="12" y1="12" x2="5"  y2="6"  stroke="var(--accent)" strokeWidth="1.4" opacity="0.6" />
                  <line x1="12" y1="12" x2="19" y2="6"  stroke="var(--accent)" strokeWidth="1.4" opacity="0.6" />
                  <line x1="12" y1="12" x2="5"  y2="18" stroke="var(--accent)" strokeWidth="1.4" opacity="0.5" />
                  <line x1="12" y1="12" x2="19" y2="18" stroke="var(--accent)" strokeWidth="1.4" opacity="0.5" />
                </svg>
              </div>
              <span className="nav__logo-text">Kinsutra</span>
              <span className="nav__logo-badge">AI 2.0</span>
            </Link>

            {isOnboarded && (
              <button
                className="nav__fam-switcher-pill"
                onClick={() => setPortalOpen(true)}
                title="Switch family network or member perspective"
                aria-label="Switch active family network"
              >
                <span className="nav__fam-pill-icon">🌳</span>
                <span className="nav__fam-pill-name">{currentFamily?.name || 'Family Network'}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* ── Center Navigation Links ───────────────────────── */}
          <nav className="nav__links" aria-label="Main navigation">
            {isAppRoute ? (
              <div className="nav__pill-container">
                <Link to="/app" className={`nav__pill-link ${isActive('/app') ? 'nav__pill-link--active' : ''}`}>
                  <span className="nav__pill-icon">🌿</span> Graph Canvas
                </Link>
                <Link to="/chat" className={`nav__pill-link ${isActive('/chat') ? 'nav__pill-link--active' : ''}`}>
                  <span className="nav__pill-icon">💬</span> Messages
                </Link>
                <Link to="/groups" className={`nav__pill-link ${isActive('/groups') ? 'nav__pill-link--active' : ''}`}>
                  <span className="nav__pill-icon">👥</span> Groups
                </Link>
              </div>
            ) : (
              <div className="nav__pill-container">
                <button onClick={() => scrollToSection('.lhero-outer')} className="nav__pill-link">Home</button>
                <button onClick={() => scrollToSection('#sandbox-section')} className="nav__pill-link">AI Sandbox</button>
                <button onClick={() => scrollToSection('.lfeat')} className="nav__pill-link">Features</button>
                <button onClick={() => scrollToSection('#calc-section')} className="nav__pill-link">Kinship Science</button>
                <button onClick={() => scrollToSection('#pricing-section')} className="nav__pill-link">Pricing</button>
              </div>
            )}
          </nav>

          {/* ── Right Actions Section ─────────────────────────── */}
          <div className="nav__actions">

            {/* Quick Command Palette Search Shortcut */}
            {isOnboarded && (
              <button
                className="nav__action-btn nav__search-btn"
                onClick={onSearch}
                aria-label="Search family members (/ or Ctrl+K)"
                title="Search family (/ or Ctrl+K)"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="nav__search-label">Search</span>
                <kbd className="nav__search-kbd">⌘K</kbd>
              </button>
            )}

            {/* Audio Sound FX Toggle */}
            <button
              className="nav__icon-btn nav__audio-btn"
              onClick={() => {
                const muted = soundFX.toggleMute();
                if (!muted) soundFX.playPop();
                setAudioMuted(muted);
              }}
              aria-label={audioMuted ? "Unmute UI Sound FX" : "Mute UI Sound FX"}
              title={audioMuted ? "Sound Effects: Muted" : "Sound Effects: Active (Click to mute)"}
            >
              {audioMuted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              className="nav__icon-btn nav__theme-btn"
              onClick={() => {
                soundFX.playPop();
                onToggleTheme();
              }}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 1v1.5M8 13.5v1.5M1 8h1.5M13.5 8h1.5M3.05 3.05l1.05 1.05M11.9 11.9l1.05 1.05M11.9 4.1l-1.05 1.05M4.1 11.9l-1.05 1.05"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 10a5.5 5.5 0 1 1-7.5-7.5A6 6 0 1 0 13.5 10Z"
                    stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              )}
            </button>

            {/* Showcase Demo Action */}
            <button
              className="nav__demo-btn shimmer-btn"
              onClick={() => {
                soundFX.playSuccess();
                loadShowcaseFamily();
                navigate('/app');
              }}
              title="Load 4-generation 17-member Showcase Dynasty"
            >
              <span className="live-pulse-dot" style={{ width: 6, height: 6 }} />
              <span>Showcase Demo</span>
            </button>

            {/* Main Action / Profile Pill */}
            {isOnboarded && me ? (
              <div className="nav__profile-wrap" ref={profileRef}>
                <button
                  className="nav__avatar-btn"
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-label="Profile menu"
                  aria-expanded={profileOpen}
                  id="nav-profile-btn"
                >
                  {me.photo ? (
                    <img src={me.photo} alt={me.name} className="nav__avatar-img" />
                  ) : (
                    <span className="nav__avatar-text">{getInitials(me.name)}</span>
                  )}
                  <span className="nav__avatar-name">{me.name.split(' ')[0]}</span>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`nav__chevron ${profileOpen ? 'nav__chevron--open' : ''}`}>
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <div className="nav__dropdown" role="menu">
                    <div className="nav__dropdown-header">
                      <div className="nav__dropdown-avatar">
                        {me.photo ? (
                          <img src={me.photo} alt={me.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span>{getInitials(me.name)}</span>
                        )}
                      </div>
                      <div className="nav__dropdown-user-info">
                        <p className="nav__dropdown-name">{me.name}</p>
                        <p className="nav__dropdown-sub">Kinsutra Workspace</p>
                      </div>
                    </div>

                    <div className="nav__dropdown-divider" />

                    <Link
                      to="/app"
                      className="nav__dropdown-item"
                      onClick={() => setProfileOpen(false)}
                      role="menuitem"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                      </svg>
                      Family Graph Studio
                    </Link>

                    <Link
                      to="/chat"
                      className="nav__dropdown-item"
                      onClick={() => setProfileOpen(false)}
                      role="menuitem"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Family Messages
                    </Link>

                    <Link
                      to="/groups"
                      className="nav__dropdown-item"
                      onClick={() => setProfileOpen(false)}
                      role="menuitem"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Kinship Groups
                    </Link>

                    <button
                      className="nav__dropdown-item"
                      onClick={() => {
                        setProfileOpen(false);
                        setPortalOpen(true);
                      }}
                      role="menuitem"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 3 21 3 21 8" />
                        <line x1="4" y1="20" x2="21" y2="3" />
                        <polyline points="21 16 21 21 16 21" />
                        <line x1="15" y1="15" x2="21" y2="21" />
                        <line x1="4" y1="4" x2="9" y2="9" />
                      </svg>
                      Switch Family Network
                    </button>

                    <div className="nav__dropdown-divider" />

                    <button
                      className="nav__dropdown-item nav__dropdown-item--danger"
                      onClick={handleLogout}
                      role="menuitem"
                      id="nav-logout-btn"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="nav__cta-btn shimmer-btn"
                onClick={() => {
                  soundFX.playPop();
                  if (!isOnboarded) {
                    loadShowcaseFamily();
                  }
                  navigate('/app');
                }}
              >
                <span>Open Studio</span>
                <span className="nav__cta-arrow">→</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              className="nav__hamburger"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              <span className={`nav__hamburger-line ${mobileOpen ? 'nav__hamburger-line--open-1' : ''}`} />
              <span className={`nav__hamburger-line ${mobileOpen ? 'nav__hamburger-line--open-2' : ''}`} />
              <span className={`nav__hamburger-line ${mobileOpen ? 'nav__hamburger-line--open-3' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Mobile Navigation Drawer ───────────────────────── */}
        {mobileOpen && (
          <nav className="nav__mobile" aria-label="Mobile navigation">
            <div className="nav__mobile-inner">
              {isOnboarded ? (
                <>
                  <Link to="/app" className="nav__mobile-link" onClick={() => setMobileOpen(false)}>
                    <span>🌿 Graph Canvas</span>
                  </Link>
                  <Link to="/chat" className="nav__mobile-link" onClick={() => setMobileOpen(false)}>
                    <span>💬 Messages</span>
                  </Link>
                  <Link to="/groups" className="nav__mobile-link" onClick={() => setMobileOpen(false)}>
                    <span>👥 Kinship Groups</span>
                  </Link>
                  <button className="nav__mobile-link" onClick={() => { setMobileOpen(false); setPortalOpen(true); }}>
                    <span>🌳 Switch Family ({currentFamily?.name || 'Default'})</span>
                  </button>
                  <div className="nav__mobile-divider" />
                  <button className="nav__mobile-link nav__mobile-logout" onClick={handleLogout}>
                    <span>🚪 Sign out</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => scrollToSection('.lhero-outer')} className="nav__mobile-link">Home</button>
                  <button onClick={() => scrollToSection('#sandbox-section')} className="nav__mobile-link">AI Sandbox</button>
                  <button onClick={() => scrollToSection('.lfeat')} className="nav__mobile-link">Features</button>
                  <button onClick={() => scrollToSection('#calc-section')} className="nav__mobile-link">Kinship Science</button>
                  <button onClick={() => scrollToSection('#pricing-section')} className="nav__mobile-link">Pricing</button>
                  <div className="nav__mobile-divider" />
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      loadShowcaseFamily();
                      navigate('/app');
                    }}
                    className="nav__mobile-link nav__mobile-demo"
                  >
                    ⚡ Explore Showcase Demo
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      navigate('/onboarding');
                    }}
                    className="nav__mobile-link nav__mobile-cta"
                  >
                    Get Started Free →
                  </button>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Multi-Family & Perspective Switcher Modal */}
      <FamilyPortalModal
        isOpen={portalOpen}
        onClose={() => setPortalOpen(false)}
      />
    </>
  );
}
