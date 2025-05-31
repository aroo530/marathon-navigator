import { useAuth } from '@/app/context/AuthContext';
import { Colors } from '@/constants/Theme';
import { router } from 'expo-router';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  const { session, userProfile } = useAuth();

  const handleProfilePress = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={handleProfilePress}
      >
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
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.textPrimary,
  },
  profileButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatar: {
    height: '100%',
    width: '100%',
  },
  placeholderAvatar: {
    backgroundColor: Colors.blue[1],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    color: Colors.blue[3],
    fontWeight: 'bold',
  },
});
