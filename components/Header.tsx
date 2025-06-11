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
  rightElement,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const handleBack = () => (onBack ? onBack() : router.back());

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={styles.container}>
        {showBack && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={Colors.white} />
          </TouchableOpacity>
        )}

        <View style={styles.titleContainer}>
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText type="subtitle" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          )}
        </View>

        <View style={styles.rightContainer}>
          {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
          {title !== 'Profile' && (
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              style={styles.profileButton}
            >
              <MaterialIcons name="person" size={24} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.purple[2],
  } as ViewStyle,

  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  } as ViewStyle,

  backButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.medium,
  } as ViewStyle,

  titleContainer: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  } as ViewStyle,

  title: {
    fontSize: Font.sizes.h2,
    color: Colors.white,
    fontWeight: '600',
  } as TextStyle,

  subtitle: {
    marginTop: Spacing.xs,
    fontSize: Font.sizes.caption,
    color: Colors.white,
  } as TextStyle,

  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,

  rightElement: {
    marginRight: Spacing.sm,
  } as ViewStyle,

  profileButton: {
    padding: Spacing.xs,
  } as ViewStyle,
});
