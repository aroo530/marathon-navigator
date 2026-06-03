import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { applyRTL } from '@/utils/applyRTL';
import { restartApp } from '@/utils/restartApp';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SignInScreen() {
  const { t, i18n } = useTranslation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert(t('auth.error', 'Error'), t('auth.fillAllFields', 'Please fill in all fields'));
      return;
    }

    try {
      setIsLoading(true);
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(
        t('auth.error', 'Error'),
        error instanceof Error ? error.message : t('common.error', 'An error occurred')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = async () => {
    const nextLang = i18n.language === 'en' ? 'ar' : 'en';
    await i18n.changeLanguage(nextLang);
    applyRTL(nextLang);
    if (Platform.OS !== 'web') {
      Alert.alert(
        t('common.restartTitle', 'Restart required'),
        t('common.restartMessage', 'The app will restart to apply language changes.'),
        [{ text: 'OK', onPress: () => restartApp() }],
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>{t('auth.welcomeBack', 'Welcome back')}</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>{t('auth.signInToContinue', 'Sign in to continue')}</ThemedText>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('auth.email', 'Email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            placeholderTextColor={Colors.light.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.password', 'Password')}
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
              {isLoading ? t('auth.signingIn', 'Signing in…') : t('auth.signIn', 'Sign in')}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
          <ThemedText type="defaultSemiBold" style={styles.langText}>
            {i18n.language === 'en' ? 'العربية' : 'English'}
          </ThemedText>
        </TouchableOpacity>
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
  langButton: {
    alignSelf: 'center',
    marginTop: Spacing.xl,
  },
  langText: {
    color: Colors.purple[2],
  },
});
