// app/(tabs)/_layout.tsx - Global Stack Navigator
import Header from '@/components/Header';
import { Stack, usePathname } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  const pathname = usePathname();
  
  const getHeaderTitle = () => {
    if (pathname.includes('/challenges')) return 'Challenges';
    if (pathname.includes('/tournament')) return 'Tournament';
    if (pathname.includes('/profile')) return 'Profile';
    return 'Marathon';
  };

  return (
    <Stack
      screenOptions={{
        header: () => <Header title={getHeaderTitle()} />,
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
