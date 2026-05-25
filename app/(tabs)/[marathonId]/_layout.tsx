// app/(tabs)/marathon/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { useMarathon } from '@/context/MarathonContext';
import { useMarathonTheme } from '@/hooks/useMarathonTheme';

export default function MarathonLayout() {
  const { t } = useTranslation();
  const { selectedMarathon } = useMarathon();
  const marathonTheme = useMarathonTheme();

  return (
    <PaperProvider>
      <Tabs screenOptions={{
        animation: 'shift',
        headerShown: false,
        tabBarActiveTintColor: marathonTheme.primary,
        tabBarInactiveTintColor: marathonTheme.shade,
        tabBarStyle: {
          height: 60,
          alignContent: 'center',
        },
      }}>
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.leaderboard'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="challenges"
          options={{
            title: t('tabs.challenges'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="flash" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tournament"
          options={{
            href: selectedMarathon?.show_tournament === false ? null : undefined,
            title: t('tabs.tournament'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="medal" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="games"
          options={{
            href: selectedMarathon?.show_games === false ? null : undefined,
            title: t('tabs.games'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="game-controller" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="participants"
          options={{
            title: t('tabs.participants'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: t('tabs.attendance'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="qr-code" size={size} color={color} />
            ),
          }}
        />

      </Tabs>
      <Toast position="top" />
    </PaperProvider>
  );
}
