import { useEffect, useState } from 'react';
import MarathonSelector from './components/MarathonSelector.jsx';
import Sidebar from './components/Sidebar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ParticipantsPage from './pages/ParticipantsPage.jsx';
import PhotosPage from './pages/PhotosPage.jsx';
import ScoresPage from './pages/ScoresPage.jsx';
import { supabase } from './supabase.js';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [page, setPage] = useState('photos');
  const [marathonId, setMarathonId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  if (session === undefined) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>Loading…</div>;
  }

  if (!session) {
    return <LoginPage onLogin={setSession} />;
  }

  return (
    <div className="admin-layout">
      <Sidebar page={page} onNavigate={setPage} onLogout={handleLogout} />
      <div className="admin-main">
        <MarathonSelector selectedId={marathonId} onChange={setMarathonId} />
        <div className="page-content">
          {page === 'photos'       && <PhotosPage       marathonId={marathonId} />}
          {page === 'scores'       && <ScoresPage       marathonId={marathonId} session={session} />}
          {page === 'participants' && <ParticipantsPage marathonId={marathonId} />}
        </div>
      </div>
    </div>
  );
}
