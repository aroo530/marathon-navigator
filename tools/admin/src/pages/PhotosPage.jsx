import { useEffect, useState } from 'react';
import PhotoUpload from '../components/PhotoUpload.jsx';
import Toast from '../components/Toast.jsx';
import { supabase, supabaseAdmin } from '../supabase.js';

export default function PhotosPage({ marathonId }) {
  const [marathon, setMarathon] = useState(null);
  const [families, setFamilies] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!marathonId) return;
    setMarathon(null);
    setFamilies([]);
    setParticipants([]);
    setSelectedFamilyId(null);

    supabase.from('marathons').select('id, title, picture_url').eq('id', marathonId).single()
      .then(({ data }) => setMarathon(data));

    supabase.from('families').select('id, name, avatar_url, cover_url')
      .eq('marathon_id', marathonId).order('name')
      .then(({ data }) => setFamilies(data ?? []));
  }, [marathonId]);

  useEffect(() => {
    if (!selectedFamilyId) { setParticipants([]); return; }
    supabase.from('users').select('id, full_name, avatar_url')
      .eq('family_id', selectedFamilyId).order('full_name')
      .then(({ data }) => setParticipants(data ?? []));
  }, [selectedFamilyId]);

  function showToast(msg) { setToast({ message: msg, type: 'success' }); }

  async function updateMarathonPhoto(url) {
    const { error } = await supabaseAdmin.from('marathons').update({ picture_url: url }).eq('id', marathonId);
    if (error) { setToast({ message: error.message, type: 'error' }); return; }
    setMarathon(m => ({ ...m, picture_url: url }));
    showToast('Marathon photo updated');
  }

  async function updateFamilyAvatar(familyId, url) {
    const { error } = await supabaseAdmin.from('families').update({ avatar_url: url }).eq('id', familyId);
    if (error) { setToast({ message: error.message, type: 'error' }); return; }
    setFamilies(fs => fs.map(f => f.id === familyId ? { ...f, avatar_url: url } : f));
    showToast('Family avatar updated');
  }

  async function updateFamilyCover(familyId, url) {
    const { error } = await supabaseAdmin.from('families').update({ cover_url: url }).eq('id', familyId);
    if (error) { setToast({ message: error.message, type: 'error' }); return; }
    setFamilies(fs => fs.map(f => f.id === familyId ? { ...f, cover_url: url } : f));
    showToast('Family cover updated');
  }

  async function updateParticipantAvatar(userId, url) {
    const { error } = await supabaseAdmin.from('users').update({ avatar_url: url }).eq('id', userId);
    if (error) { setToast({ message: error.message, type: 'error' }); return; }
    setParticipants(ps => ps.map(p => p.id === userId ? { ...p, avatar_url: url } : p));
    showToast('Participant photo updated');
  }

  if (!marathonId) return <div className="select-prompt">Select a marathon to manage photos.</div>;

  return (
    <>
      {/* ── Marathon logo ── */}
      <div className="card">
        <h3>Marathon Logo</h3>
        <PhotoUpload
          currentUrl={marathon?.picture_url}
          storagePath="marathon_logos"
          fileName={`marathon-${marathonId}`}
          onUploaded={updateMarathonPhoto}
        />
      </div>

      {/* ── Family photos ── */}
      <div className="card">
        <h3>Family Photos</h3>
        {families.length === 0 ? (
          <p className="hint">No families found for this marathon.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Family</th>
                  <th>Avatar</th>
                  <th>Cover</th>
                </tr>
              </thead>
              <tbody>
                {families.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.name}</td>
                    <td>
                      <PhotoUpload
                        currentUrl={f.avatar_url}
                        storagePath="family_avatars"
                        fileName={`family-avatar-${f.id}`}
                        onUploaded={url => updateFamilyAvatar(f.id, url)}
                        circle
                      />
                    </td>
                    <td>
                      <PhotoUpload
                        currentUrl={f.cover_url}
                        storagePath="family_covers"
                        fileName={`family-cover-${f.id}`}
                        onUploaded={url => updateFamilyCover(f.id, url)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Participant photos ── */}
      <div className="card">
        <h3>Participant Photos</h3>
        <div className="field">
          <label>Filter by family</label>
          <select
            className="input"
            style={{ width: 220 }}
            value={selectedFamilyId ?? ''}
            onChange={e => setSelectedFamilyId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— pick a family —</option>
            {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        {selectedFamilyId && participants.length === 0 && (
          <p className="hint">No participants in this family.</p>
        )}
        {participants.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Photo</th></tr>
              </thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id}>
                    <td>{p.full_name}</td>
                    <td>
                      <PhotoUpload
                        currentUrl={p.avatar_url}
                        storagePath="participant_avatars"
                        fileName={`user-${p.id}`}
                        onUploaded={url => updateParticipantAvatar(p.id, url)}
                        circle
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Toast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />
    </>
  );
}
