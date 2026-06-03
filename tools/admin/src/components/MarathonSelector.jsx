import { useEffect, useState } from 'react';
import { supabase } from '../supabase.js';

export default function MarathonSelector({ selectedId, onChange }) {
  const [marathons, setMarathons] = useState([]);

  useEffect(() => {
    supabase
      .from('marathons')
      .select('id, title, status')
      .order('id', { ascending: false })
      .then(({ data }) => setMarathons(data ?? []));
  }, []);

  return (
    <div className="marathon-bar">
      <label htmlFor="marathon-select">Marathon:</label>
      <select
        id="marathon-select"
        className="input sm"
        style={{ width: 260 }}
        value={selectedId ?? ''}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="" disabled>— select a marathon —</option>
        {marathons.map(m => (
          <option key={m.id} value={m.id}>
            {m.title} [{m.status}]
          </option>
        ))}
      </select>
    </div>
  );
}
