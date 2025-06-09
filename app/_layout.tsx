import AuthProvider from '@/context/AuthContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { FamilyProvider } from '../context/FamilyContext';
import { MarathonProvider } from '../context/MarathonContext';

export default function RootLayout() {
  return (

    <AuthProvider>
      <StatusBar style="auto" />
      <MarathonProvider>
        <FamilyProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </FamilyProvider>
      </MarathonProvider>
    </AuthProvider>
  );
}
