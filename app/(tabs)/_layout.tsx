// app/(tabs)/_layout.tsx - Global Stack Navigator
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: 'Home',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="explore"
          options={{
            title: 'Explore',
            headerShown: true
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerShown: true
          }}
        />
        <Stack.Screen
          name="[marathonId]"
          options={{
            title: 'Marathon',
            headerShown: false
          }}
        />
      </Stack>
    </>
  );
}
