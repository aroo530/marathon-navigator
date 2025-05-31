// app/(tabs)/_layout.tsx - Global Stack Navigator
import Header from '@/components/Header';
import { Colors } from '@/constants/Theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
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
    <Tabs
      screenOptions={{
        header: () => <Header title={getHeaderTitle()} />,
        tabBarActiveTintColor: Colors.blue[2],
        tabBarInactiveTintColor: Colors.light.textSecondary,
        tabBarStyle: {
          borderTopColor: Colors.light.cardBorder,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Marathon',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="[marathonId]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={28} style={{ marginBottom: -3 }} {...props} />;
}
