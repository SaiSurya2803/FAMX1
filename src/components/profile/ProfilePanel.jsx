import { useEffect, useRef, useState } from 'react';
import { useFamilyStore } from '../../store/familyStore';
import { deriveRelationship } from '../../utils/relationshipEngine';
import { soundFX } from '../../utils/soundEffects';
import './ProfilePanel.css';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return dateStr; }
}

function calculateAge(birthDateStr, deathDateStr) {
  if (!birthDateStr) return null;
  try {
    const birth = new Date(birthDateStr);
    const end = deathDateStr ? new Date(deathDateStr) : new Date();
    let age = end.getFullYear() - birth.getFullYear();
    const m = end.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  } catch { return null; }
}

function cleanHandle(val) {
  if (!val) return '';
  return val.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?(instagram\.com|facebook\.com|snapchat\.com\/add)\//i, '').replace(/\/$/, '');
}

export function ProfilePanel({ personId, onClose, onAddRelative, onEditRelations }) {
  const panelRef  = useRef(null);
  const fileRef   = useRef(null);
  const [editing, setEditing] = useState(false);

  const people       = useFamilyStore((s) => s.people);
  const edges        = useFamilyStore((s) => s.edges);
  const meId         = useFamilyStore((s) => s.meId);
  const updatePerson = useFamilyStore((s) => s.updatePerson);
  const deletePerson = useFamilyStore((s) => s.deletePerson);

  const person    = personId ? people[personId] : null;
  const isMe      = person?.id === meId;

  // Derive Canonical Relationship & Path Explanation from Graph
  const derivedRel = (meId && personId) ? deriveRelationship(meId, personId, people, edges) : null;
  const relToMe = isMe ? 'YOU' : (derivedRel?.culturalTerm || derivedRel?.displayName || 'Family Relative');

  // Local edit form state
  const [form, setForm] = useState({});
  useEffect(() => {
    if (person) {
      setForm({
        memberNo:   person.memberNo   || '',
        name:       person.name       || '',
        birthDate:  person.birthDate  || '',
        birthPlace: person.birthPlace || '',
        isDeceased: !!person.isDeceased,
        deathDate:  person.deathDate  || '',
        gender:     person.gender     || 'unknown',
        phone:      person.phone      || '',
        whatsapp:   person.whatsapp   || person.phone || '',
        instagram:  person.instagram  || '',
        facebook:   person.facebook   || '',
        snapchat:   person.snapchat   || '',
        email:      person.email      || '',
        photo:      person.photo      || null,
      });
    }
    setEditing(false);
  }, [personId, person]);

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
    soundFX.playSuccess();
    updatePerson(personId, form);
    setEditing(false);
  };

  const handleDelete = () => {
    soundFX.playPop();
    if (confirm(`Remove ${person.name} from your Kinsutra graph?`)) {
      deletePerson(personId);
      onClose();
    }
  };

  const displayPerson = editing ? form : person;

  // Clean contact numbers & handles
  const rawPhone = displayPerson.phone || displayPerson.whatsapp || '';
  const telUrl = rawPhone ? `tel:${rawPhone.replace(/\s+/g, '')}` : null;

  // WhatsApp suite
  const waNumber = (displayPerson.whatsapp || rawPhone).replace(/\D/g, '');
  const waChatUrl = waNumber ? `https://wa.me/${waNumber}` : null;
  const waVoiceUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi ${displayPerson.name.split(' ')[0]}! Are you available for a WhatsApp voice call?`)}` : null;
  const waVideoUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi ${displayPerson.name.split(' ')[0]}! Let's connect on a WhatsApp video call.`)}` : null;

  // Social URLs
  const igHandle = cleanHandle(displayPerson.instagram);
  const igUrl = igHandle ? `https://instagram.com/${igHandle}` : null;

  const fbHandle = cleanHandle(displayPerson.facebook);
  const fbUrl = fbHandle ? `https://facebook.com/${fbHandle}` : null;

  const snapHandle = cleanHandle(displayPerson.snapchat);
  const snapUrl = snapHandle ? `https://snapchat.com/add/${snapHandle}` : null;

  const age = calculateAge(displayPerson.birthDate, displayPerson.isDeceased ? displayPerson.deathDate : null);

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
        {/* Header row with Edit & Close */}
        <div className="profile-panel__header">
          <div className="profile-panel__header-tag">
            <span className="profile-panel__no-badge">
              #{displayPerson.memberNo || '01'}
            </span>
            <span className="profile-panel__member-title">Family Member</span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="profile-panel__edit-btn"
              onClick={() => {
                soundFX.playPop();
                if (editing) handleSave();
                else setEditing(true);
              }}
              title={editing ? 'Save changes' : 'Edit profile'}
            >
              {editing ? '💾 Save' : '✏️ Edit'}
            </button>
            <button
              className="profile-panel__close"
              onClick={() => {
                soundFX.playPop();
                setEditing(false);
                onClose();
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Polaroid Keepsake Memory Photo Frame ──────────── */}
        <div className="profile-polaroid-wrap">
          <div className="profile-polaroid-card">
            {/* Washi tape at top */}
            <div className="profile-polaroid-tape" />
            {/* Red 3D pushpin */}
            <div className="profile-polaroid-pin" />

            {/* Photo frame */}
            <div className="profile-polaroid-photo">
              {displayPerson.photo ? (
                <img src={displayPerson.photo} alt={displayPerson.name} />
              ) : (
                <div className="profile-polaroid-avatar-fallback">
                  <span>{getInitials(displayPerson.name)}</span>
                </div>
              )}

              {/* Deceased Memorial Badge */}
              {displayPerson.isDeceased && (
                <div className="profile-polaroid-rip-badge">
                  <span>🕯️ IN MEMORY</span>
                </div>
              )}

              {editing && (
                <button
                  type="button"
                  className="profile-polaroid-photo-upload-btn"
                  onClick={() => fileRef.current?.click()}
                >
                  📷 Change Photo
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>

            {/* Chin of Polaroid Card */}
            <div className="profile-polaroid-chin">
              {editing ? (
                <input
                  className="profile-panel__name-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  autoFocus
                />
              ) : (
                <h2 className="profile-polaroid-name">{person.name}</h2>
              )}

              <p className="profile-polaroid-role">{relToMe.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* ── Deceased Status Banner ────────────────────────── */}
        {displayPerson.isDeceased && (
          <div className="profile-memorial-banner">
            <span className="profile-memorial-candle">🕯️</span>
            <div>
              <p className="profile-memorial-title">In Loving Memory (Rest In Peace)</p>
              <p className="profile-memorial-date">
                Passed away on {formatDate(displayPerson.deathDate) || 'Date recorded'}
                {age !== null && ` • Lived ${age} years`}
              </p>
            </div>
          </div>
        )}

        {/* ── Direct Contact & Calling Suite (WhatsApp Video, Voice, Phone) ── */}
        {!editing && (
          <div className="profile-contact-suite">
            <p className="profile-suite-title">DIRECT CONTACT & CALLING</p>

            <div className="profile-contact-grid">
              {/* Phone Direct Call */}
              {telUrl ? (
                <a href={telUrl} className="profile-action-pill profile-action-pill--phone" title="Call directly via phone">
                  <span>📞 Call Phone</span>
                </a>
              ) : (
                <span className="profile-action-pill profile-action-pill--disabled">📞 No Phone</span>
              )}

              {/* WhatsApp Message */}
              {waChatUrl ? (
                <a href={waChatUrl} target="_blank" rel="noreferrer" className="profile-action-pill profile-action-pill--wa" title="Open WhatsApp Chat">
                  <span>💬 WhatsApp Chat</span>
                </a>
              ) : null}

              {/* WhatsApp Voice Call */}
              {waVoiceUrl ? (
                <a href={waVoiceUrl} target="_blank" rel="noreferrer" className="profile-action-pill profile-action-pill--voice" title="WhatsApp Voice Direct Link">
                  <span>🎙️ WhatsApp Voice</span>
                </a>
              ) : null}

              {/* WhatsApp Video Call */}
              {waVideoUrl ? (
                <a href={waVideoUrl} target="_blank" rel="noreferrer" className="profile-action-pill profile-action-pill--video" title="WhatsApp Video Call Direct Link">
                  <span>📹 WhatsApp Video</span>
                </a>
              ) : null}
            </div>
          </div>
        )}

        {/* ── Social Profiles Suite (Instagram, Facebook, Snapchat) ── */}
        {!editing && (
          <div className="profile-social-suite">
            <p className="profile-suite-title">SOCIAL PROFILES</p>

            <div className="profile-social-row">
              {/* Instagram */}
              {igUrl ? (
                <a href={igUrl} target="_blank" rel="noreferrer" className="profile-social-btn profile-social-btn--ig" title="View Instagram Profile">
                  <span className="social-icon">📸</span>
                  <span>@{igHandle}</span>
                </a>
              ) : (
                <span className="profile-social-empty">Instagram: Not linked</span>
              )}

              {/* Facebook */}
              {fbUrl ? (
                <a href={fbUrl} target="_blank" rel="noreferrer" className="profile-social-btn profile-social-btn--fb" title="View Facebook Profile">
                  <span className="social-icon">📘</span>
                  <span>Facebook</span>
                </a>
              ) : (
                <span className="profile-social-empty">Facebook: Not linked</span>
              )}

              {/* Snapchat (Optional) */}
              {snapUrl ? (
                <a href={snapUrl} target="_blank" rel="noreferrer" className="profile-social-btn profile-social-btn--snap" title="View Snapchat Profile">
                  <span className="social-icon">👻</span>
                  <span>{snapHandle}</span>
                </a>
              ) : null}
            </div>
          </div>
        )}

        <div className="profile-panel__divider" />

        {/* ── Comprehensive Field Details (View / Edit) ─────── */}
        <div className="profile-panel__fields">
          
          {/* Member Number */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Member Number (No.)</span>
            {editing ? (
              <input
                className="profile-panel__field-input"
                type="number"
                placeholder="e.g. 1, 2, 7"
                value={form.memberNo}
                onChange={(e) => setForm((f) => ({ ...f, memberNo: e.target.value }))}
              />
            ) : (
              <span className="profile-panel__field-value">#{displayPerson.memberNo || '01'}</span>
            )}
          </div>

          {/* Date of Birth (DOB) */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Date of Birth (DOB)</span>
            {editing ? (
              <input
                className="profile-panel__field-input"
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
              />
            ) : (
              <span className="profile-panel__field-value">
                {formatDate(person.birthDate) ? (
                  <>
                    🎂 {formatDate(person.birthDate)}
                    {age !== null && <span className="profile-field-age"> ({age} years old)</span>}
                  </>
                ) : (
                  <em className="profile-panel__field-empty">Not set</em>
                )}
              </span>
            )}
          </div>

          {/* Deceased Toggle & Passing Date */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Living Status / Deceased</span>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.isDeceased}
                    onChange={(e) => setForm((f) => ({ ...f, isDeceased: e.target.checked }))}
                  />
                  <span>Relative is deceased (Rest In Peace)</span>
                </label>
                {form.isDeceased && (
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Date of Passing:</span>
                    <input
                      className="profile-panel__field-input"
                      type="date"
                      value={form.deathDate}
                      onChange={(e) => setForm((f) => ({ ...f, deathDate: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            ) : (
              <span className="profile-panel__field-value">
                {displayPerson.isDeceased ? (
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>
                    🕯️ Deceased ({formatDate(displayPerson.deathDate) || 'Date recorded'})
                  </span>
                ) : (
                  <span style={{ color: '#10b981', fontWeight: 600 }}>🟢 Living</span>
                )}
              </span>
            )}
          </div>

          {/* Phone Number */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Phone Number</span>
            {editing ? (
              <input
                className="profile-panel__field-input"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value, whatsapp: f.whatsapp || e.target.value }))}
              />
            ) : displayPerson.phone ? (
              <a href={telUrl} className="profile-panel__field-value profile-panel__link">
                📞 {displayPerson.phone} (Tap to call)
              </a>
            ) : (
              <em className="profile-panel__field-empty">Not set</em>
            )}
          </div>

          {/* WhatsApp Number */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">WhatsApp Number</span>
            {editing ? (
              <input
                className="profile-panel__field-input"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
              />
            ) : displayPerson.whatsapp ? (
              <a href={waChatUrl} target="_blank" rel="noreferrer" className="profile-panel__field-value profile-panel__link">
                🟢 {displayPerson.whatsapp} (WhatsApp enabled)
              </a>
            ) : (
              <em className="profile-panel__field-empty">Not set</em>
            )}
          </div>

          {/* Instagram Handle */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Instagram Profile</span>
            {editing ? (
              <input
                className="profile-panel__field-input"
                type="text"
                placeholder="username or link"
                value={form.instagram}
                onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
              />
            ) : igUrl ? (
              <a href={igUrl} target="_blank" rel="noreferrer" className="profile-panel__field-value profile-panel__link">
                📸 @{igHandle} (Open Profile)
              </a>
            ) : (
              <em className="profile-panel__field-empty">Not set</em>
            )}
          </div>

          {/* Facebook Profile */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Facebook Profile</span>
            {editing ? (
              <input
                className="profile-panel__field-input"
                type="text"
                placeholder="username or link"
                value={form.facebook}
                onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))}
              />
            ) : fbUrl ? (
              <a href={fbUrl} target="_blank" rel="noreferrer" className="profile-panel__field-value profile-panel__link">
                📘 {fbHandle} (Open Profile)
              </a>
            ) : (
              <em className="profile-panel__field-empty">Not set</em>
            )}
          </div>

          {/* Snapchat (Optional) */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Snapchat (Optional)</span>
            {editing ? (
              <input
                className="profile-panel__field-input"
                type="text"
                placeholder="snapchat username"
                value={form.snapchat}
                onChange={(e) => setForm((f) => ({ ...f, snapchat: e.target.value }))}
              />
            ) : snapUrl ? (
              <a href={snapUrl} target="_blank" rel="noreferrer" className="profile-panel__field-value profile-panel__link">
                👻 {snapHandle} (Open Snapchat)
              </a>
            ) : (
              <em className="profile-panel__field-empty">Optional / Not set</em>
            )}
          </div>

          {/* Birthplace */}
          <div className="profile-panel__field">
            <span className="profile-panel__field-label">Birthplace</span>
            {editing ? (
              <input
                className="profile-panel__field-input"
                type="text"
                placeholder="City, Country"
                value={form.birthPlace}
                onChange={(e) => setForm((f) => ({ ...f, birthPlace: e.target.value }))}
              />
            ) : (
              <span className="profile-panel__field-value">
                {displayPerson.birthPlace || <em className="profile-panel__field-empty">Not set</em>}
              </span>
            )}
          </div>
        </div>

        <div className="profile-panel__divider" />

        {/* ── Actions Row ───────────────────────────────────── */}
        <div className="profile-panel__actions">
          <button
            className="profile-panel__btn profile-panel__btn--primary shimmer-btn"
            onClick={() => {
              soundFX.playPop();
              onAddRelative(personId);
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add Relative for {person.name.split(' ')[0]}
          </button>

          <button
            className="profile-panel__btn profile-panel__btn--secondary"
            onClick={() => {
              soundFX.playPop();
              onEditRelations?.(personId);
            }}
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
