import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useFamilyStore, RELATIONSHIP_TYPES } from '../../store/familyStore';
import { parseNaturalText, parseExcelRows } from '../../utils/aiGraphParser';
import { processTextWithAi } from '../../utils/aiLlmEngine';
import './KinsutraAgentWidget.css';

export function KinsutraAgentWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('nlp'); // 'nlp' | 'excel' | 'interview'
  const [apiKey, setApiKey] = useState(localStorage.getItem('kinsutra_ai_api_key') || '');
  const [apiProvider, setApiProvider] = useState('gemini'); // 'gemini' | 'openai'
  const [showApiConfig, setShowApiConfig] = useState(false);

  const [statusLog, setStatusLog] = useState('');
  const [logDetails, setLogDetails] = useState([]);
  const [correctedPreview, setCorrectedPreview] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Store actions
  const people = useFamilyStore((s) => s.people);
  const meId = useFamilyStore((s) => s.meId);
  const addPerson = useFamilyStore((s) => s.addPerson);
  const addEdge = useFamilyStore((s) => s.addEdge);

  const fileRef = useRef(null);

  // Save API key locally
  const handleSaveApiKey = (keyVal) => {
    setApiKey(keyVal);
    localStorage.setItem('kinsutra_ai_api_key', keyVal);
  };

  // Core execution helper: Execute parsed graph structure safely
  const executeParsedGraph = (parsedData, sourceName = '') => {
    if (!parsedData || (!parsedData.people.length && !parsedData.edges.length)) {
      setStatusLog('⚠️ No family members or relations recognized from input.');
      setLogDetails([]);
      return;
    }

    // Reset stale graph state if building a complete new AI family tree
    const shouldClear = parsedData.people.length > 2;
    let nameToId = {};
    if (shouldClear) {
      useFamilyStore.setState({ people: {}, edges: [], nodePositions: {}, meId: null });
    } else {
      Object.values(useFamilyStore.getState().people).forEach((p) => {
        nameToId[p.name.trim().toLowerCase()] = p.id;
      });
    }

    let newPeopleCount = 0;
    let newEdgeCount = 0;
    const details = [];

    // 1. Add people
    let firstPersonId = null;
    parsedData.people.forEach((p) => {
      const key = p.name.trim().toLowerCase();
      if (!nameToId[key]) {
        const id = addPerson({ name: p.name, gender: p.gender });
        nameToId[key] = id;
        if (!firstPersonId) firstPersonId = id;
        newPeopleCount++;
      } else if (!firstPersonId) {
        firstPersonId = nameToId[key];
      }
    });

    // Ensure meId is assigned to the imported family root
    const currentMeId = useFamilyStore.getState().meId;
    const currentPeople = useFamilyStore.getState().people;
    if (firstPersonId && (!currentMeId || !currentPeople[currentMeId])) {
      useFamilyStore.getState().switchPerspective(firstPersonId);
    }

    // 2. Add edges
    parsedData.edges.forEach((e) => {
      const fromId = nameToId[e.fromName.trim().toLowerCase()];
      const toId = nameToId[e.toName.trim().toLowerCase()];

      if (fromId && toId && fromId !== toId) {
        const edgeId = addEdge(fromId, toId, e.type);
        if (edgeId) {
          newEdgeCount++;
          const arrow = e.type === RELATIONSHIP_TYPES.PARENT ? '➔' : '↔';
          details.push(`${e.fromName} ${arrow} ${e.toName} (${e.type})`);
        }
      }
    });

    setStatusLog(`✅ Auto-Build Complete! Added ${newPeopleCount} members & ${newEdgeCount} connections ${sourceName ? `from ${sourceName}` : ''}.`);
    setLogDetails(details.slice(0, 10));
    useFamilyStore.getState().resetNodePositions();
    window.dispatchEvent(new CustomEvent('graph:center', { detail: { id: firstPersonId } }));
  };

  // ── Tab 1: LLM Natural Language Auto-Correct & Parse ────────
  const [nlpText, setNlpText] = useState('');

  const handleAiAutoBuild = async (e) => {
    e.preventDefault();
    if (!nlpText.trim()) return;

    setIsProcessing(true);
    setStatusLog('🤖 AI is auto-correcting typos, analyzing relations, and deploying graph...');
    setLogDetails([]);

    try {
      const result = await processTextWithAi(nlpText, apiKey, apiProvider);
      setCorrectedPreview(result.correctedText || nlpText);
      executeParsedGraph(result, 'AI Auto-Correct Engine');
    } catch (err) {
      console.error(err);
      setStatusLog(`❌ AI Processing Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setNlpText('');
    }
  };

  // ── Tab 2: Excel / CSV Import ─────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const parsed = parseExcelRows(rows);
        executeParsedGraph(parsed, file.name);
      } catch (err) {
        console.error(err);
        setStatusLog(`❌ Error reading file: ${err.message}`);
        setLogDetails([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Sample CSV Templates
  const downloadSampleTemplate = (formatType = 'multi_col') => {
    let csvContent = '';
    if (formatType === 'multi_col') {
      csvContent =
        'Name,Gender,Father,Mother,Spouse,Children,Birth Date,Birth Place\n' +
        'Nagisetty,Male,,,Hymavathi,Kiran,1950,India\n' +
        'Hymavathi,Female,,,Nagisetty,Kiran,1955,India\n' +
        'Kiran,Male,Nagisetty,Hymavathi,Sujatha,Bheema,1978,India\n' +
        'Sujatha,Female,,,Kiran,Bheema,1982,India\n' +
        'Bheema,Male,Kiran,Sujatha,Ananya,,2002,India\n';
    } else {
      csvContent =
        'Name,Relation,Relative Name\n' +
        'Nagisetty,Father,Kiran\n' +
        'Hymavathi,Spouse,Nagisetty\n' +
        'Kiran,Father,Bheema\n' +
        'Sujatha,Mother,Bheema\n' +
        'Bheema,Son,Kiran\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kinsutra_sample_${formatType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Tab 3: Interactive Interview Wizard ───────────────────
  const [wName, setWName] = useState('');
  const [wGender, setWGender] = useState('male');
  const [wFather, setWFather] = useState('');
  const [wMother, setWMother] = useState('');
  const [wSpouse, setWSpouse] = useState('');
  const [wChildren, setWChildren] = useState('');
  const [wSiblings, setWSiblings] = useState('');

  const handleWizardSubmit = (e) => {
    e.preventDefault();
    if (!wName.trim()) return;

    let textPayload = `${wName} is ${wGender}.\n`;
    if (wFather.trim()) textPayload += `${wFather} is father of ${wName}.\n`;
    if (wMother.trim()) textPayload += `${wMother} is mother of ${wName}.\n`;
    if (wFather.trim() && wMother.trim()) textPayload += `${wFather} is married to ${wMother}.\n`;
    if (wSpouse.trim()) textPayload += `${wName} is married to ${wSpouse}.\n`;

    if (wChildren.trim()) {
      const kids = wChildren.split(/[,&]+/).map((k) => k.trim()).filter(Boolean);
      kids.forEach((k) => {
        textPayload += `${wName} is father of ${k}.\n`;
      });
    }

    if (wSiblings.trim()) {
      const sibs = wSiblings.split(/[,&]+/).map((s) => s.trim()).filter(Boolean);
      sibs.forEach((s) => {
        if (wFather.trim()) textPayload += `${wFather} is father of ${s}.\n`;
        if (wMother.trim()) textPayload += `${wMother} is mother of ${s}.\n`;
      });
    }

    const parsed = parseNaturalText(textPayload);
    executeParsedGraph(parsed, 'Q&A Interview');

    setWName('');
    setWFather('');
    setWMother('');
    setWSpouse('');
    setWChildren('');
    setWSiblings('');
  };

  // Reset & Clear Graph option
  const handleResetGraph = () => {
    if (window.confirm('Are you sure you want to clear all members and reset the graph to start fresh?')) {
      useFamilyStore.setState({
        people: {},
        edges: [],
        meId: null,
      });
      setStatusLog('🧹 Graph cleared! You can now import or build a fresh tree.');
      setLogDetails([]);
      setCorrectedPreview('');
    }
  };

  return (
    <>
      {/* Floating Corner Button */}
      <button
        className="kagent-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Kinsutra AI Agent"
        id="kinsutra-ai-agent-corner-btn"
      >
        <div className="kagent-trigger__badge">
          🤖
          <span className="kagent-trigger__pulse" />
        </div>
        <span>Kinsutra AI Agent</span>
      </button>

      {/* Slide-Up Agent Drawer */}
      {isOpen && (
        <div
          className="kagent-drawer"
          id="kinsutra-ai-agent-drawer"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="kagent-drawer__header">
            <div className="kagent-drawer__title">
              <span>🤖</span>
              <span>Kinsutra AI Graph Builder</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                className="kagent-drawer__close"
                onClick={() => setShowApiConfig(!showApiConfig)}
                title="AI Key Settings"
                style={{ fontSize: '0.85rem', padding: '4px 8px' }}
              >
                ⚙️ API Key
              </button>
              <button className="kagent-drawer__close" onClick={() => setIsOpen(false)}>
                ✕
              </button>
            </div>
          </div>

          {/* Optional LLM API Key Config */}
          {showApiConfig && (
            <div style={{ background: 'var(--surface-elevated)', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>🤖 Connect Custom AI LLM (Optional)</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select
                  value={apiProvider}
                  onChange={(e) => setApiProvider(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '0.8rem' }}
                >
                  <option value="gemini">Google Gemini AI</option>
                  <option value="openai">OpenAI ChatGPT / Groq</option>
                </select>
                <input
                  type="password"
                  placeholder="Paste AI API Key..."
                  value={apiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-medium)', fontSize: '0.8rem' }}
                />
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                * Leave empty to use Kinsutra's built-in high-speed AI spell-corrector fallback.
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="kagent-tabs">
            <button
              className={`kagent-tab ${activeTab === 'nlp' ? 'kagent-tab--active' : ''}`}
              onClick={() => setActiveTab('nlp')}
            >
              ⚡ AI Auto-Correct
            </button>
            <button
              className={`kagent-tab ${activeTab === 'excel' ? 'kagent-tab--active' : ''}`}
              onClick={() => setActiveTab('excel')}
            >
              📊 Excel / CSV
            </button>
            <button
              className={`kagent-tab ${activeTab === 'interview' ? 'kagent-tab--active' : ''}`}
              onClick={() => setActiveTab('interview')}
            >
              💬 Q&A Interview
            </button>
          </div>

          {/* Drawer Body */}
          <div className="kagent-body">
            {statusLog && <div className="kagent-log">{statusLog}</div>}

            {correctedPreview && (
              <div style={{ fontSize: '0.8rem', background: 'rgba(217, 119, 6, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.2)', color: 'var(--text-primary)' }}>
                <strong>✨ AI Corrected Text:</strong>
                <div style={{ fontStyle: 'italic', marginTop: '2px', color: 'var(--brand-primary)' }}>"{correctedPreview}"</div>
              </div>
            )}

            {logDetails.length > 0 && (
              <div style={{ fontSize: '0.78rem', background: 'var(--surface-elevated)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <strong>Constructed Connections:</strong>
                <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                  {logDetails.map((det, idx) => (
                    <li key={idx}>{det}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* TAB 1: AI Natural Language Auto-Correct */}
            {activeTab === 'nlp' && (
              <form style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} onSubmit={handleAiAutoBuild}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Paste any raw, messy text or shorthand (e.g. <em>"krn is ftr of bhma n sjtha is wf"</em>). AI auto-corrects typos & deploys graph!
                </p>

                <textarea
                  className="kagent-textarea"
                  placeholder="Type or paste messy text here e.g. Kiran ftr of Bheema, Sujatha wf of Kiran..."
                  value={nlpText}
                  onChange={(e) => setNlpText(e.target.value)}
                  disabled={isProcessing}
                />

                <button type="submit" className="kagent-btn kagent-btn--primary" disabled={isProcessing}>
                  {isProcessing ? '⏳ AI Auto-Correcting & Deploying...' : '✨ Auto-Correct & Deploy Graph'}
                </button>
              </form>
            )}

            {/* TAB 2: Excel / CSV Import */}
            {activeTab === 'excel' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Upload any Excel (<strong>.xlsx</strong>) or <strong>.csv</strong> spreadsheet. Supports both:
                  <br />
                  1. <strong>Member Rows</strong>: <code>Name, Father, Mother, Spouse, Children</code>
                  <br />
                  2. <strong>Relation Rows</strong>: <code>Name, Relation, Relative Name</code>
                </p>

                <div className="kagent-excel-dropzone" onClick={() => fileRef.current?.click()}>
                  <div className="kagent-excel-dropzone__icon">📁</div>
                  <strong style={{ fontSize: '0.9rem' }}>Click or drop Excel / CSV file here</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports .xlsx, .xls, .csv</span>
                  <input
                    type="file"
                    ref={fileRef}
                    onChange={handleFileUpload}
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="kagent-btn kagent-btn--secondary" style={{ flex: 1 }} onClick={() => downloadSampleTemplate('multi_col')}>
                    ⬇️ Member Rows Template
                  </button>
                  <button className="kagent-btn kagent-btn--secondary" style={{ flex: 1 }} onClick={() => downloadSampleTemplate('edge_rows')}>
                    ⬇️ Relation Rows Template
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Interactive Q&A Interview */}
            {activeTab === 'interview' && (
              <form className="kagent-wizard" onSubmit={handleWizardSubmit}>
                <div className="kagent-wizard__bubble">
                  👋 <strong>AI Interviewer:</strong> Tell me about a person to build their 3-generation branch:
                </div>

                <div className="kagent-wizard__options">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Person's Full Name</label>
                  <input
                    className="kagent-wizard__input"
                    placeholder="e.g. Bheema"
                    value={wName}
                    onChange={(e) => setWName(e.target.value)}
                    required
                  />

                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Gender</label>
                  <select
                    className="kagent-wizard__input"
                    value={wGender}
                    onChange={(e) => setWGender(e.target.value)}
                  >
                    <option value="male">Male 👨</option>
                    <option value="female">Female 👩</option>
                  </select>

                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Father's Name (Optional)</label>
                  <input
                    className="kagent-wizard__input"
                    placeholder="e.g. Kiran"
                    value={wFather}
                    onChange={(e) => setWFather(e.target.value)}
                  />

                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Mother's Name (Optional)</label>
                  <input
                    className="kagent-wizard__input"
                    placeholder="e.g. Sujatha"
                    value={wMother}
                    onChange={(e) => setWMother(e.target.value)}
                  />

                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Spouse Name (Optional)</label>
                  <input
                    className="kagent-wizard__input"
                    placeholder="e.g. Ananya"
                    value={wSpouse}
                    onChange={(e) => setWSpouse(e.target.value)}
                  />

                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Children (Comma-separated)</label>
                  <input
                    className="kagent-wizard__input"
                    placeholder="e.g. Aditya, Kavya"
                    value={wChildren}
                    onChange={(e) => setWChildren(e.target.value)}
                  />

                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Siblings (Comma-separated)</label>
                  <input
                    className="kagent-wizard__input"
                    placeholder="e.g. Rahul, Priya"
                    value={wSiblings}
                    onChange={(e) => setWSiblings(e.target.value)}
                  />
                </div>

                <button type="submit" className="kagent-btn kagent-btn--primary">
                  🚀 Build Family Branch
                </button>
              </form>
            )}

            {/* Reset Graph Button */}
            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="kagent-btn kagent-btn--secondary"
                style={{ width: '100%', color: '#ef4444', fontSize: '0.8rem' }}
                onClick={handleResetGraph}
              >
                🧹 Clear Graph & Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
