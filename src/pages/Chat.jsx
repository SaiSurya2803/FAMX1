import { useState, useRef, useEffect } from 'react';
import { useFamilyStore } from '../store/familyStore';
import './Chat.css';

function getInitials(name) {
  return name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function Chat() {
  const people = useFamilyStore((s) => s.people);
  const meId = useFamilyStore((s) => s.meId);
  const messages = useFamilyStore((s) => s.messages);
  const sendMessage = useFamilyStore((s) => s.sendMessage);
  const getNeighbors = useFamilyStore((s) => s.getNeighbors);
  const getConversation = useFamilyStore((s) => s.getConversation);

  const [activePerson, setActivePerson] = useState(null);
  const [input, setInput] = useState('');
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
  const bottomRef = useRef(null);

  const neighbors = meId ? getNeighbors(meId) : [];

  const conversation = activePerson && meId
    ? getConversation(meId, activePerson)
    : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.length]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !activePerson || !meId) return;
    sendMessage(meId, activePerson, input.trim());
    setInput('');
  };

  const handleSelectPerson = (personId) => {
    setActivePerson(personId);
    setMobileView('chat');
  };

  const activePersonData = activePerson ? people[activePerson] : null;
  const activeRel = activePerson
    ? neighbors.find((n) => n.person?.id === activePerson)?.edge?.label
    : null;

  return (
    <div className="chat-page">
      {/* Sidebar */}
      <aside className={`chat-sidebar ${mobileView === 'chat' ? 'chat-sidebar--hidden' : ''}`}>
        <div className="chat-sidebar__header">
          <h1 className="chat-sidebar__title">Messages</h1>
        </div>

        {neighbors.length === 0 ? (
          <div className="chat-sidebar__empty">
            <p>Add family members to start messaging.</p>
          </div>
        ) : (
          <ul className="chat-sidebar__list">
            {neighbors.map(({ person, edge }) => {
              if (!person) return null;
              const conv = getConversation(meId, person.id);
              const last = conv[conv.length - 1];
              return (
                <li
                  key={person.id}
                  className={`chat-sidebar__item ${activePerson === person.id ? 'chat-sidebar__item--active' : ''}`}
                  onClick={() => handleSelectPerson(person.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectPerson(person.id)}
                >
                  <div className="chat-sidebar__avatar">{getInitials(person.name)}</div>
                  <div className="chat-sidebar__info">
                    <div className="chat-sidebar__name-row">
                      <span className="chat-sidebar__name">{person.name}</span>
                      {last && <span className="chat-sidebar__time">{formatDate(last.timestamp)}</span>}
                    </div>
                    <div className="chat-sidebar__sub-row">
                      <span className="chat-sidebar__rel">{edge.label}</span>
                      {last && (
                        <span className="chat-sidebar__preview">
                          {last.fromId === meId ? 'You: ' : ''}{last.text.slice(0, 30)}{last.text.length > 30 ? '…' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Main chat area */}
      <main className={`chat-main ${mobileView === 'list' ? 'chat-main--hidden' : ''}`}>
        {activePersonData ? (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <button
                className="chat-header__back"
                onClick={() => setMobileView('list')}
                aria-label="Back to conversations"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="chat-header__avatar">{getInitials(activePersonData.name)}</div>
              <div className="chat-header__info">
                <span className="chat-header__name">{activePersonData.name}</span>
                {activeRel && <span className="chat-header__rel">{activeRel}</span>}
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {conversation.length === 0 ? (
                <div className="chat-messages__empty">
                  <p>Start a conversation with {activePersonData.name.split(' ')[0]}</p>
                </div>
              ) : (
                conversation.map((msg, i) => {
                  const isMe = msg.fromId === meId;
                  const showDate = i === 0 || formatDate(msg.timestamp) !== formatDate(conversation[i - 1].timestamp);
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="chat-date-divider">
                          <span>{formatDate(msg.timestamp)}</span>
                        </div>
                      )}
                      <div className={`chat-bubble-row ${isMe ? 'chat-bubble-row--me' : ''}`}>
                        {!isMe && (
                          <div className="chat-bubble-avatar">{getInitials(activePersonData.name)}</div>
                        )}
                        <div className={`chat-bubble ${isMe ? 'chat-bubble--me' : 'chat-bubble--them'}`}>
                          <p className="chat-bubble__text">{msg.text}</p>
                          <span className="chat-bubble__time">{formatTime(msg.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form className="chat-input-row" onSubmit={handleSend}>
              <input
                className="chat-input"
                type="text"
                placeholder={`Message ${activePersonData.name.split(' ')[0]}…`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
              />
              <button
                className="chat-send-btn"
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8L2 2l3 6-3 6 12-6Z" fill="currentColor" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className="chat-main__empty">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path d="M32 8H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8l4 4 4-4h8a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Z"
                stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <p>Select a family member to message</p>
          </div>
        )}
      </main>
    </div>
  );
}
