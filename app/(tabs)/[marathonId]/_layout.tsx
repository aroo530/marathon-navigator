// app/(tabs)/marathon/_layout.tsx - Bottom Tab Navigator for Marathon Context
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { PaperProvider } from 'react-native-paper';
import Toast from "react-native-toast-message";

export default function MarathonLayout() {
  return (
    <PaperProvider>

      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Overview",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: "Leaderboard",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="challenges"
          options={{
            title: "Challenges",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="flash" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tournament"
          options={{
            title: "Tournament",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="medal" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name='gemes'
          options={{
            title: "Games",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="medal" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <Toast position="top" />
    </PaperProvider>
  );
}
