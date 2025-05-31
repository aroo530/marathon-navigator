import { Colors } from '@/constants/Theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FamilyProvider } from './context/FamilyContext';
import { MarathonProvider } from './context/MarathonContext';

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  console.log('session', session);
  console.log('isLoading', isLoading);
  if (isLoading) {
    console.log('isLoading');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.blue[2]} />
      </View>
    );
  }

  return (
    <MarathonProvider>
      <FamilyProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </FamilyProvider>
    </MarathonProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <RootLayoutNav />
    </AuthProvider>
  );
}
