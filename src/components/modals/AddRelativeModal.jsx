import { useState, useEffect, useRef } from 'react';
import { useFamilyStore, RELATIONSHIP_TYPES, KINSHIP_CATALOG } from '../../store/familyStore';
import { soundFX } from '../../utils/soundEffects';
import './AddRelativeModal.css';

/**
 * Edge direction builder matching graph layout convention:
 *   PARENT:      ancestor -> descendant
 *   GRANDPARENT: gp -> gc
 *   SPOUSE:      bidirectional
 *   SIBLING:     bidirectional
 */
function buildEdge(relType, anchorId, targetId) {
  switch (relType) {
    case RELATIONSHIP_TYPES.PARENT:
      return { from: targetId, to: anchorId, type: RELATIONSHIP_TYPES.PARENT };
    case RELATIONSHIP_TYPES.CHILD:
      return { from: anchorId, to: targetId, type: RELATIONSHIP_TYPES.PARENT };
    case RELATIONSHIP_TYPES.SPOUSE:
      return { from: targetId, to: anchorId, type: RELATIONSHIP_TYPES.SPOUSE };
    case RELATIONSHIP_TYPES.SIBLING:
      return { from: targetId, to: anchorId, type: RELATIONSHIP_TYPES.SIBLING };
    case RELATIONSHIP_TYPES.GRANDPARENT:
      return { from: targetId, to: anchorId, type: RELATIONSHIP_TYPES.GRANDPARENT };
    case RELATIONSHIP_TYPES.GRANDCHILD:
      return { from: anchorId, to: targetId, type: RELATIONSHIP_TYPES.GRANDPARENT };
    case RELATIONSHIP_TYPES.STEP_PARENT:
      return { from: targetId, to: anchorId, type: RELATIONSHIP_TYPES.STEP_PARENT };
    case RELATIONSHIP_TYPES.STEP_CHILD:
      return { from: anchorId, to: targetId, type: RELATIONSHIP_TYPES.STEP_PARENT };
    default:
      return { from: targetId, to: anchorId, type: relType };
  }
}

