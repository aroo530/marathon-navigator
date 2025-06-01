import { BorderRadius, Colors, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
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
  const theme = useColorScheme() ?? 'light';
  const iconColor = theme === 'light' ? Colors.light.textPrimary : Colors.dark.textPrimary;
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
            {subtitle && (
              <ThemedText type="subtitle" style={styles.subtitle}>{subtitle}</ThemedText>
            )}
          </View>
          {rightElement && (
            <View style={styles.rightElement}>
              {rightElement}
            </View>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  } as ViewStyle,
  content: {
    padding: Spacing.lg,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  backButton: {
    marginRight: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: BorderRadius.medium,
  } as ViewStyle,
  titleContainer: {
    flex: 1,
  } as ViewStyle,
  title: {
    color: Colors.purple[2],
  } as TextStyle,
  subtitle: {
    marginTop: Spacing.xs,
  } as TextStyle,
  rightElement: {
    marginLeft: Spacing.sm,
  } as ViewStyle,
});
