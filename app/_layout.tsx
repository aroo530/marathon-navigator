import AuthProvider from '@/context/AuthContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { I18nManager } from 'react-native';
import i18n from '../src/i18n/i18n';

function applyRTL(language: string) {
  const isRTL = language === 'ar';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }
}

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
