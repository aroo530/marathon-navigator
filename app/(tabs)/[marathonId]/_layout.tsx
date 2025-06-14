// app/(tabs)/marathon/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';

const Tab = createMaterialBottomTabNavigator();

export default function MarathonLayout() {
  const { t } = useTranslation();

  return (
    <PaperProvider>
      <Tabs screenOptions={{
        animation: 'shift',
        headerShown: false, tabBarStyle: {
          // paddingBottom: 8,   // ← add bottom padding here
          height: 60,         // ← you can tweak the height if needed
          alignContent: 'center'
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
            title: t('tabs.tournament'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="medal" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="gemes"
          options={{
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

      </Tabs>
      <Toast position="top" />
    </PaperProvider>
  );
}
