import QrScanner from 'qr-scanner';
import React, { useEffect, useRef } from 'react';

import type { QRCameraViewProps } from './QRCameraView';

// Target camera resolution (capped to device max). 2K balances QR read range
// against per-frame decode cost on mid-range Androids. Bump to 3840x2160 for 4K.
const TARGET_RESOLUTION = { width: 2560, height: 1440 };

/**
 * Web QR camera, backed by qr-scanner (nimiq). Uses the browser's native
 * BarcodeDetector API when available (Android Chrome) and falls back to a
 * bundled WASM decoder otherwise (iOS Safari). Renders a raw DOM <video>
 * filling its parent; the attendance overlay is drawn on top as a sibling.
 */
export default function QRCameraView({ active, onScan, onError }: QRCameraViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Keep the latest onScan without re-creating the scanner on every render.
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video) return;

    const scanner = new QrScanner(
      video,
      (result) => onScanRef.current(result.data),
      {
        preferredCamera: 'environment',
        highlightScanRegion: false,
        highlightCodeOutline: false,
        maxScansPerSecond: 10,
        // Crop to the center ~60% — faster decoding and fewer misreads.
        calculateScanRegion: (v) => {
          const size = Math.round(0.6 * Math.min(v.videoWidth, v.videoHeight));
          return {
            x: Math.round((v.videoWidth - size) / 2),
            y: Math.round((v.videoHeight - size) / 2),
            width: size,
            height: size,
          };
        },
      },
    );

    let cancelled = false;

    (async () => {
      try {
        await scanner.start();
        if (cancelled) return;

        // qr-scanner requests width:{min:1024} — a hard floor that can fail and
        // drop the stream to the browser default (often 640x480). Re-request a
        // high `ideal` (soft) resolution so we get the device's best up to the
        // target. More pixels per QR = locks on from farther away / tolerates blur.
        const stream = video.srcObject as MediaStream | null;
        const track = stream?.getVideoTracks?.()[0];
        if (track) {
          try {
            const caps = track.getCapabilities?.();
            await track.applyConstraints({
              width: {
                ideal: caps?.width?.max
                  ? Math.min(caps.width.max, TARGET_RESOLUTION.width)
                  : TARGET_RESOLUTION.width,
              },
              height: {
                ideal: caps?.height?.max
                  ? Math.min(caps.height.max, TARGET_RESOLUTION.height)
                  : TARGET_RESOLUTION.height,
              },
            });
          } catch {
            /* device doesn't support applyConstraints — keep the default stream */
          }
        }
      } catch (e) {
        if (!cancelled) onErrorRef.current?.(e);
      }
    })();

    return () => {
      cancelled = true;
      scanner.stop();
      scanner.destroy();
    };
  }, [active]);

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  );
}
