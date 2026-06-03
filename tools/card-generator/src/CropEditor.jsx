import { useEffect, useRef, useState } from 'react';

// Displays a draggable/zoomable crop editor for a single photo.
// The crop frame matches the photo slot dimensions (frameW × frameH).
// onConfirm receives a JPEG base64 string of the cropped region.

const PREVIEW_SIZE = 340; // longest display dimension in px

export default function CropEditor({ photoUrl, frameW, frameH, participantName, onConfirm, onCancel }) {
  const [src, setSrc] = useState(photoUrl);

  // Scale the frame to fit within PREVIEW_SIZE
  const longest = Math.max(frameW, frameH);
  const displayW = Math.round(frameW * PREVIEW_SIZE / longest);
  const displayH = Math.round(frameH * PREVIEW_SIZE / longest);

  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null); // { startX, startY, ox, oy }

  // Reset when a new photo opens
  useEffect(() => { setSrc(photoUrl); setZoom(1); setOffset({ x: 0, y: 0 }); setLoaded(false); }, [photoUrl]);

  function getImgRect() {
    const img = imgRef.current;
    if (!img || !loaded) return { x: 0, y: 0, w: displayW, h: displayH };
    const fitScale = Math.max(displayW / img.naturalWidth, displayH / img.naturalHeight);
    const w = img.naturalWidth * fitScale * zoom;
    const h = img.naturalHeight * fitScale * zoom;
    const x = (displayW - w) / 2 + offset.x;
    const y = (displayH - h) / 2 + offset.y;
    return { x, y, w, h };
  }

  function clampOffset(ox, oy, currentZoom) {
    const img = imgRef.current;
    if (!img || !loaded) return { x: ox, y: oy };
    const fitScale = Math.max(displayW / img.naturalWidth, displayH / img.naturalHeight);
    const w = img.naturalWidth * fitScale * currentZoom;
    const h = img.naturalHeight * fitScale * currentZoom;
    const minX = Math.min(0, displayW - w);
    const minY = Math.min(0, displayH - h);
    const maxX = Math.max(0, displayW - w);
    const maxY = Math.max(0, displayH - h);
    return {
      x: Math.max(minX, Math.min(maxX, ox)),
      y: Math.max(minY, Math.min(maxY, oy)),
    };
  }

  function onMouseDown(e) {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy, zoom));
  }

  function onMouseUp() {
    dragRef.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    dragRef.current = { startX: t.clientX, startY: t.clientY, ox: offset.x, oy: offset.y };
  }
  function onTouchMove(e) {
    if (!dragRef.current || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;
    setOffset(clampOffset(dragRef.current.ox + dx, dragRef.current.oy + dy, zoom));
  }

  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const next = Math.max(1, Math.min(4, zoom + delta));
    setZoom(next);
    setOffset(prev => clampOffset(prev.x, prev.y, next));
  }

  function changeZoom(delta) {
    const next = Math.max(1, Math.min(4, zoom + delta));
    setZoom(next);
    setOffset(prev => clampOffset(prev.x, prev.y, next));
  }

  // Bake rotation into the src via an offscreen canvas so pan/zoom math stays unchanged
  function rotate(deg) {
    const img = imgRef.current;
    if (!img || !loaded) return;
    const rad = (deg * Math.PI) / 180;
    const sw = img.naturalWidth, sh = img.naturalHeight;
    const cw = deg === 90 || deg === 270 ? sh : sw;
    const ch = deg === 90 || deg === 270 ? sw : sh;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -sw / 2, -sh / 2);
    setSrc(canvas.toDataURL('image/jpeg', 0.95));
    setOffset({ x: 0, y: 0 });
    setZoom(1);
    setLoaded(false);
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || !loaded) return;
    const { x, y, w, h } = getImgRect();
    const canvas = document.createElement('canvas');
    canvas.width = displayW;
    canvas.height = displayH;
    canvas.getContext('2d').drawImage(img, x, y, w, h);
    const base64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
    onConfirm(base64);
  }

  const { x: ix, y: iy, w: iw, h: ih } = getImgRect();
  const isCircle = frameW === frameH;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: '#16161d', border: '1px solid #252530', borderRadius: 14, padding: 24, width: displayW + 48, maxWidth: '95vw' }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e4e4ec' }}>Adjust crop — {participantName}</div>
          <div style={{ fontSize: 12, color: '#6b6b80', marginTop: 2 }}>Drag · scroll to zoom · rotate if needed</div>
        </div>

        {/* ── Crop viewport ── */}
        <div
          style={{
            width: displayW, height: displayH,
            position: 'relative', overflow: 'hidden',
            borderRadius: isCircle ? '50%' : 8,
            border: '2px solid #7c3aed',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
          onMouseDown={onMouseDown}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={() => setLoaded(true)}
            style={{
              position: 'absolute',
              left: ix, top: iy,
              width: iw, height: ih,
              pointerEvents: 'none',
              draggable: false,
            }}
          />
          {!loaded && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6b80', fontSize: 13 }}>
              Loading…
            </div>
          )}
        </div>

        {/* ── Zoom + Rotate controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <button className="btn ghost sm" onClick={() => changeZoom(-0.2)}>− Zoom</button>
          <div style={{ flex: 1, height: 4, background: '#252530', borderRadius: 2, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${((zoom - 1) / 3) * 100}%`, background: '#7c3aed', borderRadius: 2 }} />
          </div>
          <button className="btn ghost sm" onClick={() => changeZoom(0.2)}>+ Zoom</button>
          <div style={{ width: 1, height: 20, background: '#252530' }} />
          <button className="btn ghost sm" title="Rotate 90° left" disabled={!loaded} onClick={() => rotate(270)}>↺</button>
          <button className="btn ghost sm" title="Rotate 90° right" disabled={!loaded} onClick={() => rotate(90)}>↻</button>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" disabled={!loaded} onClick={handleConfirm}>
            Regenerate Card
          </button>
        </div>
      </div>
    </div>
  );
}
