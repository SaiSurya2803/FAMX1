import { useState, useEffect } from 'react';
import { useFamilyStore } from '../../store/familyStore';
import { generateGraphToken } from '../../utils/graphShare';
import './FamilyPortalModal.css';

export function FamilyPortalModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('networks'); // 'networks' | 'perspective' | 'invite'
  const [newFamName, setNewFamName] = useState('');
  const [joinCode, setJoinCode]     = useState('');
  const [importToken, setImportToken] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin]     = useState(false);
  const [copiedCode, setCopiedCode]   = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [importMsg, setImportMsg]     = useState('');

  const activeFamilyId  = useFamilyStore((s) => s.activeFamilyId);
  const families        = useFamilyStore((s) => s.families);
  const people          = useFamilyStore((s) => s.people);
  const edges           = useFamilyStore((s) => s.edges);
  const meId            = useFamilyStore((s) => s.meId);

  const switchFamilyTree   = useFamilyStore((s) => s.switchFamilyTree);
  const createFamilyTree   = useFamilyStore((s) => s.createFamilyTree);
  const joinFamilyTree     = useFamilyStore((s) => s.joinFamilyTree);
  const switchPerspective  = useFamilyStore((s) => s.switchPerspective);
  const importSharedGraph  = useFamilyStore((s) => s.importSharedGraph);

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    const origTouch = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.touchAction = origTouch;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentFamily = families.find((f) => f.id === activeFamilyId) || families[0];
  const personList = Object.values(people);

  const handleCreateFamily = (e) => {
    e.preventDefault();
    if (!newFamName.trim()) return;
    createFamilyTree(newFamName.trim());
    setNewFamName('');
    setShowCreate(false);
  };

  const handleJoinFamily = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    joinFamilyTree(joinCode.trim());
    setJoinCode('');
    setShowJoin(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFamily?.code || 'KIN-8842');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyGraphToken = () => {
    const token = generateGraphToken(people, edges, currentFamily?.name);
    if (token) {
      navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleImportToken = (mode = 'merge') => {
    if (!importToken.trim()) return;
    const ok = importSharedGraph(importToken.trim(), mode);
    if (ok) {
      setImportMsg(mode === 'merge' ? '✓ Graph merged successfully into your active tree!' : '✓ Graph copied as a brand new Family Tree!');
      setImportToken('');
      setTimeout(() => setImportMsg(''), 3500);
    } else {
      setImportMsg('❌ Invalid Graph Token Code. Please check the code and try again.');
    }
  };

  return (
    <div
      className="fportal-overlay"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div className="fportal-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fportal-header">
          <div>
            <h2 className="fportal-title">Family Networks & Access</h2>
            <p className="fportal-sub">Switch trees, manage perspective, or copy relative family graphs</p>
          </div>
          <button className="fportal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tab Bar */}
        <div className="fportal-tabs">
          <button
            className={`fportal-tab ${activeTab === 'networks' ? 'fportal-tab--active' : ''}`}
            onClick={() => setActiveTab('networks')}
          >
            👨‍👩‍👧 Family Trees ({families.length})
          </button>
          <button
            className={`fportal-tab ${activeTab === 'perspective' ? 'fportal-tab--active' : ''}`}
            onClick={() => setActiveTab('perspective')}
          >
            👤 Member Perspective
          </button>
          <button
            className={`fportal-tab ${activeTab === 'invite' ? 'fportal-tab--active' : ''}`}
            onClick={() => setActiveTab('invite')}
          >
            🔑 Share & Copy Graph
          </button>
        </div>

        {/* Tab 1: Family Networks */}
        {activeTab === 'networks' && (
          <div className="fportal-body">
            <div className="fportal-section-header">
              <span className="fportal-sec-title">Your Family Networks</span>
              <div className="fportal-actions-row">
                <button className="fportal-btn-sm" onClick={() => { setShowCreate((v) => !v); setShowJoin(false); }}>
                  + New Tree (Wife / In-Laws)
                </button>
                <button className="fportal-btn-sm fportal-btn-sec" onClick={() => { setShowJoin((v) => !v); setShowCreate(false); }}>
                  🔗 Join Code
                </button>
              </div>
            </div>

            {/* Create Form */}
            {showCreate && (
              <form className="fportal-form" onSubmit={handleCreateFamily}>
                <input
                  type="text"
                  placeholder="Family Tree Name (e.g. Ananya's Side Family)"
                  value={newFamName}
                  onChange={(e) => setNewFamName(e.target.value)}
                  className="fportal-input"
                  autoFocus
                />
                <button type="submit" className="fportal-submit-btn">Create Tree →</button>
              </form>
            )}

            {/* Join Form */}
            {showJoin && (
              <form className="fportal-form" onSubmit={handleJoinFamily}>
                <input
                  type="text"
                  placeholder="Enter Family Access Code (e.g. KIN-9842)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="fportal-input"
                  autoFocus
                />
                <button type="submit" className="fportal-submit-btn">Join Tree →</button>
              </form>
            )}

            {/* Networks List */}
            <div className="fportal-net-list">
              {families.map((fam) => {
                const isActive = fam.id === activeFamilyId;
                return (
                  <div
                    key={fam.id}
                    className={`fportal-net-card ${isActive ? 'fportal-net-card--active' : ''}`}
                    onClick={() => switchFamilyTree(fam.id)}
                  >
                    <div className="fportal-net-icon">🌳</div>
                    <div className="fportal-net-info">
                      <p className="fportal-net-name">{fam.name}</p>
                      <p className="fportal-net-code">Access Code: <strong>{fam.code || 'KIN-8842'}</strong></p>
                    </div>
                    {isActive ? (
                      <span className="fportal-badge fportal-badge--active">Active</span>
                    ) : (
                      <button className="fportal-switch-btn">Switch →</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Member Perspective Switcher */}
        {activeTab === 'perspective' && (
          <div className="fportal-body">
            <p className="fportal-hint">
              Select which family member is logged in. The graph will center and re-perspective relative to them!
            </p>
            <div className="fportal-person-list">
              {personList.map((p) => {
                const isCurrentMe = p.id === meId;
                return (
                  <div
                    key={p.id}
                    className={`fportal-person-card ${isCurrentMe ? 'fportal-person-card--me' : ''}`}
                    onClick={() => switchPerspective(p.id)}
                  >
                    <div className="fportal-person-avatar">
                      {p.photo ? <img src={p.photo} alt={p.name} /> : p.name[0]?.toUpperCase()}
                    </div>
                    <div className="fportal-person-info">
                      <p className="fportal-person-name">{p.name} {isCurrentMe && '(YOU)'}</p>
                      <p className="fportal-person-sub">{p.gender} · {p.birthDate || 'Family Member'}</p>
                    </div>
                    {isCurrentMe ? (
                      <span className="fportal-badge fportal-badge--me">Current Logged In</span>
                    ) : (
                      <button className="fportal-switch-btn">Log in as {p.name.split(' ')[0]} →</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Access Code & Graph Token Copy/Import */}
        {activeTab === 'invite' && (
          <div className="fportal-body">
            {/* Universal Access Code */}
            <div className="fportal-code-box">
              <p className="fportal-code-label">Family Tree Access Code</p>
              <div className="fportal-code-row">
                <span className="fportal-code-display">{currentFamily?.code || 'KIN-8842'}</span>
                <button className="fportal-copy-btn" onClick={handleCopyCode}>
                  {copiedCode ? '✓ Copied!' : '📋 Copy Access Code'}
                </button>
              </div>
            </div>

            <div className="fportal-divider" />

            {/* Export Graph Token */}
            <div className="fportal-share-box">
              <div className="fportal-share-header">
                <div>
                  <p className="fportal-sec-title">📤 Export & Copy Graph Token</p>
                  <p className="fportal-hint" style={{ margin: 0 }}>Generates a full graph copy code so relatives can paste into their app.</p>
                </div>
                <button className="fportal-btn-sm" onClick={handleCopyGraphToken}>
                  {copiedToken ? '✓ Token Copied!' : '📋 Copy Graph Code'}
                </button>
              </div>
            </div>

            <div className="fportal-divider" />

            {/* Import Shared Graph Token */}
            <div className="fportal-share-box">
              <p className="fportal-sec-title">📥 Import Relative's Shared Graph Code</p>
              <p className="fportal-hint">Paste a Graph Code (`KIN-NET-...`) shared by a relative to merge or copy their graph into your account.</p>
              <textarea
                className="fportal-textarea"
                rows={3}
                placeholder="Paste Shared Graph Token (KIN-NET-...)"
                value={importToken}
                onChange={(e) => setImportToken(e.target.value)}
              />
              <div className="fportal-actions-row" style={{ marginTop: '8px' }}>
                <button className="fportal-btn-sm" onClick={() => handleImportToken('merge')}>
                  🔗 Merge into Active Tree
                </button>
                <button className="fportal-btn-sm fportal-btn-sec" onClick={() => handleImportToken('new_tree')}>
                  🌳 Copy as New Tree
                </button>
              </div>
              {importMsg && <p className="fportal-msg">{importMsg}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
