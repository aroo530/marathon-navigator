import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { useMarathonTheme } from '@/hooks/useMarathonTheme';
import { Challenge, canUserEditChallenge } from '@/services/challenges';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  challenge: Challenge;
  totalFamilyMembers: number;
  initialPoints: number;
  initialPercentage: number;
  onClose: () => void;
  onSubmit: (points: number, percentage?: number) => Promise<void>;
};

export default function ScoreInputModal({
  visible,
  challenge,
  totalFamilyMembers,
  initialPoints = 0,
  initialPercentage = 0,
  onClose,
  onSubmit
}: Props) {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const marathonTheme = useMarathonTheme();
  const [completedMembers, setCompletedMembers] = useState('');
  const [manualPoints, setManualPoints] = useState('');
  const [loading, setLoading] = useState(false);

  // Check permission
  const canEdit = canUserEditChallenge(challenge, userProfile?.role);

  // Initialize inputs when modal opens
  useEffect(() => {
    if (!visible) return;

    if (challenge.uses_percentage_based_scoring) {
      const members = Math.round((initialPercentage / 100) * totalFamilyMembers);
      setCompletedMembers(isNaN(members) ? '' : String(members));
    } else {
      setManualPoints(initialPoints > 0 ? String(initialPoints) : '');
    }
  }, [visible, initialPoints, initialPercentage, challenge.uses_percentage_based_scoring, totalFamilyMembers]);

  // Deny access if not allowed
  useEffect(() => {
    if (visible && !canEdit) {
      Alert.alert(
        t('common.accessDenied', 'Access Denied'),
        t('challenges.noPermission', 'You do not have permission to edit this challenge.'),
        [{ text: t('common.ok', 'OK'), onPress: onClose }]
      );
    }
  }, [visible, canEdit]);

  const handleSubmit = async () => {
    if (!canEdit) {
      return Alert.alert(t('common.error', 'Error'), t('challenges.noPermission', 'You do not have permission to edit this challenge'));
    }

    try {
      setLoading(true);

      if (challenge.uses_percentage_based_scoring) {
        const members = parseInt(completedMembers, 10);
        if (isNaN(members) || members < 0 || members > totalFamilyMembers) {
          return Alert.alert(t('common.error', 'Error'), t('challenges.invalidCount', `Please enter a number between 0 and ${totalFamilyMembers}`));
        }
        const percentage = (members / totalFamilyMembers) * 100;
        await onSubmit(challenge.points, percentage);
      } else {
        const points = parseInt(manualPoints, 10);
        if (isNaN(points) || points < 0 || points > challenge.points) {
          return Alert.alert(t('common.error', 'Error'), t('challenges.invalidPoints', `Please enter a number between 0 and ${challenge.points}`));
        }
        await onSubmit(points);
      }

      // Reset
      setCompletedMembers('');
      setManualPoints('');
      onClose();
    } catch {
      Alert.alert(t('common.error', 'Error'), t('challenges.submitFailed', 'Failed to submit score'));
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit) return null;

  // Dynamic title
  const titleKey = challenge.points_awarded ? 'challenges.editScore' : 'challenges.completeChallenge';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ThemedView style={styles.modalContent}>
          <ThemedText type="title" style={styles.title}>
            {t(titleKey, challenge.points_awarded ? 'Edit Score' : 'Complete Challenge')}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.challengeTitle}>{challenge.title}</ThemedText>

          {loading ? (
            <ActivityIndicator size="large" color={marathonTheme.primary} />
          ) : challenge.uses_percentage_based_scoring ? (
            <>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                {t('challenges.howManyCompleted', 'How many family members completed this challenge?')}
              </ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={completedMembers}
                onChangeText={setCompletedMembers}
                placeholder={t('challenges.enterNumber', `Enter number (0-${totalFamilyMembers})`)}
              />
            </>
          ) : (
            <>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                {t('challenges.enterPoints', 'Enter points for this challenge')}
              </ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={manualPoints}
                onChangeText={setManualPoints}
                placeholder={t('challenges.enterPointsPlaceholder', `Enter points (0-${challenge.points})`)}
              />
              <ThemedText type="default" style={styles.maxPoints}>
                {t('challenges.maxPoints', 'Maximum points available:')} {challenge.points}
              </ThemedText>
            </>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <ThemedText type="defaultSemiBold" style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: marathonTheme.primary }, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <ThemedText style={styles.submitButtonText}>{t('common.submit', 'Submit')}</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  challengeTitle: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    fontSize: Font.sizes.body,
    marginBottom: Spacing.lg,
  },
  maxPoints: {
    marginTop: -Spacing.md,
    marginBottom: Spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  cancelButtonText: {
    fontSize: Font.sizes.body,
  },
  submitButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.blue[2],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: Font.sizes.body,
    fontWeight: '600',
  },
});
