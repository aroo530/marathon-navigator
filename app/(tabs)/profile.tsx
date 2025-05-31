// app/(tabs)/profile.tsx - Profile Screen
import { Colors } from "@/constants/Theme";
import { router } from 'expo-router';
import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function ProfileScreen() {
  const { session, userProfile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to sign out');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {userProfile?.avatar_url ? (
            <Image
              source={{ uri: userProfile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.placeholderAvatar]}>
              <Text style={styles.avatarText}>
                {session?.user?.email?.[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.email}>{session?.user?.email}</Text>
        {userProfile?.full_name && (
          <Text style={styles.name}>{userProfile.full_name}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Alert.alert('Coming Soon', 'This feature is not yet available')}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Alert.alert('Coming Soon', 'This feature is not yet available')}
        >
          <Text style={styles.buttonText}>Change Password</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.signOutButton]}
        onPress={handleSignOut}
      >
        <Text style={[styles.buttonText, styles.signOutText]}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderAvatar: {
    backgroundColor: Colors.blue[1],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    color: Colors.blue[3],
    fontWeight: 'bold',
  },
  email: {
    fontSize: 18,
    color: Colors.light.textPrimary,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.textPrimary,
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.light.cardBackground,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  buttonText: {
    fontSize: 16,
    color: Colors.light.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.red[1],
  },
  signOutText: {
    color: Colors.red[2],
  },
});
