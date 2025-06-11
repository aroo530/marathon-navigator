import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import RNRestart from 'react-native-restart';

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function SignInScreen() {
  const { t, i18n } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>{t('auth.welcomeBack')}</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>{t('auth.signInToContinue')}</ThemedText>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={Colors.light.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={Colors.light.textSecondary}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              {isLoading ? t('auth.signingIn') : t('auth.signIn')}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.footer}>
            <ThemedText type="default">{t('auth.noAccount')}</ThemedText>
            <Link href="/sign-up" asChild>
              <TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.linkText}>{t('auth.signUp')}</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
          <TouchableOpacity
            onPress={async () => {
              const nextLang = i18n.language === 'en' ? 'ar' : 'en';
              const isRTL = nextLang === 'ar';

              await i18n.changeLanguage(nextLang);

              if (I18nManager.isRTL !== isRTL) {
                I18nManager.forceRTL(isRTL);
                I18nManager.allowRTL(isRTL);
                // Restart app to apply layout changes
                Alert.alert(
                  t('common.restartTitle'),
                  t('common.restartMessage'),
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Reload the app to apply RTL
                        if (Platform.OS === 'android') {
                          RNRestart.Restart();
                        } else {
                          // For iOS: quit + reopen manually (or use expo-updates if configured)
                        }
                      },
                    },
                  ]
                );
              }
            }}
            style={styles.langButton}
          >
            <ThemedText type="defaultSemiBold" style={styles.linkText}>
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </ThemedText>
          </TouchableOpacity>

        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    backgroundColor: Colors.light.cardBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    fontSize: Font.sizes.body,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    color: Colors.light.textPrimary,
  },
  button: {
    backgroundColor: Colors.purple[2],
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.white,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  linkText: {
    color: Colors.purple[2],
    marginLeft: Spacing.xs,
  },
  langButton: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
}); 