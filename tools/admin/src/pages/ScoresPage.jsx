import { useEffect, useState } from 'react';
import Toast from '../components/Toast.jsx';
import { supabase, supabaseAdmin } from '../supabase.js';

export default function ScoresPage({ marathonId, session }) {
  const [weeks, setWeeks] = useState([]);
  const [families, setFamilies] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [weekChallenges, setWeekChallenges] = useState([]); // [{id, challenge_id, challenges:{title,points,...}}]
  const [scoreMap, setScoreMap] = useState({}); // {familyId: {weekChallengeId: {id, points_awarded}}}
  const [edits, setEdits] = useState({});        // {`${fid}-${wcid}`: points_awarded}
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!marathonId) return;
    setWeeks([]); setFamilies([]); setSelectedWeekId(null); setWeekChallenges([]); setScoreMap({}); setEdits({});

    supabase.from('weeks').select('id, week_number, start_date, end_date')
      .eq('marathon_id', marathonId).order('week_number')
      .then(({ data }) => setWeeks(data ?? []));

    supabase.from('families').select('id, name')
      .eq('marathon_id', marathonId).order('name')
      .then(({ data }) => setFamilies(data ?? []));
  }, [marathonId]);

  useEffect(() => {
    if (!selectedWeekId) { setWeekChallenges([]); setScoreMap({}); setEdits({}); return; }

    supabase.from('week_challenges')
      .select('id, challenge_id, challenges(title, challenge_type, points, uses_percentage_based_scoring)')
      .eq('week_id', selectedWeekId)
      .then(async ({ data: wcs }) => {
        if (!wcs?.length) { setWeekChallenges([]); return; }
        setWeekChallenges(wcs);
        const wcIds = wcs.map(w => w.id);

        const { data: scores } = await supabase.from('family_scores')
          .select('id, family_id, week_challenge_id, points_awarded')
          .in('week_challenge_id', wcIds);

        const map = {};
        for (const s of scores ?? []) {
          if (!map[s.family_id]) map[s.family_id] = {};
          map[s.family_id][s.week_challenge_id] = { id: s.id, points_awarded: s.points_awarded };
        }
        setScoreMap(map);
        setEdits({});
      });
  }, [selectedWeekId]);

  function cellKey(familyId, wcId) { return `${familyId}-${wcId}`; }

  function handleEdit(familyId, wcId, value) {
    const key = cellKey(familyId, wcId);
    const current = scoreMap[familyId]?.[wcId]?.points_awarded ?? '';
    const num = value === '' ? '' : Number(value);
    if (num === current) {
      const next = { ...edits };
      delete next[key];
      setEdits(next);
    } else {
      setEdits(e => ({ ...e, [key]: num }));
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const entries = Object.entries(edits);
      for (const [key, pointsAwarded] of entries) {
        const [familyId, wcId] = key.split('-').map(Number);
        const wc = weekChallenges.find(w => w.id === wcId);
        const existing = scoreMap[familyId]?.[wcId];

        if (existing) {
          const { error } = await supabaseAdmin.from('family_scores')
            .update({ points_awarded: pointsAwarded, submitted_by: session.user.id })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseAdmin.from('family_scores')
            .insert({
              family_id: familyId,
              week_challenge_id: wcId,
              challenge_id: wc.challenge_id,
              points_awarded: pointsAwarded,
              submitted_by: session.user.id,
            });
          if (error) throw error;
        }

        // Update local scoreMap so cell shows saved value
        setScoreMap(m => ({
          ...m,
          [familyId]: {
            ...(m[familyId] ?? {}),
            [wcId]: { ...(m[familyId]?.[wcId] ?? {}), points_awarded: pointsAwarded },
          },
        }));
      }
      setEdits({});
      setToast({ message: `Saved ${entries.length} score${entries.length > 1 ? 's' : ''}`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const editCount = Object.keys(edits).length;

  if (!marathonId) return <div className="select-prompt">Select a marathon to override scores.</div>;

  return (
    <>
      <div className="page-header">
        <h2>Score Overrides</h2>
        <div className="row gap">
          {editCount > 0 && (
            <button className="btn ghost sm" onClick={() => setEdits({})}>Discard</button>
          )}
          <button className="btn primary sm" disabled={editCount === 0 || saving} onClick={handleSave}>
            {saving ? 'Saving…' : `Save ${editCount > 0 ? editCount : ''} change${editCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      <div className="field mb">
        <label>Week</label>
        <select
          className="input"
          style={{ width: 260 }}
          value={selectedWeekId ?? ''}
          onChange={e => setSelectedWeekId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— select a week —</option>
          {weeks.map(w => (
            <option key={w.id} value={w.id}>
              Week {w.week_number} ({w.start_date} → {w.end_date})
            </option>
          ))}
        </select>
      </div>

      {selectedWeekId && weekChallenges.length === 0 && (
        <p className="hint">No challenges assigned to this week.</p>
      )}

      {weekChallenges.length > 0 && families.length > 0 && (
        <div className="score-table-wrap">
          <table className="score-table">
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>Family</th>
                {weekChallenges.map(wc => (
                  <th key={wc.id}>
                    <div className="challenge-header">
                      {wc.challenges?.title}
                      <div style={{ fontWeight: 400, color: 'var(--muted)', marginTop: 2 }}>
                        max {wc.challenges?.points ?? '—'} pts
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {families.map(f => (
                <tr key={f.id}>
                  <td className="family-name">{f.name}</td>
                  {weekChallenges.map(wc => {
                    const key = cellKey(f.id, wc.id);
                    const saved = scoreMap[f.id]?.[wc.id]?.points_awarded ?? '';
                    const value = key in edits ? edits[key] : saved;
                    const changed = key in edits;
                    return (
                      <td key={wc.id} className={`score-cell${changed ? ' changed' : ''}`}>
                        <input
                          type="number"
                          min={0}
                          max={wc.challenges?.points ?? undefined}
                          value={value}
                          placeholder="—"
                          onChange={e => handleEdit(f.id, wc.id, e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Toast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />
    </>
  );
}
