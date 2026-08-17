import { useEffect, useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useFamilyStore } from './store/familyStore';
import { Navigation } from './components/layout/Navigation';
import { CommandPalette } from './components/search/CommandPalette';
import Landing from './pages/Landing';
import { Onboarding } from './pages/Onboarding';
import { AppPage } from './pages/App';
import { Chat } from './pages/Chat';
import { Groups } from './pages/Groups';
import './styles/tokens.css';
import './styles/base.css';

// Apply theme immediately before React hydrates (avoids flash)
const savedTheme = JSON.parse(localStorage.getItem('familygraph-store') || '{}')?.state?.theme || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

gsap.registerPlugin(ScrollTrigger);

/* ─── Protected route ─────────────────────────────────────── */
function Protected({ children }) {
  const isOnboarded = useFamilyStore((s) => s.isOnboarded);
  return isOnboarded ? children : <Navigate to="/onboarding" replace />;
}

/* ─── Root App ─────────────────────────────────────────────── */
export default function App() {
  const theme = useFamilyStore((s) => s.theme);
  const setTheme = useFamilyStore((s) => s.setTheme);
  const isOnboarded = useFamilyStore((s) => s.isOnboarded);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteSelectedId, setPaletteSelectedId] = useState(null);

  /* ── Apply theme ─────────────────────────────────────────── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /* ── Lenis smooth scroll ─────────────────────────────────── */
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
      prevent: (node) =>
        !!node.closest?.('.fportal-modal, .reledit-modal, .add-modal, .profile-panel, .fportal-overlay, .reledit-scrim, .add-modal-scrim, .profile-modal-scrim, .kagent-drawer, .kagent-body, .kagent-trigger'),
    });

    function raf(time) {
      lenis.raf(time);
      ScrollTrigger.update();
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  /* ── Global keyboard shortcuts ────────────────────────────── */
  useEffect(() => {
    const handle = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const handlePaletteSelect = useCallback((id) => {
    setPaletteSelectedId(id);
    // The AppPage will pick this up if on that route
    // For now, store it in URL or navigate to /app with state
    window.__graphFocusId = id;
    window.dispatchEvent(new CustomEvent('graph:focus', { detail: { id } }));
  }, []);

  return (
    <BrowserRouter>
      <Navigation
        onSearch={() => setPaletteOpen(true)}
        onToggleTheme={handleToggleTheme}
      />

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectPerson={handlePaletteSelect}
      />

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/app" element={
          <Protected><AppPage /></Protected>
        } />
        <Route path="/chat" element={
          <Protected><Chat /></Protected>
        } />
        <Route path="/groups" element={
          <Protected><Groups /></Protected>
        } />
        <Route path="*" element={<Navigate to={isOnboarded ? '/app' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
