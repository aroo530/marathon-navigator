import { useState } from 'react';
import { supabaseAdmin } from '../supabase.js';

// Resize & compress an image file using Canvas before uploading.
// maxW/maxH are the longest dimensions we'll keep; output is JPEG at 0.85 quality.
function compressImage(file, maxW, maxH) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Max dimensions per upload type
const MAX_DIMS = {
  marathon_logos:       { w: 600, h: 600 },
  family_avatars:       { w: 300, h: 300 },
  family_covers:        { w: 900, h: 400 },
  participant_avatars:  { w: 300, h: 300 },
};

export default function PhotoUpload({ currentUrl, storagePath, fileName, onUploaded, circle = false }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const { w, h } = MAX_DIMS[storagePath] ?? { w: 600, h: 600 };
      const compressed = await compressImage(file, w, h);

      const path = `${storagePath}/${fileName}.jpg`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('marathon')
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage.from('marathon').getPublicUrl(path);
      onUploaded(`${data.publicUrl}?t=${Date.now()}`);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = preview || currentUrl;

  return (
    <div className="photo-cell">
      {displayUrl ? (
        <img src={displayUrl} alt="" className={`photo-thumb ${circle ? 'circle' : ''}`} />
      ) : (
        <div className={`photo-thumb placeholder ${circle ? 'circle' : ''}`}>+</div>
      )}
      <label className="upload-btn" style={{ opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto' }}>
        {uploading ? 'Uploading…' : 'Upload'}
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
      </label>
    </div>
  );
}
