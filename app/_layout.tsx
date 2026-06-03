import { ErrorBoundary } from '@/components/ErrorBoundary';
import AuthProvider from '@/context/AuthContext';
import { applyRTL } from '@/utils/applyRTL';
import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import i18n from '../src/i18n/i18n';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
});

export default function RootLayout() {
  useEffect(() => {
    applyRTL(i18n.language);
    i18n.on('languageChanged', applyRTL);
    return () => { i18n.off('languageChanged', applyRTL); };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
