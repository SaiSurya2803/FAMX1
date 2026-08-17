import { useState } from 'react';
import { useFamilyStore } from '../store/familyStore';
import './Groups.css';

function getInitials(name) {
  return name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export function Groups() {
  const groups = useFamilyStore((s) => s.groups);
  const people = useFamilyStore((s) => s.people);
  const meId = useFamilyStore((s) => s.meId);
  const createGroup = useFamilyStore((s) => s.createGroup);
  const getNeighbors = useFamilyStore((s) => s.getNeighbors);

  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const neighbors = meId ? getNeighbors(meId) : [];

  const toggleMember = (id) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    createGroup(groupName.trim(), [meId, ...selectedMembers], groupDesc.trim());
    setGroupName('');
    setGroupDesc('');
    setSelectedMembers([]);
    setShowCreate(false);
  };

  return (
    <div className="groups-page">
      <div className="groups-header">
        <h1 className="groups-title">Family Groups</h1>
        <button
          className="groups-create-btn"
          onClick={() => setShowCreate(true)}
          id="create-group-btn"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          New group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="groups-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="18" cy="16" r="6" stroke="var(--text-tertiary)" strokeWidth="1.5" />
            <circle cx="30" cy="16" r="6" stroke="var(--text-tertiary)" strokeWidth="1.5" />
            <path d="M6 38c0-7 5-12 12-12h12c7 0 12 5 12 12" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="groups-empty__title">No groups yet</p>
          <p className="groups-empty__sub">Create a group to connect family branches, plan events, or chat together.</p>
          <button className="groups-empty__btn" onClick={() => setShowCreate(true)}>
            Create first group
          </button>
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map((group) => {
            const members = group.memberIds
              .map((id) => people[id])
              .filter(Boolean);
            return (
              <div key={group.id} className="group-card">
                <div className="group-card__avatars">
                  {members.slice(0, 4).map((m) => (
                    <div key={m.id} className="group-card__avatar">
                      {getInitials(m.name)}
                    </div>
                  ))}
                  {members.length > 4 && (
                    <div className="group-card__avatar group-card__avatar--more">
                      +{members.length - 4}
                    </div>
                  )}
                </div>
                <div className="group-card__info">
                  <h3 className="group-card__name">{group.name}</h3>
                  {group.description && (
                    <p className="group-card__desc">{group.description}</p>
                  )}
                  <span className="group-card__count">
                    {members.length} {members.length === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create group modal */}
      {showCreate && (
        <div className="groups-modal-scrim" onClick={() => setShowCreate(false)}>
          <div className="groups-modal" onClick={(e) => e.stopPropagation()}>
            <div className="groups-modal__header">
              <h2 className="groups-modal__title">New family group</h2>
              <button
                className="groups-modal__close"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <form className="groups-modal__form" onSubmit={handleCreate}>
              <div className="groups-modal__field">
                <label className="groups-modal__label" htmlFor="g-name">Group name *</label>
                <input
                  id="g-name"
                  className="groups-modal__input"
                  type="text"
                  placeholder="e.g. Sharma Family"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="groups-modal__field">
                <label className="groups-modal__label" htmlFor="g-desc">Description</label>
                <input
                  id="g-desc"
                  className="groups-modal__input"
                  type="text"
                  placeholder="Optional"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                />
              </div>

              {neighbors.length > 0 && (
                <div className="groups-modal__field">
                  <label className="groups-modal__label">Add members</label>
                  <div className="groups-modal__members">
                    {neighbors.map(({ person }) => {
                      if (!person) return null;
                      const selected = selectedMembers.includes(person.id);
                      return (
                        <button
                          key={person.id}
                          type="button"
                          className={`groups-modal__member-btn ${selected ? 'groups-modal__member-btn--selected' : ''}`}
                          onClick={() => toggleMember(person.id)}
                        >
                          <span className="groups-modal__member-avatar">{getInitials(person.name)}</span>
                          <span className="groups-modal__member-name">{person.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button className="groups-modal__submit" type="submit" disabled={!groupName.trim()}>
                Create group
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