export function AddRelativeModal({ anchorId, onClose, onAdded }) {
  const people    = useFamilyStore((s) => s.people);
  const addPerson = useFamilyStore((s) => s.addPerson);
  const addEdge   = useFamilyStore((s) => s.addEdge);

  const [selectedKin, setSelectedKin] = useState(KINSHIP_CATALOG[0]);
  const [memberNo, setMemberNo]       = useState(() => String(Object.keys(people).length + 1).padStart(2, '0'));
  const [name, setName]               = useState('');
  const [birthDate, setBirthDate]     = useState('');
  const [birthPlace, setBirthPlace]   = useState('');
  const [gender, setGender]           = useState('unknown');
  const [isDeceased, setIsDeceased]   = useState(false);
  const [deathDate, setDeathDate]     = useState('');
  const [phone, setPhone]             = useState('');
  const [whatsapp, setWhatsapp]       = useState('');
  const [instagram, setInstagram]     = useState('');
  const [facebook, setFacebook]       = useState('');
  const [snapchat, setSnapchat]       = useState('');
  const [email, setEmail]             = useState('');
  const [photo, setPhoto]             = useState(null);
  const [step, setStep]               = useState(1);
  const [existingPersonId, setExistingPersonId] = useState(null);
  const [errorMsg, setErrorMsg]       = useState('');

  const inputRef = useRef(null);
  const fileRef  = useRef(null);

  const anchor = people[anchorId];

  // List of other existing people in graph for linking
  const existingPeople = Object.values(people).filter((p) => p.id !== anchorId);

  // Auto-detect existing person by name matching
  const matchingExisting = name.trim()
    ? existingPeople.find((p) => p.name.toLowerCase() === name.trim().toLowerCase())
    : null;

  useEffect(() => {
    if (step === 2) requestAnimationFrame(() => inputRef.current?.focus());
  }, [step]);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      soundFX.playPop();
      setPhoto(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let targetId = existingPersonId;

    if (!targetId) {
      if (!name.trim()) {
        setErrorMsg('Please enter a relative name.');
        return;
      }
      setErrorMsg('');
      // Check if user matched existing person
      if (matchingExisting) {
        targetId = matchingExisting.id;
      } else {
        targetId = addPerson({
          memberNo: memberNo.trim() || String(Object.keys(people).length + 1).padStart(2, '0'),
          name: name.trim(),
          birthDate,
          birthPlace,
          gender,
          isDeceased,
          deathDate: isDeceased ? deathDate : '',
          phone: phone.trim() || whatsapp.trim(),
          whatsapp: whatsapp.trim() || phone.trim(),
          instagram: instagram.trim(),
          facebook: facebook.trim(),
          snapchat: snapchat.trim(),
          email: email.trim(),
          photo,
        });
      }
    }

    if (anchorId) {
      const { from, to, type } = buildEdge(selectedKin.type, anchorId, targetId);
      addEdge(from, to, type);
    } else {
      const currentMeId = useFamilyStore.getState().meId;
      if (!currentMeId) {
        useFamilyStore.setState({ meId: targetId });
      }
    }
    soundFX.playSuccess();

    onAdded(targetId);
    onClose();
  };

  // Lock background body scroll when modal is open
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origTouch = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.touchAction = origTouch;
    };
  }, []);

  return (
    <div
      className="add-modal-scrim"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-modal__header">
          <h2 className="add-modal__title">
            {step === 1
              ? `Add relative to ${anchor?.name.split(' ')[0] || 'family'}`
              : `Details for ${selectedKin.label.split(' (')[0]}`}
          </h2>
          <button className="add-modal__close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {step === 1 && (
          <div className="add-modal__step">
            <p className="add-modal__label">Select Relationship to {anchor?.name.split(' ')[0]}</p>
            <div className="add-modal__kin-scroll">
              <div className="add-modal__rel-grid">
                {KINSHIP_CATALOG.map((kin) => (
                  <button
                    key={kin.id}
                    className={`add-modal__rel-btn ${selectedKin.id === kin.id ? 'add-modal__rel-btn--active' : ''}`}
                    onClick={() => setSelectedKin(kin)}
                    type="button"
                  >
                    <span className="add-modal__rel-emoji">{kin.emoji}</span>
                    <span className="add-modal__rel-label">{kin.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button className="add-modal__next" onClick={() => setStep(2)} type="button">
              Continue to Details
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {step === 2 && (
          <form className="add-modal__step" onSubmit={handleSubmit}>
            <button className="add-modal__back" type="button" onClick={() => setStep(1)}>← Back</button>

            {/* Option to Link Existing Person */}
            {existingPeople.length > 0 && (
              <div className="add-modal__link-existing-section">
                <label className="add-modal__field-label">Link Existing Family Member?</label>
                <select
                  className="add-modal__input add-modal__select"
                  value={existingPersonId || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setExistingPersonId(val || null);
                    if (val) {
                      const p = people[val];
                      if (p) setName(p.name);
                    }
                  }}
                >
                  <option value="">-- Create New Person --</option>
                  {existingPeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      Link existing: {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!existingPersonId && (
              <>
                {/* Photo Upload */}
                <div className="add-modal__photo-row">
                  <div
                    className="add-modal__photo-preview"
                    onClick={() => fileRef.current?.click()}
                    role="button"
                    tabIndex={0}
                  >
                    {photo
                      ? <img src={photo} alt="Preview" className="add-modal__photo-img" />
                      : <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                          <circle cx="11" cy="9" r="4" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M3 19c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                    }
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
                  <button type="button" className="add-modal__photo-btn" onClick={() => fileRef.current?.click()}>
                    {photo ? 'Change photo' : 'Add photo'}
                  </button>
                </div>

                <div className="add-modal__row">
                  <div className="add-modal__field" style={{ flex: 2 }}>
                    <label className="add-modal__field-label" htmlFor="add-name">Full Name *</label>
                    <input
                      id="add-name"
                      ref={inputRef}
                      className="add-modal__input"
                      type="text"
                      placeholder="e.g. Sujatha"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div className="add-modal__field" style={{ flex: 1 }}>
                    <label className="add-modal__field-label" htmlFor="add-memberNo">Member No.</label>
                    <input
                      id="add-memberNo"
                      className="add-modal__input"
                      type="text"
                      placeholder="e.g. 05"
                      value={memberNo}
                      onChange={(e) => setMemberNo(e.target.value)}
                    />
                  </div>
                </div>

                {matchingExisting && (
                  <p className="add-modal__suggestion">
                    💡 <strong>{matchingExisting.name}</strong> already exists in your graph! Submitting will link directly to them without duplicating.
                  </p>
                )}

                <div className="add-modal__row">
                  <div className="add-modal__field">
                    <label className="add-modal__field-label" htmlFor="add-birth">Date of Birth (DOB)</label>
                    <input id="add-birth" className="add-modal__input" type="date"
                      value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  </div>
                  <div className="add-modal__field">
                    <label className="add-modal__field-label" htmlFor="add-gender">Gender</label>
                    <select id="add-gender" className="add-modal__input add-modal__select"
                      value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="unknown">Prefer not to say</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Deceased Status & Passing Date */}
                <div className="add-modal__deceased-box">
                  <label className="add-modal__checkbox-label">
                    <input
                      type="checkbox"
                      checked={isDeceased}
                      onChange={(e) => setIsDeceased(e.target.checked)}
                    />
                    <span>Relative is deceased (Rest In Peace 🕯️)</span>
                  </label>
                  {isDeceased && (
                    <div className="add-modal__field" style={{ marginTop: 8 }}>
                      <label className="add-modal__field-label" htmlFor="add-death">Date of Passing (Death Date)</label>
                      <input id="add-death" className="add-modal__input" type="date"
                        value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
                    </div>
                  )}
                </div>

                {/* Direct Contact Numbers */}
                <div className="add-modal__row">
                  <div className="add-modal__field">
                    <label className="add-modal__field-label" htmlFor="add-phone">Phone Number 📞</label>
                    <input id="add-phone" className="add-modal__input" type="tel"
                      placeholder="+91 98765 43210" value={phone}
                      onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="add-modal__field">
                    <label className="add-modal__field-label" htmlFor="add-wa">WhatsApp Number 💬</label>
                    <input id="add-wa" className="add-modal__input" type="tel"
                      placeholder="+91 98765 43210" value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)} />
                  </div>
                </div>

                {/* Social Profile Handles */}
                <div className="add-modal__row">
                  <div className="add-modal__field">
                    <label className="add-modal__field-label" htmlFor="add-ig">Instagram (@username) 📸</label>
                    <input id="add-ig" className="add-modal__input" type="text"
                      placeholder="@username" value={instagram}
                      onChange={(e) => setInstagram(e.target.value)} />
                  </div>
                  <div className="add-modal__field">
                    <label className="add-modal__field-label" htmlFor="add-fb">Facebook Profile 📘</label>
                    <input id="add-fb" className="add-modal__input" type="text"
                      placeholder="facebook.com/user" value={facebook}
                      onChange={(e) => setFacebook(e.target.value)} />
                  </div>
                </div>

                <div className="add-modal__row">
                  <div className="add-modal__field">
                    <label className="add-modal__field-label" htmlFor="add-snap">Snapchat (Optional) 👻</label>
                    <input id="add-snap" className="add-modal__input" type="text"
                      placeholder="username" value={snapchat}
                      onChange={(e) => setSnapchat(e.target.value)} />
                  </div>
                  <div className="add-modal__field">
                    <label className="add-modal__field-label" htmlFor="add-place">Birthplace</label>
                    <input id="add-place" className="add-modal__input" type="text"
                      placeholder="City, Country" value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)} />
                  </div>
                </div>

                <div className="add-modal__field">
                  <label className="add-modal__field-label" htmlFor="add-email">Email Address (Optional)</label>
                  <input id="add-email" className="add-modal__input" type="email"
                    placeholder="name@email.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} />
                </div>
              </>
            )}

            {errorMsg && (
              <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              className="add-modal__submit"
              type="submit"
              disabled={!existingPersonId && !name.trim()}
            >
              {existingPersonId ? 'Link Relationship' : 'Add to Family Graph'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
