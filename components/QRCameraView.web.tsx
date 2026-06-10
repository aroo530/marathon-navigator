import QrScanner from 'qr-scanner';
import React, { useEffect, useRef } from 'react';

import type { QRCameraViewProps } from './QRCameraView';

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

    scanner.start().catch((e) => onErrorRef.current?.(e));

    return () => {
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
