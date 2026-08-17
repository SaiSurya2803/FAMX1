import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useFamilyStore } from '../../store/familyStore';
import { deriveRelationship } from '../../utils/relationshipEngine';
import './ProfilePanel.css';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return dateStr; }
}

function genderLabel(g) {
  const map = { male: 'Male', female: 'Female', other: 'Other', unknown: '—' };
  return map[g] || '—';
}

export function ProfilePanel({ personId, onClose, onAddRelative, onEditRelations }) {
  const panelRef  = useRef(null);
  const fileRef   = useRef(null);
  const navigate  = useNavigate();
  const [editing, setEditing] = useState(false);

  const people       = useFamilyStore((s) => s.people);
  const edges        = useFamilyStore((s) => s.edges);
  const meId         = useFamilyStore((s) => s.meId);
  const getNeighbors = useFamilyStore((s) => s.getNeighbors);
  const updatePerson = useFamilyStore((s) => s.updatePerson);
  const deletePerson = useFamilyStore((s) => s.deletePerson);

  const person    = personId ? people[personId] : null;
  const neighbors = personId ? getNeighbors(personId) : [];
  const isMe      = person?.id === meId;

  // Derive Canonical Relationship & Path Explanation from Graph
  const derivedRel = (meId && personId) ? deriveRelationship(meId, personId, people, edges) : null;
  const relToMe = isMe ? 'YOU' : (derivedRel?.culturalTerm || derivedRel?.displayName || null);

  // Local edit state
  const [form, setForm] = useState({});
  useEffect(() => {
    if (person) {
      setForm({
        name:      person.name      || '',
        birthDate: person.birthDate || '',
        birthPlace:person.birthPlace|| '',
        gender:    person.gender    || 'unknown',
        whatsapp:  person.whatsapp  || '',
        email:     person.email     || '',
        photo:     person.photo     || null,
      });
    }
    setEditing(false);
  }, [personId]);

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

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, photo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updatePerson(personId, form);
    setEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`Remove ${person.name} from your Kinsutra graph?`)) {
      deletePerson(personId);
      onClose();
    }
  };

  const displayPerson = editing ? form : person;

  // Clean WhatsApp number
  const cleanWA = person.whatsapp ? person.whatsapp.replace(/\D/g, '') : null;
  const waChatUrl = cleanWA ? `https://wa.me/${cleanWA}` : null;
  const waVideoUrl = cleanWA ? `https://wa.me/${cleanWA}?text=${encodeURIComponent(`Hi ${person.name.split(' ')[0]}! Let's connect on a video call.`)}` : null;
  const mailUrl = person.email ? `mailto:${person.email}?subject=${encodeURIComponent(`Connecting via Kinsutra`)}` : null;

  return (
    <div
      className="profile-modal-scrim"
      onClick={() => { setEditing(false); onClose(); }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <aside
        ref={panelRef}
        className="profile-panel"
        onClick={(e) => e.stopPropagation()}
        role="document"
        aria-label="Person profile"
      >
        {/* Header row */}
        <div className="profile-panel__header">
          <button
            className="profile-panel__edit-btn"
            onClick={() => editing ? handleSave() : setEditing(true)}
            title={editing ? 'Save changes' : 'Edit profile'}
          >
            {editing ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M10 2l2 2-7 7H3v-2L10 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              </svg>
            )}
            {editing ? 'Save' : 'Edit'}
          </button>
          <button className="profile-panel__close" onClick={() => { setEditing(false); onClose(); }} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Avatar / Photo */}
        <div className={`profile-panel__avatar ${isMe ? 'profile-panel__avatar--me' : ''}`}>
          {displayPerson.photo ? (
            <img src={displayPerson.photo} alt={displayPerson.name} className="profile-panel__photo" />
          ) : (
            <span className="profile-panel__initials">{getInitials(displayPerson.name)}</span>
          )}
          {isMe && <div className="profile-panel__me-badge">YOU</div>}
          {editing && (
            <button
              className="profile-panel__photo-overlay"
              onClick={() => fileRef.current?.click()}
              aria-label="Change photo"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 13l4-4 3 3 3-4 4 5H1Z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
                <circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        </div>

        {/* Name */}
        {editing ? (
          <input
            className="profile-panel__name-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Full name"
            autoFocus
          />
        ) : (
          <h2 className="profile-panel__name">{person.name}</h2>
        )}

        {/* Relation to ME badge */}
        {derivedRel && !isMe && (
          <div className="profile-panel__rel-box">
            <span className="profile-panel__rel-badge">{derivedRel.displayName}</span>
            {derivedRel.culturalTerm && derivedRel.culturalTerm !== derivedRel.displayName && (
              <span className="profile-panel__rel-subterm">{derivedRel.culturalTerm}</span>
            )}
          </div>
        )}

        {/* Relationship Graph Path Explanation (Section 17) */}
        {derivedRel && derivedRel.path && derivedRel.path.length > 1 && !isMe && (
          <div className="profile-panel__path-box">
            <span className="profile-panel__path-title">Graph Path:</span>
            <div className="profile-panel__path-flow">
              {derivedRel.path.map((nodeName, idx) => (
                <span key={idx} className="profile-panel__path-step">
                  {idx > 0 && <span className="profile-panel__path-arrow"> → </span>}
                  <strong className="profile-panel__path-name">{nodeName}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PROMINENT DIRECT REDIRECT / CONNECT BAR */}
        {!isMe && !editing && (
          <div className="profile-panel__connect-bar">
            {waChatUrl && (
              <a
                href={waChatUrl}
                target="_blank"
                rel="noreferrer"
                className="profile-panel__connect-btn profile-panel__connect-btn--wa"
                title="Open WhatsApp Chat"
              >
                💬 WhatsApp Chat
              </a>
            )}

            {waVideoUrl && (
              <a
                href={waVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="profile-panel__connect-btn profile-panel__connect-btn--video"
                title="Start Video Call on WhatsApp"
              >
                📹 Video Call
              </a>
            )}

            {mailUrl && (
              <a
                href={mailUrl}
                className="profile-panel__connect-btn profile-panel__connect-btn--email"
                title="Send Email"
              >
                ✉️ Send Email
              </a>
            )}

            <button
              onClick={() => {
                onClose();
                navigate('/chat');
              }}
              className="profile-panel__connect-btn profile-panel__connect-btn--app"
              title="Kinsutra Messages"
            >
              💬 Kinsutra Chat
            </button>
          </div>
        )}

        <div className="profile-panel__divider" />

        {/* Info fields */}
        <div className="profile-panel__fields">

          {/* Date of birth */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Date of birth</span>
            {editing ? (
              <input className="profile-panel__field-input" type="date"
                value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
            ) : (
              <span className="profile-panel__field-value">
                {formatDate(person.birthDate) || <em className="profile-panel__field-empty">Not set</em>}
              </span>
            )}
          </div>

          {/* Gender */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Gender</span>
            {editing ? (
              <select className="profile-panel__field-input profile-panel__select"
                value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                <option value="unknown">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            ) : (
              <span className="profile-panel__field-value">{genderLabel(person.gender)}</span>
            )}
          </div>

          {/* Birthplace */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Birthplace</span>
            {editing ? (
              <input className="profile-panel__field-input" type="text" placeholder="City, Country"
                value={form.birthPlace} onChange={(e) => setForm((f) => ({ ...f, birthPlace: e.target.value }))} />
            ) : (
              <span className="profile-panel__field-value">
                {person.birthPlace || <em className="profile-panel__field-empty">Not set</em>}
              </span>
            )}
          </div>

          {/* WhatsApp */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">WhatsApp</span>
            {editing ? (
              <input className="profile-panel__field-input" type="tel" placeholder="+91 98765 43210"
                value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} />
            ) : person.whatsapp ? (
              <a href={waChatUrl} target="_blank" rel="noreferrer" className="profile-panel__field-value profile-panel__link">
                🟢 {person.whatsapp} (Tap to chat)
              </a>
            ) : (
              <em className="profile-panel__field-empty">Click Edit to add WhatsApp</em>
            )}
          </div>

          {/* Email */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Email</span>
            {editing ? (
              <input className="profile-panel__field-input" type="email" placeholder="name@email.com"
                value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            ) : person.email ? (
              <a href={mailUrl} className="profile-panel__field-value profile-panel__link">
                ✉️ {person.email} (Tap to mail)
              </a>
            ) : (
              <em className="profile-panel__field-empty">Click Edit to add email</em>
            )}
          </div>
        </div>

        {/* Connections */}
        {neighbors.length > 0 && (
          <>
            <div className="profile-panel__divider" />
            <section className="profile-panel__section">
              <h3 className="profile-panel__section-title">Connections</h3>
              <ul className="profile-panel__connections">
                {neighbors.map(({ person: neighbor, edge }) => (
                  <li key={edge.id} className="profile-panel__connection">
                    <div className="profile-panel__connection-avatar">
                      {neighbor.photo
                        ? <img src={neighbor.photo} alt={neighbor.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        : getInitials(neighbor.name)}
                    </div>
                    <div className="profile-panel__connection-info">
                      <span className="profile-panel__connection-name">{neighbor.name}</span>
                      <span className="profile-panel__connection-rel">{edge.label}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <div className="profile-panel__divider" />

        {/* Actions */}
        <div className="profile-panel__actions">
          <button
            className="profile-panel__btn profile-panel__btn--primary"
            onClick={() => onAddRelative(personId)}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add Relative
          </button>

          <button
            className="profile-panel__btn profile-panel__btn--secondary"
            onClick={() => onEditRelations && onEditRelations(personId)}
          >
            🔗 Manage & Edit Relations
          </button>

          {!isMe && (
            <button className="profile-panel__btn profile-panel__btn--danger" onClick={handleDelete}>
              Remove from graph
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
