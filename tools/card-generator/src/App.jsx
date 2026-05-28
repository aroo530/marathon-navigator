import { useState, useRef } from 'react';
import JSZip from 'jszip';
import LayoutEditor from './LayoutEditor';
import './App.css';

const STEPS = ['CSV', 'Import', 'Configure', 'Generate', 'Done'];

// ── CSV parser — handles quoted fields ────────────────────────────────────────

function parseLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (line[i] === ',' && !inQ) {
      result.push(cur); cur = '';
    } else {
      cur += line[i];
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => h.trim().toLowerCase());

  const col = (...keys) => headers.findIndex(h => keys.some(k => h === k || h.includes(k)));
  const iName   = col('name', 'full name', 'full_name', 'participant');
  const iFamily = col('family', 'team', 'group');
  const iPhoto  = col('photo_url', 'photo url', 'photo', 'image url', 'image', 'picture');

  return lines.slice(1).map(line => {
    const vals = parseLine(line);
    return {
      name:      (vals[iName]   ?? '').trim(),
      family:    (vals[iFamily] ?? '').trim(),
      photo_url: (vals[iPhoto]  ?? '').trim(),
    };
  }).filter(r => r.name && r.family);
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_ICON = { pending: '○', generating: '⟳', done: '✓', error: '✗' };

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]               = useState(0);
  const [csvRows, setCsvRows]         = useState([]);
  const [marathonId, setMarathonId]   = useState('');
  const [importing, setImporting]     = useState(false);
  const [importLog, setImportLog]     = useState([]); // [{text, type}]
  const [participants, setParticipants] = useState([]);
  const [template, setTemplate]       = useState(null); // {base64, width, height}
  const [layoutObj, setLayoutObj]     = useState(null); // layout as object
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonDraft, setJsonDraft]     = useState(''); // raw JSON when editing
  const [aiPrompt, setAiPrompt]       = useState('');
  const [cards, setCards]             = useState([]); // [{participant, status, cardBase64, error}]
  const templateRef = useRef();

  // ── Step 0: CSV ─────────────────────────────────────────────────────────────

  function handleCSVFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsvRows(parseCSV(ev.target.result));
    reader.readAsText(file);
  }

  // ── Step 1: Import ──────────────────────────────────────────────────────────

  async function handleImport() {
    setImporting(true);
    setStep(1);
    setImportLog([{ text: `Importing ${csvRows.length} rows…`, type: 'info' }]);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: csvRows, marathonId: Number(marathonId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const log = data.participants.map(p =>
        p.error
          ? { text: `✗ ${p.name} — ${p.error}`, type: 'error' }
          : { text: `${p.isNew ? '✓ Created' : '↺ Exists'} ${p.name} (${p.family})`, type: p.isNew ? 'created' : 'existing' }
      );
      setImportLog(log);
      setParticipants(data.participants.filter(p => !p.error));
    } catch (e) {
      setImportLog([{ text: `Error: ${e.message}`, type: 'error' }]);
    } finally {
      setImporting(false);
      setStep(2);
    }
  }

  // ── Step 2: Template upload ──────────────────────────────────────────────────

  async function handleTemplateFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const base64 = ev.target.result.split(',')[1];
      const res = await fetch('/api/set-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateBase64: base64 }),
      });
      const data = await res.json();
      if (res.ok) {
        setTemplate({ base64, width: data.width, height: data.height });
        setLayoutObj(data.defaultLayout);
        setJsonDraft(JSON.stringify(data.defaultLayout, null, 2));
      }
    };
    reader.readAsDataURL(file);
  }

  // ── Step 3: Generate ─────────────────────────────────────────────────────────

  async function handleGenerate() {
    setStep(3);
    const parsedLayout = layoutObj;

    const initial = participants.map(p => ({ participant: p, status: 'pending', cardBase64: null, error: null }));
    setCards(initial);
    const results = [...initial];

    for (let i = 0; i < participants.length; i++) {
      results[i] = { ...results[i], status: 'generating' };
      setCards([...results]);

      try {
        const res = await fetch('/api/generate-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participant: participants[i],
            layout: parsedLayout,
            prompt: aiPrompt || null,
          }),
        });
        const data = await res.json();
        results[i] = res.ok
          ? { ...results[i], status: 'done', cardBase64: data.card }
          : { ...results[i], status: 'error', error: data.error };
      } catch (e) {
        results[i] = { ...results[i], status: 'error', error: e.message };
      }

      setCards([...results]);
    }

    setStep(4);
  }

  // ── Step 4: Download ─────────────────────────────────────────────────────────

  async function handleDownload() {
    const zip = new JSZip();
    for (const { participant, cardBase64, status } of cards) {
      if (status !== 'done' || !cardBase64) continue;
      const safe = participant.name.replace(/[^\w؀-ۿ]/g, '_');
      zip.folder(participant.family).file(`${safe}.png`, cardBase64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'cards.zip',
    });
    a.click();
  }

  function handleStartOver() {
    setStep(0);
    setCsvRows([]);
    setMarathonId('');
    setImporting(false);
    setImportLog([]);
    setParticipants([]);
    setTemplate(null);
    setLayoutObj(null);
    setShowJsonEditor(false);
    setJsonDraft('');
    setAiPrompt('');
    setCards([]);
    if (templateRef.current) templateRef.current.value = '';
  }

  function handleBack() {
    if (step === 4 || step === 3) setStep(2);
    else if (step === 2) setStep(0);
  }

  function handleStepClick(i) {
    // Only allow clicking back to completed steps (not forward, not during generation)
    if (i >= step) return;
    if (step === 3) return; // can't navigate away mid-generation
    if (i === 0) setStep(0);
    else if (i === 1) return; // import is transient, skip to configure
    else if (i === 2 && step > 2) setStep(2);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const doneCount = cards.filter(c => c.status === 'done').length;

  return (
    <div className="app">
      <header>
        <h1>Card Generator</h1>
        <nav className="steps">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`step ${i === step ? 'active' : i < step ? 'done' : ''} ${i < step && step !== 3 ? 'clickable' : ''}`}
              onClick={() => handleStepClick(i)}
            >
              <div className="step-num">{i < step ? '✓' : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </nav>
      </header>

      <main>

        {/* ── CSV ── */}
        {step === 0 && (
          <section>
            <h2>Upload CSV</h2>
            <p className="hint">
              Required columns: <code>name</code>, <code>family</code> (or <code>team</code>)
              &nbsp;— optional: <code>photo_url</code>
            </p>

            <div className="row gap">
              <label className="file-btn">
                Choose CSV <input type="file" accept=".csv" onChange={handleCSVFile} hidden />
              </label>
              <input
                className="input"
                placeholder="Marathon ID"
                value={marathonId}
                onChange={e => setMarathonId(e.target.value)}
              />
            </div>

            {csvRows.length > 0 && (
              <>
                <p className="badge">{csvRows.length} rows parsed</p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Name</th><th>Family</th><th>Photo URL</th></tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 8).map((r, i) => (
                        <tr key={i}>
                          <td>{r.name}</td>
                          <td>{r.family}</td>
                          <td className="url-cell">{r.photo_url || '—'}</td>
                        </tr>
                      ))}
                      {csvRows.length > 8 && (
                        <tr><td colSpan={3} className="more">…and {csvRows.length - 8} more</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="nav-row">
                  <button
                    className="btn primary"
                    disabled={!marathonId || importing}
                    onClick={handleImport}
                  >
                    Import to Supabase →
                  </button>
                  <button className="btn ghost" onClick={handleStartOver}>
                    ↺ Start Over
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Import ── */}
        {step === 1 && (
          <section>
            <h2>Importing…</h2>
            <div className="log">
              {importLog.map((l, i) => (
                <div key={i} className={`log-line ${l.type}`}>{l.text}</div>
              ))}
            </div>
          </section>
        )}

        {/* ── Configure ── */}
        {step === 2 && (
          <section>
            <h2>Configure Card</h2>

            <details className="import-summary">
              <summary>{participants.length} participants imported</summary>
              <div className="log compact">
                {importLog.map((l, i) => (
                  <div key={i} className={`log-line ${l.type}`}>{l.text}</div>
                ))}
              </div>
            </details>

            <div className="field">
              <label>Card Template (PNG / JPG)</label>
              <label className="file-btn">
                Choose Template
                <input type="file" accept="image/*" ref={templateRef} onChange={handleTemplateFile} hidden />
              </label>
              {template && (
                <p className="hint mt">{template.width} × {template.height} px — layout auto-filled below</p>
              )}
            </div>

            <div className="field">
              <label>AI Edit Prompt <span className="optional">(optional — leave blank to use original photos)</span></label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="e.g. Remove the background, keep only the person, render in a vibrant cartoon style…"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
            </div>

            {layoutObj && template && (
              <div className="field">
                <label>
                  Layout Config <span className="optional">(drag elements to position, resize with corner handles)</span>
                </label>
                <LayoutEditor
                  templateBase64={template.base64}
                  templateWidth={template.width}
                  templateHeight={template.height}
                  layout={layoutObj}
                  onChange={newLayout => {
                    setLayoutObj(newLayout);
                    if (showJsonEditor) setJsonDraft(JSON.stringify(newLayout, null, 2));
                  }}
                />
                <div className="json-toggle-row">
                  <button
                    type="button"
                    className="btn-text"
                    onClick={() => {
                      if (!showJsonEditor) setJsonDraft(JSON.stringify(layoutObj, null, 2));
                      setShowJsonEditor(v => !v);
                    }}
                  >
                    {showJsonEditor ? '▲ Hide JSON' : '▼ Show JSON'}
                  </button>
                </div>
                {showJsonEditor && (
                  <div className="json-editor-wrap">
                    <textarea
                      className="textarea mono"
                      rows={18}
                      value={jsonDraft}
                      onChange={e => {
                        setJsonDraft(e.target.value);
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setLayoutObj(parsed);
                        } catch {}
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="nav-row">
              <button
                className="btn primary"
                disabled={!template || !layoutObj}
                onClick={handleGenerate}
              >
                Generate All {participants.length} Cards →
              </button>
              <div className="nav-row-right">
                <button className="btn ghost" onClick={handleBack}>
                  ← Back
                </button>
                <button className="btn ghost" onClick={handleStartOver}>
                  ↺ Start Over
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Generate / Done ── */}
        {(step === 3 || step === 4) && (
          <section>
            <div className="gen-header">
              <h2>{step === 4 ? 'Done!' : `Generating… ${doneCount} / ${cards.length}`}</h2>
              {step === 4 && (
                <button className="btn primary" onClick={handleDownload}>
                  ⬇ Download ZIP
                </button>
              )}
            </div>

            {step === 3 && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${cards.length ? (doneCount / cards.length) * 100 : 0}%` }}
                />
              </div>
            )}

            <div className="card-grid">
              {cards.map((c, i) => (
                <div key={i} className={`card-item ${c.status}`}>
                  <div className="card-thumb">
                    {c.cardBase64
                      ? <img src={`data:image/png;base64,${c.cardBase64}`} alt={c.participant.name} />
                      : <span className="status-icon">{STATUS_ICON[c.status]}</span>
                    }
                  </div>
                  <div className="card-info">
                    <strong>{c.participant.name}</strong>
                    <span>{c.participant.family}</span>
                    {c.error && <span className="err">{c.error}</span>}
                  </div>
                </div>
              ))}
            </div>

            {step === 4 && (
              <div className="nav-row">
                <button className="btn ghost" onClick={handleBack}>
                  ← Back to Configure
                </button>
                <button className="btn ghost" onClick={handleStartOver}>
                  ↺ Start Over
                </button>
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
}
