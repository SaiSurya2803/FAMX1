import './GraphHighlightToolbar.css';

export function GraphHighlightToolbar({
  viewMode,
  onViewModeChange,
  generationFilter,
  onGenerationFilterChange,
  maxGenerations = 5,
  personCount = 1,
  generationCount = 1,
  onCenterMe,
}) {
  return (
    <div className="ght-bar">
      {/* Centre on ME Button */}
      <button
        className="ght-seg-btn ght-center-btn"
        onClick={() => {
          if (onCenterMe) onCenterMe();
          window.dispatchEvent(new CustomEvent('graph:center'));
        }}
        title="Centre graph on you (G)"
      >
        🎯 Centre
      </button>

      {/* Auto-Arrange Tree Button */}
      <button
        className="ght-seg-btn ght-center-btn"
        onClick={() => {
          useFamilyStore.getState().resetNodePositions();
          if (onViewModeChange) onViewModeChange('generations');
          window.dispatchEvent(new CustomEvent('graph:center'));
        }}
        title="Reset manual drag positions into a clean vertical tree structure"
      >
        🌲 Auto-Arrange Tree
      </button>

      {/* View Mode Segmented Control */}
      <div className="ght-segmented">
        <button
          className={`ght-seg-btn ${viewMode === 'network' ? 'ght-seg-btn--active' : ''}`}
          onClick={() => onViewModeChange('network')}
          title="Interactive Network View"
        >
          🕸️ Network
        </button>
        <button
          className={`ght-seg-btn ${viewMode === 'lineage' ? 'ght-seg-btn--active' : ''}`}
          onClick={() => onViewModeChange('lineage')}
          title="Bloodline & Ancestry Trace"
        >
          ⚡ Lineage Trace
        </button>
        <button
          className={`ght-seg-btn ${viewMode === 'generations' ? 'ght-seg-btn--active' : ''}`}
          onClick={() => onViewModeChange('generations')}
          title="Generation Tier View"
        >
          🏛️ Generations
        </button>
      </div>

      <div className="ght-divider" />

      {/* Generation Time Machine Scrubber */}
      <div className="ght-time-wrap">
        <span className="ght-time-label">⏳ Time Scrubber:</span>
        <input
          type="range"
          min="1"
          max={maxGenerations}
          value={generationFilter}
          onChange={(e) => onGenerationFilterChange(Number(e.target.value))}
          className="ght-slider"
        />
        <span className="ght-time-val">
          {generationFilter === maxGenerations
            ? 'All Generations'
            : `Gen 1 - ${generationFilter}`}
        </span>
      </div>

      <div className="ght-divider" />

      {/* Live Kinsutra Metrics Pill */}
      <div className="ght-metrics">
        <span className="ght-metric">👥 <strong>{personCount}</strong> Kin</span>
        <span className="ght-metric-sep">·</span>
        <span className="ght-metric">📜 <strong>{generationCount}</strong> Generations</span>
      </div>
    </div>
  );
}
