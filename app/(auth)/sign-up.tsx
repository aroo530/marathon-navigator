import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { Link, router } from 'expo-router';
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
import { useAuth } from '../../context/AuthContext';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert(t('auth.error'), t('auth.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('auth.error'), t('auth.passwordMismatch'));
      return;
    }

    try {
      setIsLoading(true);
      await signUp(email, password);
      Alert.alert(
        t('auth.success'),
        t('auth.verifyEmail'),
        [{ text: 'OK', onPress: () => router.replace('/(auth)') }]
      );
    } catch (error) {
      Alert.alert(t('auth.error'), error instanceof Error ? error.message : t('common.error'));
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
        <ThemedText type="title" style={styles.title}>{t('auth.createAccount')}</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>{t('auth.signUpToContinue')}</ThemedText>

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
          <TextInput
            style={styles.input}
            placeholder={t('auth.confirmPassword')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholderTextColor={Colors.light.textSecondary}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <ThemedText type="defaultSemiBold" style={styles.buttonText}>
              {isLoading ? t('auth.creatingAccount') : t('auth.signUp')}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.footer}>
            <ThemedText type="default">{t('auth.haveAccount')}</ThemedText>
            <Link href="/(auth)" asChild>
              <TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.linkText}>{t('auth.signIn')}</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
});
