import { useState, useEffect } from 'react';
import { useFamilyStore, RELATIONSHIP_TYPES, KINSHIP_CATALOG } from '../../store/familyStore';
import './RelationEditorModal.css';

export function RelationEditorModal({ personId, onClose }) {
  const people        = useFamilyStore((s) => s.people);
  const edges         = useFamilyStore((s) => s.edges);
  const getNeighbors  = useFamilyStore((s) => s.getNeighbors);
  const addEdge       = useFamilyStore((s) => s.addEdge);
  const removeEdge    = useFamilyStore((s) => s.removeEdge);
  const updateEdge    = useFamilyStore((s) => s.updateEdge);
  const mergePeople   = useFamilyStore((s) => s.mergePeople);

  const person = personId ? people[personId] : null;
  const neighbors = personId ? getNeighbors(personId) : [];

  // Options for linking new connection
  const [targetPersonId, setTargetPersonId] = useState('');
  const [selectedKinId, setSelectedKinId]   = useState(KINSHIP_CATALOG[0].id);

  // Options for duplicate merging
  const [duplicateId, setDuplicateId]       = useState('');
  const [activeTab, setActiveTab]           = useState('connections'); // 'connections' | 'add' | 'merge'

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (!personId) return;
    const origOverflow = document.body.style.overflow;
    const origTouch = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.touchAction = origTouch;
    };
  }, [personId]);

  if (!person) return null;

  // Other people in graph excluding current person and already connected neighbors
  const connectedIds = new Set(neighbors.map((n) => n.person.id));
  const unconnectedPeople = Object.values(people).filter(
    (p) => p.id !== personId && !connectedIds.has(p.id)
  );

  // Duplicate candidates (matching or all other people)
  const duplicateCandidates = Object.values(people).filter((p) => p.id !== personId);

  const handleAddConnection = (e) => {
    e.preventDefault();
    if (!targetPersonId) return;

    const kin = KINSHIP_CATALOG.find((k) => k.id === selectedKinId) || KINSHIP_CATALOG[0];

    // Determine direction
    let from = personId;
    let to = targetPersonId;
    let type = kin.type;

    if (kin.type === RELATIONSHIP_TYPES.PARENT) {
      from = targetPersonId; // target is parent
      to = personId;
    } else if (kin.type === RELATIONSHIP_TYPES.CHILD) {
      from = personId; // person is parent
      to = targetPersonId;
      type = RELATIONSHIP_TYPES.PARENT;
    }

    addEdge(from, to, type);
    setTargetPersonId('');
  };

  const handleMerge = (e) => {
    e.preventDefault();
    if (!duplicateId) return;
    const dup = people[duplicateId];
    if (confirm(`Merge duplicate person "${dup.name}" into "${person.name}"? All connections will be combined.`)) {
      mergePeople(personId, duplicateId);
      setDuplicateId('');
      onClose();
    }
  };

  return (
    <div
      className="reledit-scrim"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="reledit-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="reledit-header">
          <div>
            <h2 className="reledit-title">Relation Editor</h2>
            <p className="reledit-sub">Manage connections & merge duplicates for <strong>{person.name}</strong></p>
          </div>
          <button className="reledit-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="reledit-tabs">
          <button
            className={`reledit-tab ${activeTab === 'connections' ? 'reledit-tab--active' : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            Current ({neighbors.length})
          </button>
          <button
            className={`reledit-tab ${activeTab === 'add' ? 'reledit-tab--active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            + Link Person
          </button>
          <button
            className={`reledit-tab ${activeTab === 'merge' ? 'reledit-tab--active' : ''}`}
            onClick={() => setActiveTab('merge')}
          >
            🔗 Merge Duplicates
          </button>
        </div>

        {/* Tab Content */}
        <div className="reledit-body">
          {/* TAB 1: CURRENT CONNECTIONS */}
          {activeTab === 'connections' && (
            <div className="reledit-list">
              {neighbors.length === 0 ? (
                <p className="reledit-empty">No connections found for {person.name}. Click "+ Link Person" to connect someone.</p>
              ) : (
                neighbors.map(({ person: neighbor, edge }) => {
                  const currentLabel = (edge.label && edge.label !== 'parent' && edge.label !== 'Parent')
                    ? edge.label
                    : (neighbor.gender === 'female' ? 'Mother' : 'Father');

                  const handleSelectChange = (val) => {
                    let type = edge.type;
                    if (['Mother', 'Father', 'Parent'].includes(val)) type = RELATIONSHIP_TYPES.PARENT;
                    if (['Spouse', 'Spouse / Partner'].includes(val)) type = RELATIONSHIP_TYPES.SPOUSE;
                    if (['Son', 'Daughter', 'Child'].includes(val)) type = RELATIONSHIP_TYPES.CHILD;
                    if (['Brother', 'Sister'].includes(val)) type = RELATIONSHIP_TYPES.SIBLING;
                    if (['Grandmother', 'Grandfather', 'Paternal Grandmother', 'Paternal Grandfather', 'Maternal Grandmother', 'Maternal Grandfather'].includes(val)) type = RELATIONSHIP_TYPES.GRANDPARENT;
                    updateEdge(edge.id, type, val);
                  };

                  return (
                    <div key={edge.id} className="reledit-item">
                      <div className="reledit-item-avatar">
                        {neighbor.photo
                          ? <img src={neighbor.photo} alt={neighbor.name} />
                          : neighbor.name[0]?.toUpperCase()}
                      </div>
                      <div className="reledit-item-info">
                        <span className="reledit-item-name">{neighbor.name}</span>
                        <div className="reledit-item-rel-edit">
                          <select
                            className="reledit-label-select"
                            value={currentLabel}
                            onChange={(e) => handleSelectChange(e.target.value)}
                          >
                            <option value="Mother">Mother</option>
                            <option value="Father">Father</option>
                            <option value="Spouse">Spouse / Partner</option>
                            <option value="Son">Son</option>
                            <option value="Daughter">Daughter</option>
                            <option value="Brother">Brother</option>
                            <option value="Sister">Sister</option>
                            <option value="Grandmother">Grandmother</option>
                            <option value="Grandfather">Grandfather</option>
                            <option value="Paternal Grandmother">Paternal Grandmother (Dadi / Paati)</option>
                            <option value="Paternal Grandfather">Paternal Grandfather (Dada / Thatha)</option>
                            <option value="Maternal Grandmother">Maternal Grandmother (Nani / Ammamma)</option>
                            <option value="Maternal Grandfather">Maternal Grandfather (Nana / Ammavan)</option>
                            <option value="Uncle">Uncle</option>
                            <option value="Aunt">Aunt</option>
                            <option value="In-Law">In-Law</option>
                            <option value="Parent">Parent</option>
                          </select>
                          {edge.isInferred && <span className="reledit-inferred-tag">⚡ Auto</span>}
                        </div>
                      </div>
                      <button
                        className="reledit-item-delete"
                        onClick={() => removeEdge(edge.id)}
                        title="Delete connection"
                        aria-label="Delete connection"
                      >
                        🗑️
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: LINK TO EXISTING PERSON */}
          {activeTab === 'add' && (
            <form className="reledit-form" onSubmit={handleAddConnection}>
              {unconnectedPeople.length === 0 ? (
                <p className="reledit-empty">All existing family members are already connected to {person.name}.</p>
              ) : (
                <>
                  <div className="reledit-field">
                    <label className="reledit-label">Select Family Member</label>
                    <select
                      className="reledit-select"
                      value={targetPersonId}
                      onChange={(e) => setTargetPersonId(e.target.value)}
                      required
                    >
                      <option value="">-- Pick Person --</option>
                      {unconnectedPeople.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="reledit-field">
                    <label className="reledit-label">Select Relationship</label>
                    <select
                      className="reledit-select"
                      value={selectedKinId}
                      onChange={(e) => setSelectedKinId(e.target.value)}
                    >
                      {KINSHIP_CATALOG.map((k) => (
                        <option key={k.id} value={k.id}>{k.emoji} {k.label}</option>
                      ))}
                    </select>
                  </div>

                  <button className="reledit-submit" type="submit" disabled={!targetPersonId}>
                    Create Relationship Edge
                  </button>
                </>
              )}
            </form>
          )}

          {/* TAB 3: MERGE DUPLICATES */}
          {activeTab === 'merge' && (
            <form className="reledit-form" onSubmit={handleMerge}>
              <p className="reledit-hint">
                If you created a duplicate node (e.g. two Sujathas), select the duplicate below. It will merge all connections into <strong>{person.name}</strong> and delete the duplicate node!
              </p>

              <div className="reledit-field">
                <label className="reledit-label">Select Duplicate Person to Merge</label>
                <select
                  className="reledit-select"
                  value={duplicateId}
                  onChange={(e) => setDuplicateId(e.target.value)}
                  required
                >
                  <option value="">-- Pick Duplicate Node --</option>
                  {duplicateCandidates.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button className="reledit-submit reledit-submit--danger" type="submit" disabled={!duplicateId}>
                Merge Duplicate Node
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
