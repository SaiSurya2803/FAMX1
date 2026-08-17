import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useFamilyStore } from '../../store/familyStore';
import { FamilyPortalModal } from '../modals/FamilyPortalModal';
import './Navigation.css';

function getInitials(name) {
  return name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'ME';
}

export function Navigation({ onSearch, onToggleTheme }) {
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [portalOpen,   setPortalOpen]   = useState(false);
  const profileRef = useRef(null);
  const location   = useLocation();
  const navigate   = useNavigate();

  const theme           = useFamilyStore((s) => s.theme);
  const meId            = useFamilyStore((s) => s.meId);
  const people          = useFamilyStore((s) => s.people);
  const isOnboarded     = useFamilyStore((s) => s.isOnboarded);
  const logout          = useFamilyStore((s) => s.logout);
  const activeFamilyId  = useFamilyStore((s) => s.activeFamilyId);
  const families        = useFamilyStore((s) => s.families);

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
      }, 100);
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
            <Link to="/" className="nav__logo" aria-label="Kinsutra Home">
              <div className="nav__logo-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" fill="var(--accent)" />
                  <circle cx="5"  cy="5"  r="2" fill="var(--accent)" opacity="0.6" />
                  <circle cx="19" cy="5"  r="2" fill="var(--accent)" opacity="0.6" />
                  <circle cx="5"  cy="19" r="2" fill="var(--accent)" opacity="0.5" />
                  <circle cx="19" cy="19" r="2" fill="var(--accent)" opacity="0.5" />
                  <line x1="12" y1="12" x2="5"  y2="5"  stroke="var(--accent)" strokeWidth="1.2" opacity="0.5" />
                  <line x1="12" y1="12" x2="19" y2="5"  stroke="var(--accent)" strokeWidth="1.2" opacity="0.5" />
                  <line x1="12" y1="12" x2="5"  y2="19" stroke="var(--accent)" strokeWidth="1.2" opacity="0.4" />
                  <line x1="12" y1="12" x2="19" y2="19" stroke="var(--accent)" strokeWidth="1.2" opacity="0.4" />
                </svg>
              </div>
              <span className="nav__logo-text">Kinsutra</span>
            </Link>

            {isOnboarded && (
              <button
                className="nav__fam-switcher-pill"
                onClick={() => setPortalOpen(true)}
                title="Switch family network or member perspective"
              >
                <span className="nav__fam-pill-icon">🌳</span>
                <span className="nav__fam-pill-name">{currentFamily?.name || 'Family Network'}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

        {/* ── Center Navigation Links ───────────────────────── */}
        <nav className="nav__links" aria-label="Main navigation">
          {isAppRoute ? (
            <>
              <Link to="/app"    className={`nav__link ${isActive('/app')    ? 'nav__link--active' : ''}`}>Graph</Link>
              <Link to="/chat"   className={`nav__link ${isActive('/chat')   ? 'nav__link--active' : ''}`}>Messages</Link>
              <Link to="/groups" className={`nav__link ${isActive('/groups') ? 'nav__link--active' : ''}`}>Groups</Link>
            </>
          ) : (
            <>
              <button onClick={() => scrollToSection('.lhero-outer')} className="nav__link nav__link--btn">Home</button>
              <button onClick={() => scrollToSection('.lfeat')} className="nav__link nav__link--btn">Features</button>
              <button onClick={() => scrollToSection('.lband')} className="nav__link nav__link--btn">Network</button>
              {isOnboarded && (
                <Link to="/app" className="nav__link">My Graph</Link>
              )}
            </>
          )}
        </nav>

        {/* ── Right Actions Section ─────────────────────────── */}
        <div className="nav__actions">

          {/* Search Button */}
          {isOnboarded && (
            <button
              className="nav__action-btn nav__search-btn"
              onClick={onSearch}
              aria-label="Search family (/ or Ctrl+K)"
              title="Search (/ or Ctrl+K)"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="nav__search-badge">⌘K</span>
            </button>
          )}

          {/* Theme Toggle Pill */}
          <button
            className="nav__action-btn nav__theme-btn"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 1v1M8 14v1M1 8h1M14 8h1M3.05 3.05l.7.7M12.25 12.25l.7.7M12.25 3.75l-.7.7M3.75 12.25l-.7.7"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 10a5.5 5.5 0 1 1-7.5-7.5A6 6 0 1 0 13.5 10Z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            )}
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
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="nav__dropdown" role="menu">
                  <div className="nav__dropdown-header">
                    <div className="nav__dropdown-avatar">
                      {me.photo
                        ? <img src={me.photo} alt={me.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        : <span>{getInitials(me.name)}</span>
                      }
                    </div>
                    <div>
                      <p className="nav__dropdown-name">{me.name}</p>
                      <p className="nav__dropdown-sub">Kinsutra Account</p>
                    </div>
                  </div>

                  <div className="nav__dropdown-divider" />

                  <Link
                    to="/app"
                    className="nav__dropdown-item"
                    onClick={() => setProfileOpen(false)}
                    role="menuitem"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="2.5" fill="currentColor" />
                      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
                    </svg>
                    My Family Graph
                  </Link>

                  <Link
                    to="/chat"
                    className="nav__dropdown-item"
                    onClick={() => setProfileOpen(false)}
                    role="menuitem"
                  >
                    💬 Messages
                  </Link>

                  <div className="nav__dropdown-divider" />

                  <button
                    className="nav__dropdown-item nav__dropdown-item--danger"
                    onClick={handleLogout}
                    role="menuitem"
                    id="nav-logout-btn"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M9 10l3-3-3-3M12 7H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="nav__cta-btn"
              onClick={() => navigate(isOnboarded ? '/app' : '/onboarding')}
            >
              {isOnboarded ? 'Open App →' : 'Get Started →'}
            </button>
          )}

          {/* Mobile Hamburger */}
          <button
            className="nav__hamburger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ───────────────────────── */}
      {mobileOpen && (
        <nav className="nav__mobile" aria-label="Mobile navigation">
          {isOnboarded ? (
            <>
              <Link to="/app"    className="nav__mobile-link" onClick={() => setMobileOpen(false)}>Graph</Link>
              <Link to="/chat"   className="nav__mobile-link" onClick={() => setMobileOpen(false)}>Messages</Link>
              <Link to="/groups" className="nav__mobile-link" onClick={() => setMobileOpen(false)}>Groups</Link>
              <button className="nav__mobile-link nav__mobile-logout" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <button onClick={() => scrollToSection('.lhero-outer')} className="nav__mobile-link">Home</button>
              <button onClick={() => scrollToSection('.lfeat')} className="nav__mobile-link">Features</button>
              <button onClick={() => scrollToSection('.lband')} className="nav__mobile-link">Network</button>
              <button onClick={() => { setMobileOpen(false); navigate('/onboarding'); }} className="nav__mobile-link nav__mobile-cta">Get Started →</button>
            </>
          )}
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
