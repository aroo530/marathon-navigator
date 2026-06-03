import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar.jsx';
import Toast from '../components/Toast.jsx';
import { phoneToEmail, supabase, supabaseAdmin } from '../supabase.js';

const ROLES = ['participant', 'leader', 'game_manager', 'admin'];

const EMPTY_FORM = { full_name: '', role: 'participant', family_id: '', phone: '', password: '' };

export default function ParticipantsPage({ marathonId }) {
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // null | { mode: 'create'|'edit', user?: row }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteFamilyConfirmId, setDeleteFamilyConfirmId] = useState(null);
  const [showFamilies, setShowFamilies] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!marathonId) return;
    setFamilies([]); setSelectedFamilyId(''); setParticipants([]);
    supabase.from('families').select('id, name').eq('marathon_id', marathonId).order('name')
      .then(({ data }) => setFamilies(data ?? []));
  }, [marathonId]);

  useEffect(() => {
    if (!marathonId) return;
    loadParticipants();
  }, [selectedFamilyId, marathonId]);

  async function loadParticipants() {
    setLoading(true);
    try {
      let query = supabase.from('users').select('id, full_name, role, family_id, families(name)');
      if (selectedFamilyId) {
        query = query.eq('family_id', Number(selectedFamilyId));
      } else {
        // All participants in this marathon via family join
        query = query.eq('families.marathon_id', marathonId).not('families', 'is', null);
      }
      const { data } = await query.order('full_name');
      setParticipants(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, family_id: selectedFamilyId || (families[0]?.id ?? '') });
    setModal({ mode: 'create' });
  }

  function openEdit(user) {
    setForm({ full_name: user.full_name, role: user.role, family_id: user.family_id, phone: '', password: '' });
    setModal({ mode: 'edit', user });
  }

  async function handleSave() {
    if (!form.full_name.trim() || !form.family_id) return;
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        if (!form.phone || !form.password) throw new Error('Phone and password are required to create an account.');
        const email = phoneToEmail(form.phone);

        // Create auth account via service role key
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: form.password,
          email_confirm: true,
        });
        if (authError) throw authError;

        const { error: insertError } = await supabaseAdmin.from('users').insert({
          id: authData.user.id,
          full_name: form.full_name.trim(),
          role: form.role,
          family_id: Number(form.family_id),
          email,
        });
        if (insertError) {
          // Roll back auth user if profile insert fails
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          throw insertError;
        }
        setToast({ message: `${form.full_name} created`, type: 'success' });
      } else {
        const { error } = await supabaseAdmin.from('users').update({
          full_name: form.full_name.trim(),
          role: form.role,
          family_id: Number(form.family_id),
        }).eq('id', modal.user.id);
        if (error) throw error;
        setToast({ message: `${form.full_name} updated`, type: 'success' });
      }
      setModal(null);
      loadParticipants();
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFamily(familyId, familyName) {
    try {
      const { error } = await supabaseAdmin.from('families').delete().eq('id', familyId);
      if (error) throw error;
      setFamilies(fs => fs.filter(f => f.id !== familyId));
      if (selectedFamilyId === String(familyId)) setSelectedFamilyId('');
      setDeleteFamilyConfirmId(null);
      setToast({ message: `Family "${familyName}" deleted`, type: 'success' });
    } catch (err) {
      setDeleteFamilyConfirmId(null);
      setToast({
        message: err.message.includes('foreign key') || err.message.includes('violates')
          ? `Cannot delete "${familyName}" — remove all its participants first.`
          : err.message,
        type: 'error',
      });
    }
  }

  async function handleDelete(userId, name) {
    try {
      const { error } = await supabaseAdmin.from('users').delete().eq('id', userId);
      if (error) throw error;
      setParticipants(ps => ps.filter(p => p.id !== userId));
      setDeleteConfirmId(null);
      setToast({ message: `${name} removed`, type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  }

  if (!marathonId) return <div className="select-prompt">Select a marathon to manage participants.</div>;

  return (
    <>
      <div className="page-header">
        <h2>Participants</h2>
        <button className="btn primary sm" onClick={openCreate}>+ Add participant</button>
      </div>

      {/* ── Families panel ── */}
      <div className="families-panel">
        <button
          className="btn ghost sm"
          onClick={() => setShowFamilies(v => !v)}
          style={{ marginBottom: 8 }}
        >
          {showFamilies ? '▲ Hide families' : '▼ Manage families'}
        </button>
        {showFamilies && (
          <div className="table-wrap" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Family</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {families.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 500 }}>{f.name}</td>
                    <td>
                      {deleteFamilyConfirmId === f.id ? (
                        <div className="actions-cell">
                          <button className="btn danger sm" onClick={() => handleDeleteFamily(f.id, f.name)}>Confirm delete</button>
                          <button className="btn ghost sm" onClick={() => setDeleteFamilyConfirmId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button
                          className="btn ghost sm"
                          style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                          onClick={() => setDeleteFamilyConfirmId(f.id)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {families.length === 0 && (
                  <tr><td colSpan={2} style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No families</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="field mb">
        <label>Filter by family</label>
        <select
          className="input"
          style={{ width: 220 }}
          value={selectedFamilyId}
          onChange={e => setSelectedFamilyId(e.target.value)}
        >
          <option value="">All families</option>
          {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="hint">Loading…</p>
      ) : participants.length === 0 ? (
        <div className="empty-state">No participants found.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 44 }} />
                <th>Name</th>
                <th>Role</th>
                <th>Family</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {participants.map(p => (
                <>
                  <tr key={p.id} className={deleteConfirmId === p.id ? 'confirm-row' : ''}>
                    <td><Avatar name={p.full_name} size={32} /></td>
                    <td style={{ fontWeight: 500 }}>{p.full_name}</td>
                    <td><span className={`role-badge ${p.role}`}>{p.role}</span></td>
                    <td>{p.families?.name ?? '—'}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn ghost sm" onClick={() => openEdit(p)}>Edit</button>
                        {deleteConfirmId === p.id ? (
                          <>
                            <button className="btn danger sm" onClick={() => handleDelete(p.id, p.full_name)}>Confirm delete</button>
                            <button className="btn ghost sm" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                          </>
                        ) : (
                          <button className="btn ghost sm" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => setDeleteConfirmId(p.id)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-card">
            <h3>{modal.mode === 'create' ? 'Add Participant' : 'Edit Participant'}</h3>

            <div className="field">
              <label>Full name</label>
              <input className="input full" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>

            <div className="field">
              <label>Role</label>
              <select className="input full" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Family</label>
              <select className="input full" value={form.family_id} onChange={e => setForm(f => ({ ...f, family_id: e.target.value }))}>
                <option value="">— select family —</option>
                {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {modal.mode === 'create' && (
              <>
                <div className="field">
                  <label>Phone number</label>
                  <input className="input full" type="tel" placeholder="0501234567" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input className="input full" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </>
            )}

            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn primary" disabled={saving || !form.full_name.trim() || !form.family_id} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />
    </>
  );
}
