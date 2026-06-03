import { useEffect, useRef, useState } from "react";

const ELEMENTS = [
  { key: "photo", label: "Photo", color: "#a855f7", type: "box" },
  { key: "qr", label: "QR", color: "#06b6d4", type: "box" },
  { key: "name", label: "Name", color: "#22c55e", type: "text" },
  { key: "team", label: "Team", color: "#f59e0b", type: "text" },
];

export default function LayoutEditor({
  templateBase64,
  templateWidth,
  templateHeight,
  layout,
  onChange,
}) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const drag = useRef(null); // { key, action:'move'|'resize', startX, startY, orig }

  // Recompute scale when container width changes
  useEffect(() => {
    if (!containerRef.current || !templateWidth) return;
    const obs = new ResizeObserver((entries) => {
      const cw = entries[0].contentRect.width;
      setScale(Math.min(cw - 2, 480) / templateWidth);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [templateWidth]);

  const px = (v) => v * scale; // actual coords → CSS pixels
  const ac = (v) => Math.round(v / scale); // CSS pixels → actual coords

  function getPoint(e) {
    return e.touches ? e.touches[0] : e;
  }

  function startDrag(e, key, action) {
    e.preventDefault();
    e.stopPropagation();
    const pt = getPoint(e);
    drag.current = {
      key,
      action,
      startX: pt.clientX,
      startY: pt.clientY,
      orig: { ...layout[key] },
    };
  }

  function onMove(e) {
    if (!drag.current) return;
    const { key, action, startX, startY, orig } = drag.current;
    const pt = getPoint(e);
    const dx = ac(pt.clientX - startX);
    const dy = ac(pt.clientY - startY);
    const el = { ...orig };

    if (action === "move") {
      el.x = orig.x + dx;
      el.y = orig.y + dy;
    } else {
      // resize: drag right/down to grow
      const delta = dx + dy;
      if (key === "photo") {
        el.width = Math.max(20, orig.width + dx);
        el.height = Math.max(20, orig.height + dy);
      } else if (key === "qr") {
        el.width = Math.max(20, orig.width + delta);
      }
    }
    onChange({ ...layout, [key]: el });
  }

  function endDrag() {
    drag.current = null;
  }

  function set(key, prop, value) {
    onChange({ ...layout, [key]: { ...layout[key], [prop]: value } });
  }

  const dW = px(templateWidth);
  const dH = px(templateHeight);

  return (
    <div className="layout-editor">
      {/* ── Canvas ─────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="le-canvas"
        onMouseMove={onMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchMove={onMove}
        onTouchEnd={endDrag}
        style={{ width: "100%" }}
      >
        <div
          style={{
            position: "relative",
            display: "inline-block",
            width: dW,
            height: dH,
          }}
        >
          <img
            src={`data:image/png;base64,${templateBase64}`}
            draggable={false}
            style={{
              display: "block",
              width: dW,
              height: dH,
              userSelect: "none",
            }}
          />

          {ELEMENTS.map(({ key, label, color, type }) => {
            const L = layout[key];
            if (!L) return null;

            if (type === "box") {
              const bw = px(L.width);
              const bh = px(L.height ?? L.width);
              const isCircle = key === "photo" && L.circular !== false;
              return (
                <div
                  key={key}
                  style={{
                    position: "absolute",
                    left: px(L.x),
                    top: px(L.y),
                    width: bw,
                    height: bh,
                  }}
                >
                  <div
                    onMouseDown={(e) => startDrag(e, key, "move")}
                    onTouchStart={(e) => startDrag(e, key, "move")}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: `2.5px solid ${color}`,
                      borderRadius: isCircle ? "50%" : 6,
                      background: color + "28",
                      cursor: "move",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      userSelect: "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color,
                        textShadow: "0 1px 4px #000a",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {/* Resize corner */}
                  <div
                    onMouseDown={(e) => startDrag(e, key, "resize")}
                    onTouchStart={(e) => startDrag(e, key, "resize")}
                    style={{
                      position: "absolute",
                      right: -6,
                      bottom: -6,
                      width: 13,
                      height: 13,
                      background: color,
                      borderRadius: 3,
                      cursor: "se-resize",
                      zIndex: 2,
                    }}
                  />
                </div>
              );
            }

            // Text anchor — y is the text baseline in SVG
            const fs = px(L.fontSize ?? 20);
            const anchorX = L.align === "center" ? px(L.x) - 40 : px(L.x);
            return (
              <div
                key={key}
                onMouseDown={(e) => startDrag(e, key, "move")}
                onTouchStart={(e) => startDrag(e, key, "move")}
                style={{
                  position: "absolute",
                  left: anchorX,
                  top: px(L.y) - fs,
                  width: 80,
                  height: fs + 6,
                  border: `2px dashed ${color}`,
                  borderRadius: 4,
                  background: color + "22",
                  cursor: "move",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  userSelect: "none",
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color,
                    textShadow: "0 1px 3px #000a",
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Controls ────────────────────────────────────────────── */}
      <div className="le-controls">
        {ELEMENTS.map(({ key, label, color, type }) => {
          const L = layout[key];
          if (!L) return null;
          return (
            <div
              key={key}
              className="le-card"
              style={{ borderColor: color + "55" }}
            >
              <div className="le-card-title" style={{ color }}>
                {label}
              </div>

              {/* Position */}
              <div className="le-row">
                <label>
                  X
                  <input
                    type="number"
                    value={L.x}
                    onChange={(e) =>
                      set(key, "x", parseInt(e.target.value) || 0)
                    }
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    value={L.y}
                    onChange={(e) =>
                      set(key, "y", parseInt(e.target.value) || 0)
                    }
                  />
                </label>
              </div>

              {type === "box" && (
                <>
                  <div className="le-row">
                    <label>
                      W
                      <input
                        type="number"
                        value={L.width}
                        min={20}
                        onChange={(e) =>
                          set(key, "width", parseInt(e.target.value) || 20)
                        }
                      />
                    </label>
                    {key === "photo" && (
                      <label>
                        H
                        <input
                          type="number"
                          value={L.height}
                          min={20}
                          onChange={(e) =>
                            set(key, "height", parseInt(e.target.value) || 20)
                          }
                        />
                      </label>
                    )}
                  </div>
                  {key === "photo" && (
                    <label className="le-check">
                      <input
                        type="checkbox"
                        checked={L.circular !== false}
                        onChange={(e) => set(key, "circular", e.target.checked)}
                      />
                      Circular crop
                    </label>
                  )}
                </>
              )}

              {type === "text" && (
                <>
                  <div className="le-row">
                    <label>
                      Size
                      <input
                        type="number"
                        value={L.fontSize}
                        min={8}
                        max={120}
                        onChange={(e) =>
                          set(key, "fontSize", parseInt(e.target.value) || 12)
                        }
                      />
                    </label>
                    <label>
                      Color
                      <input
                        type="color"
                        value={L.color}
                        onChange={(e) => set(key, "color", e.target.value)}
                        style={{
                          width: 36,
                          height: 26,
                          padding: 2,
                          cursor: "pointer",
                        }}
                      />
                    </label>
                  </div>
                  <div className="le-row">
                    <label className="le-check">
                      <input
                        type="checkbox"
                        checked={L.fontWeight === "bold"}
                        onChange={(e) =>
                          set(
                            key,
                            "fontWeight",
                            e.target.checked ? "bold" : "normal",
                          )
                        }
                      />
                      Bold
                    </label>
                    <label>
                      Align
                      <select
                        value={L.align ?? "left"}
                        onChange={(e) => set(key, "align", e.target.value)}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                  </div>
                  {key === "name" && (
                    <div className="le-row">
                      <label>
                        Wrap width
                        <input
                          type="number"
                          value={L.maxWidth ?? ""}
                          min={50}
                          max={2000}
                          onChange={(e) =>
                            set(key, "maxWidth", parseInt(e.target.value) || undefined)
                          }
                        />
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
