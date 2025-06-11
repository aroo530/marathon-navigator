import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

type HeaderProps = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
};

export function Header({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightElement
}: HeaderProps) {
  const iconColor = Colors.white;
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <ThemedView style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.row}>
          {showBack && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={iconColor} />
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <ThemedText type="title" style={styles.title}>{title}</ThemedText>
            {/* {subtitle && (
              <ThemedText type="subtitle" style={styles.subtitle}>{subtitle}</ThemedText>
            )} */}
          </View>
          {rightElement && (
            <View style={styles.rightElement}>
              {rightElement}
            </View>
          )}
        </View>
        {title !== 'Profile' && (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
          >
            <MaterialIcons name="person" size={24} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
    backgroundColor: Colors.purple[2],
    paddingTop: 50,
    // paddingBottom: 10,
    marginBottom: 16
  } as ViewStyle,
  content: {
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  backButton: {
    marginRight: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: BorderRadius.medium,
    // backgroundColor: Colors.white,
  } as ViewStyle,
  titleContainer: {
    flex: 1,
  } as ViewStyle,
  title: {
    fontSize: Font.sizes.h2,
    color: Colors.white,
    fontWeight: '600',
  } as TextStyle,
  subtitle: {
    marginTop: Spacing.xs,
    color: Colors.white,
    fontSize: Font.sizes.caption,
  } as TextStyle,
  rightElement: {
    marginLeft: Spacing.sm,
  } as ViewStyle,
  profileButton: {
    padding: 8,
    color: Colors.white,
  }
});
