import AuthProvider from '@/context/AuthContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { I18nManager } from 'react-native';
import i18n from '../src/i18n/i18n'; // your setup



export default function RootLayout() {
  if (i18n.language === 'ar' && !I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  } else if (i18n.language === 'en' && I18nManager.isRTL) {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  }
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
