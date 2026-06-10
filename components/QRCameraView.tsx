import { CameraView } from 'expo-camera';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

export type QRCameraViewProps = {
  active: boolean;
  onScan: (data: string) => void;
  onError?: (e: unknown) => void;
};

/**
 * Native (iOS/Android) QR camera, backed by expo-camera's CameraView.
 * The web counterpart lives in QRCameraView.web.tsx and uses qr-scanner.
 */
export default function QRCameraView({ active, onScan }: QRCameraViewProps) {
  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      active={active}
      // barcodeScannerSettings with barcodeTypes can silently break iOS detection
      // (expo issue #11726). Only set it on Android; iOS detects QR by default.
      barcodeScannerSettings={Platform.OS === 'android' ? { barcodeTypes: ['qr'] } : undefined}
      onBarcodeScanned={({ data }) => onScan(data)}
    />
  );
}
