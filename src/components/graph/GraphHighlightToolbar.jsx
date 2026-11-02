import './GraphHighlightToolbar.css';
import { useFamilyStore } from '../../store/familyStore';
import { soundFX } from '../../utils/soundEffects';

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
  const handleExportSvg = () => {
    soundFX.playSuccess();
    const svgEl = document.querySelector('.graph-canvas');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinsutra-dynasty-graph-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ght-bar">
      {/* Centre on ME Button */}
      <button
        className="ght-seg-btn ght-center-btn"
        onClick={() => {
          soundFX.playSwoosh();
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
          soundFX.playSwoosh();
          useFamilyStore.getState().resetNodePositions();
          if (onViewModeChange) onViewModeChange('generations');
          window.dispatchEvent(new CustomEvent('graph:center'));
        }}
        title="Reset manual drag positions into a clean vertical tree structure"
      >
        🌲 Auto-Arrange
      </button>

      {/* View Mode Segmented Control */}
      <div className="ght-segmented">
        <button
          className={`ght-seg-btn ${viewMode === 'network' ? 'ght-seg-btn--active' : ''}`}
          onClick={() => {
            soundFX.playPop();
            onViewModeChange('network');
          }}
          title="Interactive Network View"
        >
          🕸️ Network
        </button>
        <button
          className={`ght-seg-btn ${viewMode === 'lineage' ? 'ght-seg-btn--active' : ''}`}
          onClick={() => {
            soundFX.playPop();
            onViewModeChange('lineage');
          }}
          title="Bloodline & Ancestry Trace"
        >
          ⚡ Lineage
        </button>
        <button
          className={`ght-seg-btn ${viewMode === 'generations' ? 'ght-seg-btn--active' : ''}`}
          onClick={() => {
            soundFX.playPop();
            onViewModeChange('generations');
          }}
          title="Generation Tier View"
        >
          🏛️ Tiers
        </button>
      </div>

      <div className="ght-divider" />

      {/* Generation Time Machine Scrubber */}
      <div className="ght-time-wrap">
        <span className="ght-time-label">⏳ Scrubber:</span>
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
            ? 'All Gen'
            : `Gen 1-${generationFilter}`}
        </span>
      </div>

      <div className="ght-divider" />

      {/* Export Heirloom SVG Button */}
      <button
        className="ght-seg-btn ght-export-btn"
        onClick={handleExportSvg}
        title="Export High-Resolution Heirloom SVG Chart"
      >
        📥 Export SVG
      </button>

      {/* Live Kinsutra Metrics Pill */}
      <div className="ght-metrics">
        <span className="ght-metric">👥 <strong>{personCount}</strong> Kin</span>
        <span className="ght-metric-sep">·</span>
        <span className="ght-metric">📜 <strong>{generationCount}</strong> Gen</span>
      </div>
    </div>
  );
}
