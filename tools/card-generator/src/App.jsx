import { useState, useRef } from 'react';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import LayoutEditor from './LayoutEditor';
import CropEditor from './CropEditor';
import './App.css';

const STEPS = ['CSV', 'Import', 'Configure', 'Generate', 'Done'];

// ── Spreadsheet parser (CSV + XLSX via SheetJS) ───────────────────────────────

function parseSheet(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  // header:1 gives array-of-arrays; defval ensures empty cells are '' not undefined
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) return [];

  const rawHeaders = rows[0].map(h => String(h).trim().toLowerCase());
  const col = (...keys) => rawHeaders.findIndex(h => keys.some(k => h === k || h.includes(k)));
  const iName   = col('name', 'full name', 'full_name', 'participant', 'اسم');
  const iFamily = col('family', 'team', 'group', 'عائلة', 'فريق');
  const iPhoto  = col('photo_url', 'photo url', 'photo', 'image url', 'image', 'picture', 'صورة');

  return rows.slice(1).map(vals => ({
    name:      String(vals[iName]   ?? '').trim(),
    family:    String(vals[iFamily] ?? '').trim(),
    photo_url: String(vals[iPhoto]  ?? '').trim(),
  })).filter(r => r.name && r.family);
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_ICON = { pending: '○', generating: '⟳', done: '✓', error: '✗' };

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep]               = useState(0);
  const [csvRows, setCsvRows]         = useState([]);
  const [marathonId, setMarathonId]   = useState('');
  const [importing, setImporting]     = useState(false);
  const [lastWasDryRun, setLastWasDryRun] = useState(false);
  const [importLog, setImportLog]     = useState([]); // [{text, type}]
  const [participants, setParticipants] = useState([]);
  const [template, setTemplate]       = useState(null); // {base64, width, height}
  const [layoutObj, setLayoutObj]     = useState(null); // layout as object
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonDraft, setJsonDraft]     = useState(''); // raw JSON when editing
  const [aiPrompt, setAiPrompt]       = useState('');
  const [cards, setCards]             = useState([]); // [{participant, status, cardBase64, error}]
  const [editingIdx, setEditingIdx]   = useState(null); // index of card being edited
  const [editPrompt, setEditPrompt]   = useState('');
  // ── Team template mode ───────────────────────────────────────────────────────
  const [teamMode, setTeamMode]       = useState(false);
  // Map of team key (lowercased) → { base64, width, height } or null
  const [teamTemplateMap, setTeamTemplateMap] = useState({});
  const teamTemplateRefs = useRef({});
  const templateRef = useRef();
  const csvRef = useRef();
  const configRef = useRef();

  // Unique teams derived from CSV rows (preserving original casing for display)
  const uniqueTeams = [...new Map(
    csvRows.map(r => [r.family.toLowerCase(), r.family])
  ).values()];

  // ── Step 0: CSV ─────────────────────────────────────────────────────────────

  function handleCSVFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const data = new Uint8Array(ev.target.result);
      const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
      setCsvRows(parseSheet(workbook));
    };
    reader.readAsArrayBuffer(file);
  }

  // ── Step 1: Import ──────────────────────────────────────────────────────────

  async function handleImport(dryRun = false) {
    setImporting(true);
    setStep(1);
    setImportLog([{ text: `${dryRun ? 'Previewing' : 'Importing'} ${csvRows.length} rows…`, type: 'info' }]);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: csvRows, marathonId: Number(marathonId), dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const header = dryRun
        ? [{ text: '— Dry run — no changes written —', type: 'info' }]
        : [];

      const familyLines = (data.newFamilies ?? []).map(name =>
        ({ text: `${dryRun ? '+ Would create family' : '✓ Created family'}: ${name}`, type: 'created' })
      );

      const participantLines = data.participants.map(p =>
        p.error
          ? { text: `✗ ${p.name} — ${p.error}`, type: 'error' }
          : {
              text: `${p.isNew
                ? (dryRun ? '+ Would create' : '✓ Created')
                : '↺ Exists'} ${p.name} (${p.family}${p.isNewFamily ? ' — new family' : ''})`,
              type: p.isNew ? 'created' : 'existing',
            }
      );

      setImportLog([...header, ...familyLines, ...participantLines]);
      // Always set participants — dry run uses existing IDs where available, null for new ones
      setParticipants(data.participants.filter(p => !p.error));
    } catch (e) {
      setImportLog([{ text: `Error: ${e.message}`, type: 'error' }]);
    } finally {
      setImporting(false);
      setLastWasDryRun(dryRun);
      setStep(2);
    }
  }

  // ── Skip Supabase import — use CSV rows directly ──────────────────────────

  function handleSkipImport() {
    const mapped = csvRows.map(r => ({
      id:       null,
      familyId: null,
      name:     r.name,
      family:   r.family,
      photo_url: r.photo_url || null,
    }));
    setParticipants(mapped);
    setImportLog([{ text: `⚡ Skipped Supabase — using ${mapped.length} rows from CSV directly.`, type: 'info' }]);
    setLastWasDryRun(false);
    setStep(2);
  }

  // ── Step 2: Team template upload ────────────────────────────────────────────

  async function handleTeamTemplateFile(team, e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const base64 = ev.target.result.split(',')[1];
      const res = await fetch('/api/set-team-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, templateBase64: base64 }),
      });
      const data = await res.json();
      if (res.ok) {
        setTeamTemplateMap(prev => ({
          ...prev,
          [team.toLowerCase()]: { base64, width: data.width, height: data.height },
        }));
        // Use the first uploaded team template to seed the layout
        setLayoutObj(prev => prev ?? data.defaultLayout);
        setJsonDraft(prev => prev || JSON.stringify(data.defaultLayout, null, 2));
      }
    };
    reader.readAsDataURL(file);
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
            prompt: lastWasDryRun ? null : (aiPrompt || null),
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

  // ── Per-card crop & regenerate ────────────────────────────────────────────────

  function openCropEditor(idx) {
    setEditingIdx(idx);
    setEditPrompt(aiPrompt);
  }

  // ── Config save / load ────────────────────────────────────────────────────────

  function handleSaveConfig() {
    const config = { layout: layoutObj, aiPrompt };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'card-config.json',
    });
    a.click();
  }

  function handleLoadConfig(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const config = JSON.parse(ev.target.result);
        if (config.layout) {
          setLayoutObj(config.layout);
          setJsonDraft(JSON.stringify(config.layout, null, 2));
        }
        if (config.aiPrompt !== undefined) setAiPrompt(config.aiPrompt);
      } catch {
        alert('Invalid config file');
      }
    };
    reader.readAsText(file);
    if (configRef.current) configRef.current.value = '';
  }

  async function handleRegenCard(photoBase64) {
    const idx = editingIdx;
    setEditingIdx(null);
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, status: 'generating' } : c));
    try {
      const res = await fetch('/api/generate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant: cards[idx].participant,
          layout: layoutObj,
          prompt: editPrompt || null,
          photoBase64,
        }),
      });
      const data = await res.json();
      setCards(prev => prev.map((c, i) => i === idx
        ? res.ok
          ? { ...c, status: 'done', cardBase64: data.card }
          : { ...c, status: 'error', error: data.error }
        : c
      ));
    } catch (e) {
      setCards(prev => prev.map((c, i) => i === idx ? { ...c, status: 'error', error: e.message } : c));
    }
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
    setLastWasDryRun(false);
    setImportLog([]);
    setParticipants([]);
    setTemplate(null);
    setLayoutObj(null);
    setShowJsonEditor(false);
    setJsonDraft('');
    setAiPrompt('');
    setCards([]);
    setTeamMode(false);
    setTeamTemplateMap({});
    // Clear server-side templates too
    fetch('/api/clear-team-templates', { method: 'DELETE' }).catch(() => {});
    if (csvRef.current) csvRef.current.value = '';
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

  // In team mode, ready when every unique team has a template uploaded
  const allTeamsReady = teamMode
    ? uniqueTeams.every(t => teamTemplateMap[t.toLowerCase()])
    : !!template;

  // First uploaded team template (to drive the layout preview)
  const firstTeamTmpl = Object.values(teamTemplateMap)[0] ?? null;
  const previewTemplate = teamMode ? firstTeamTmpl : template;

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
              Accepts CSV or Excel (.xlsx). Required columns: <code>name</code>, <code>family</code> (or <code>team</code>)
              &nbsp;— optional: <code>photo_url</code>. Arabic is supported.
            </p>

            <div className="row gap">
              <label className="file-btn">
                Choose file <input ref={csvRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleCSVFile} hidden />
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
                    onClick={() => handleImport(false)}
                  >
                    Import to Supabase →
                  </button>
                  <button
                    className="btn ghost"
                    disabled={!marathonId || importing}
                    onClick={() => handleImport(true)}
                  >
                    🔍 Dry Run
                  </button>
                  <button
                    className="btn ghost skip"
                    title="Skip Supabase — generate cards directly from the CSV without syncing to the database"
                    onClick={handleSkipImport}
                  >
                    ⚡ Skip Import
                  </button>
                  <button className="btn ghost" onClick={handleStartOver}>
                    ↺ Start Over
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Import / Dry-run preview ── */}
        {step === 1 && (
          <section>
            <h2>{importing ? (lastWasDryRun ? 'Previewing…' : 'Importing…') : (lastWasDryRun ? 'Dry Run Preview' : 'Importing…')}</h2>
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

              {/* ── Mode toggle ── */}
              <div className="mode-toggle">
                <span className={!teamMode ? 'mode-active' : ''}>Single Template</span>
                <button
                  type="button"
                  className={`toggle-btn ${teamMode ? 'on' : ''}`}
                  onClick={() => {
                    const next = !teamMode;
                    setTeamMode(next);
                    // Clear server templates on mode switch
                    fetch('/api/clear-team-templates', { method: 'DELETE' }).catch(() => {});
                    if (!next) setTeamTemplateMap({});
                    else setTemplate(null);
                  }}
                  aria-label="Toggle team template mode"
                >
                  <span className="toggle-knob" />
                </button>
                <span className={teamMode ? 'mode-active' : ''}>Team Template Mode</span>
              </div>

              {/* ── Single template upload ── */}
              {!teamMode && (
                <div className="row gap">
                  <label className="file-btn">
                    Choose Template
                    <input type="file" accept="image/*" ref={templateRef} onChange={handleTemplateFile} hidden />
                  </label>
                  <label className="file-btn" title="Load a saved card-config.json">
                    📂 Load Config
                    <input type="file" accept=".json" ref={configRef} onChange={handleLoadConfig} hidden />
                  </label>
                  {layoutObj && (
                    <button type="button" className="file-btn" onClick={handleSaveConfig} title="Save current layout + prompt as JSON">
                      💾 Save Config
                    </button>
                  )}
                </div>
              )}
              {!teamMode && template && (
                <p className="hint mt">{template.width} × {template.height} px — layout auto-filled below</p>
              )}

              {/* ── Per-team template upload ── */}
              {teamMode && (
                <div className="team-template-panel">
                  <p className="hint">
                    Upload one background image per team. Layout, QR, and text settings are shared across all teams.
                  </p>
                  {uniqueTeams.length === 0 && (
                    <p className="hint" style={{ color: 'var(--amber)' }}>⚠ No teams found — go back and upload a CSV first.</p>
                  )}
                  <div className="team-template-grid">
                    {uniqueTeams.map(team => {
                      const key = team.toLowerCase();
                      const uploaded = !!teamTemplateMap[key];
                      return (
                        <div key={team} className={`team-slot ${uploaded ? 'uploaded' : ''}`}>
                          <div className="team-slot-header">
                            <span className="team-slot-indicator">{uploaded ? '✓' : '○'}</span>
                            <strong>{team}</strong>
                          </div>
                          {uploaded && (
                            <img
                              className="team-slot-preview"
                              src={`data:image/png;base64,${teamTemplateMap[key].base64}`}
                              alt={`${team} template preview`}
                            />
                          )}
                          <label className="file-btn small">
                            {uploaded ? '↺ Replace' : 'Choose Image'}
                            <input
                              type="file"
                              accept="image/*"
                              ref={el => teamTemplateRefs.current[key] = el}
                              onChange={e => handleTeamTemplateFile(team, e)}
                              hidden
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <div className="row gap" style={{ marginTop: '0.75rem' }}>
                    <label className="file-btn" title="Load a saved card-config.json">
                      📂 Load Config
                      <input type="file" accept=".json" ref={configRef} onChange={handleLoadConfig} hidden />
                    </label>
                    {layoutObj && (
                      <button type="button" className="file-btn" onClick={handleSaveConfig} title="Save current layout + prompt as JSON">
                        💾 Save Config
                      </button>
                    )}
                  </div>
                </div>
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

            {layoutObj && previewTemplate && (
              <div className="field">
                <label>
                  Layout Config <span className="optional">(drag elements to position, resize with corner handles)</span>
                </label>
                <LayoutEditor
                  templateBase64={previewTemplate.base64}
                  templateWidth={previewTemplate.width}
                  templateHeight={previewTemplate.height}
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

            {lastWasDryRun && (
              <p className="hint mt" style={{ color: 'var(--amber)' }}>
                ⚠ Dry run — cards will be generated with original photos (no AI). Nothing will be saved to Supabase.
              </p>
            )}
            <div className="nav-row">
              <button
                className="btn primary"
                disabled={!allTeamsReady || !layoutObj}
                onClick={handleGenerate}
              >
                {lastWasDryRun ? '🔍 Preview ' : 'Generate All '}{participants.length} Cards →
              </button>
              <div className="nav-row-right">
                {lastWasDryRun && (
                  <button className="btn ghost" disabled={!marathonId} onClick={() => handleImport(false)}>
                    ✓ Confirm Import
                  </button>
                )}
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
                  {c.participant.photo_url && c.status !== 'generating' && (
                    <button
                      className="card-edit-btn"
                      title="Adjust crop"
                      onClick={() => openCropEditor(i)}
                    >
                      ✂ Crop
                    </button>
                  )}
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

      {editingIdx !== null && cards[editingIdx] && (
        <CropEditor
          photoUrl={`/api/proxy-photo?url=${encodeURIComponent(cards[editingIdx].participant.photo_url)}`}
          frameW={layoutObj?.photo?.width  ?? 220}
          frameH={layoutObj?.photo?.height ?? 220}
          participantName={cards[editingIdx].participant.name}
          onConfirm={handleRegenCard}
          onCancel={() => setEditingIdx(null)}
        />
      )}
    </div>
  );
}
