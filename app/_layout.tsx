import AuthProvider from '@/context/AuthContext';
import { applyRTL } from '@/utils/applyRTL';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import i18n from '../src/i18n/i18n';

export default function RootLayout() {
  useEffect(() => {
    applyRTL(i18n.language);
    i18n.on('languageChanged', applyRTL);
    return () => { i18n.off('languageChanged', applyRTL); };
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
