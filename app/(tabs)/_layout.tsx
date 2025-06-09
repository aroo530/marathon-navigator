// app/(tabs)/_layout.tsx - Global Stack Navigator
import { useAuth } from '@/context/AuthContext';
import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function TabLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (

    <Stack
      screenOptions={{
        // no header
        header: () => null,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Marathon',
        }}
      />
      <Stack.Screen
        name="[marathonId]"
      />
    </Stack>
  );
}
