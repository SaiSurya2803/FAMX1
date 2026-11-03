import { useState, useEffect, useRef } from 'react';
import { useFamilyStore } from '../../store/familyStore';
import { deriveRelationship } from '../../utils/relationshipEngine.js';
import './CommandPalette.css';

function searchPeople(query, people, edges, meId) {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return Object.values(people)
    .filter((p) => p.name.toLowerCase().includes(q) ||
                   (p.birthPlace || '').toLowerCase().includes(q))
    .map((p) => ({
      ...p,
      relToMe: getRelToMe(p.id, meId, edges, people),
    }))
    .slice(0, 8);
}

function getRelToMe(personId, meId, edges, people) {
  if (personId === meId) return 'You (Self)';
  if (!meId || !people[meId] || !people[personId]) return null;
  const derived = deriveRelationship(meId, personId, people, edges);
  if (derived && derived.displayName && derived.displayName !== 'Family Relative' && derived.displayName !== 'Unconnected Relative') {
    return derived.culturalTerm || derived.displayName;
  }
  const edge = edges.find(
    (e) => (e.from === personId && e.to === meId) ||
            (e.from === meId && e.to === personId)
  );
  return edge?.label || derived?.displayName || 'Family Relative';
}

function getInitials(name) {
  return name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export function CommandPalette({ isOpen, onClose, onSelectPerson }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const people = useFamilyStore((s) => s.people);
  const edges = useFamilyStore((s) => s.edges);
  const meId = useFamilyStore((s) => s.meId);

  const results = searchPeople(query, people, edges, meId);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === 'Enter' && results[cursor]) {
        onSelectPerson(results[cursor].id);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, results, cursor, onClose, onSelectPerson]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handle = (e) => {
      if ((e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) &&
          document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        // trigger open from parent — this is handled in parent
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="cmd-scrim" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search family">
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-palette__input-row">
          <svg className="cmd-palette__icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            className="cmd-palette__input"
            type="text"
            placeholder="Search your family..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            aria-label="Search family members"
          />
          <kbd className="cmd-palette__esc">esc</kbd>
        </div>

        {results.length > 0 && (
          <ul className="cmd-palette__results" role="listbox">
            {results.map((person, i) => (
              <li
                key={person.id}
                role="option"
                aria-selected={i === cursor}
                className={`cmd-palette__result ${i === cursor ? 'cmd-palette__result--active' : ''}`}
                onClick={() => { onSelectPerson(person.id); onClose(); }}
                onMouseEnter={() => setCursor(i)}
              >
                <div className="cmd-palette__result-avatar">{getInitials(person.name)}</div>
                <div className="cmd-palette__result-info">
                  <span className="cmd-palette__result-name">{person.name}</span>
                  {person.relToMe && (
                    <span className="cmd-palette__result-rel">{person.relToMe}</span>
                  )}
                  {person.birthPlace && (
                    <span className="cmd-palette__result-place">{person.birthPlace}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {query && results.length === 0 && (
          <div className="cmd-palette__empty">
            No family members match &ldquo;{query}&rdquo;
          </div>
        )}

        {!query && (
          <div className="cmd-palette__hint">
            Start typing a name or place to search your family
          </div>
        )}
      </div>
    </div>
  );
}
