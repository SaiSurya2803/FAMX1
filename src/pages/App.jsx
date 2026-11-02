import { useState, useCallback, useEffect } from 'react';
import { useFamilyStore } from '../store/familyStore';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { ProfilePanel } from '../components/profile/ProfilePanel';
import { AddRelativeModal } from '../components/modals/AddRelativeModal';
import { RelationEditorModal } from '../components/modals/RelationEditorModal';
import { GraphHighlightToolbar } from '../components/graph/GraphHighlightToolbar';
import { KinsutraAgentWidget } from '../components/agent/KinsutraAgentWidget';
import { soundFX } from '../utils/soundEffects';
import './App.css';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function AppPage() {
  const meId = useFamilyStore((s) => s.meId);
  const people = useFamilyStore((s) => s.people);
  const getPersonCount = useFamilyStore((s) => s.getPersonCount);
  const getGenerationCount = useFamilyStore((s) => s.getGenerationCount);
  const loadShowcaseFamily = useFamilyStore((s) => s.loadShowcaseFamily);

  const me = meId ? people[meId] : null;
  const firstName = me?.name?.split(' ')[0] || '';
  const count = getPersonCount();
  const gens = getGenerationCount();

  // If there are zero people in graph, auto-load showcase dynasty immediately
  useEffect(() => {
    if (count === 0) {
      loadShowcaseFamily();
    }
  }, [count, loadShowcaseFamily]);

  const [selectedId, setSelectedId] = useState(null);
  const [addRelativeFor, setAddRelativeFor] = useState(null);
  const [editRelationsFor, setEditRelationsFor] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [viewMode, setViewMode] = useState('network'); // 'network' | 'lineage' | 'generations'
  const [generationFilter, setGenerationFilter] = useState(Math.max(gens, 5));

  useEffect(() => {
    if (gens > 0) {
      setGenerationFilter((prev) => Math.max(prev, gens));
    }
  }, [gens]);

  const handleSelectNode = useCallback((id) => {
    setSelectedId(id);
    setShowWelcome(false);
  }, []);

  // Close modal on Escape key & listen to search focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setAddRelativeFor(null);
        setEditRelationsFor(null);
      }
    };
    const handleFocus = (e) => {
      if (e.detail && e.detail.id) {
        setSelectedId(e.detail.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('graph:focus', handleFocus);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('graph:focus', handleFocus);
    };
  }, []);

  const handleAddRelative = useCallback((anchorId) => {
    setSelectedId(null);
    setAddRelativeFor(anchorId);
  }, []);

  const handleEditRelations = useCallback((personId) => {
    setSelectedId(null);
    setEditRelationsFor(personId);
  }, []);

  const handleAdded = useCallback((newId) => {
    setSelectedId(newId);
    setShowWelcome(false);
  }, []);

  return (
    <div className="app-page">
      {/* Top bar */}
      <div className="app-topbar">
        <div className="app-topbar__greeting">
          <span className="app-topbar__greet-text">{getGreeting()}, {firstName}.</span>
          {count > 1 && (
            <span className="app-topbar__stats">
              {count} {count === 1 ? 'person' : 'people'}
              {gens > 1 && ` · ${gens} generation${gens === 1 ? '' : 's'}`}
            </span>
          )}
        </div>

        <div className="app-topbar__actions">
          {count <= 1 && (
            <button
              className="app-topbar__btn shimmer-btn"
              onClick={() => {
                soundFX.playSuccess();
                useFamilyStore.getState().loadShowcaseFamily();
                setShowWelcome(false);
              }}
              style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                borderColor: 'rgba(200, 169, 110, 0.4)',
                fontWeight: 600,
              }}
              title="Load full 17-member multi-generation demo network"
            >
              ⚡ Load Showcase Dynasty
            </button>
          )}

          <button
            className="app-topbar__btn app-topbar__btn--primary shimmer-btn"
            onClick={() => {
              soundFX.playPop();
              handleAddRelative(meId);
            }}
            id="add-relative-main-btn"
            aria-label="Add a relative"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add relative
          </button>
        </div>
      </div>

      {/* Graph canvas */}
      <div className="app-graph">
        <GraphCanvas
          selectedId={selectedId}
          onSelectNode={handleSelectNode}
          onAddRelative={handleAddRelative}
          viewMode={viewMode}
          generationFilter={generationFilter}
        />

        {/* Highlight Control Toolbar */}
        <GraphHighlightToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          generationFilter={generationFilter}
          onGenerationFilterChange={setGenerationFilter}
          maxGenerations={Math.max(gens, 5)}
          personCount={count}
          generationCount={gens}
          onCenterMe={() => handleSelectNode(meId)}
        />

        {/* Empty / welcome hint */}
        {showWelcome && count === 1 && (
          <div className="app-hint">
            <div className="app-hint__inner">
              <div className="live-pulse-dot" style={{ margin: '0 auto 12px' }} />
              <p className="app-hint__title">You're the centre</p>
              <p className="app-hint__sub">
                Click <strong>Add relative</strong> to add your family, or explore our full 17-member interactive showcase with 4 generations.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
                <button
                  className="app-hint__btn shimmer-btn"
                  onClick={() => {
                    soundFX.playPop();
                    handleAddRelative(meId);
                  }}
                >
                  Add relative →
                </button>
                <button
                  className="app-hint__btn shimmer-btn"
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}
                  onClick={() => {
                    soundFX.playSuccess();
                    useFamilyStore.getState().loadShowcaseFamily();
                    setShowWelcome(false);
                  }}
                >
                  ⚡ Load 100M Showcase Family
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile panel */}
      {selectedId && (
        <ProfilePanel
          personId={selectedId}
          onClose={() => setSelectedId(null)}
          onAddRelative={handleAddRelative}
          onEditRelations={handleEditRelations}
          onViewMessages={() => {}}
        />
      )}

      {/* Add relative modal */}
      {addRelativeFor && (
        <AddRelativeModal
          anchorId={addRelativeFor}
          onClose={() => setAddRelativeFor(null)}
          onAdded={handleAdded}
        />
      )}

      {/* Relation editor modal */}
      {editRelationsFor && (
        <RelationEditorModal
          personId={editRelationsFor}
          onClose={() => setEditRelationsFor(null)}
        />
      )}

      {/* Floating Corner AI Agent */}
      <KinsutraAgentWidget />
    </div>
  );
}
