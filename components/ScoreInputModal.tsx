import { useAuth } from '@/app/context/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { Challenge, canUserEditChallenge } from '@/services/challenges';
import React, { useEffect, useState } from 'react';
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
  onClose: () => void;
  onSubmit: (points: number, percentage?: number) => Promise<void>;
};

export default function ScoreInputModal({
  visible,
  challenge,
  totalFamilyMembers,
  onClose,
  onSubmit,
}: Props) {
  const { userProfile } = useAuth();
  const [completedMembers, setCompletedMembers] = useState('');
  const [manualPoints, setManualPoints] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user has permission to edit this challenge
  const canEdit = canUserEditChallenge(challenge, userProfile?.role);

  useEffect(() => {
    if (visible && !canEdit) {
      Alert.alert(
        'Access Denied',
        'You do not have permission to edit this challenge.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  }, [visible, canEdit]);

  const handleSubmit = async () => {
    if (!canEdit) {
      Alert.alert('Error', 'You do not have permission to edit this challenge');
      return;
    }

    try {
      setLoading(true);

      if (challenge.uses_percentage_based_scoring) {
        const members = parseInt(completedMembers);
        if (isNaN(members) || members < 0 || members > totalFamilyMembers) {
          Alert.alert('Error', `Please enter a number between 0 and ${totalFamilyMembers}`);
          return;
        }

        const percentage = (members / totalFamilyMembers) * 100;
        await onSubmit(challenge.points, percentage);
      } else {
        const points = parseInt(manualPoints);
        if (isNaN(points) || points < 0 || points > challenge.points) {
          Alert.alert('Error', `Please enter a number between 0 and ${challenge.points}`);
          return;
        }

        await onSubmit(points);
      }

      setCompletedMembers('');
      setManualPoints('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit score');
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ThemedView style={styles.modalContent}>
          <ThemedText type="title" style={styles.title}>Complete Challenge</ThemedText>
          <ThemedText type="subtitle" style={styles.challengeTitle}>{challenge.title}</ThemedText>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.blue[2]} />
          ) : challenge.uses_percentage_based_scoring ? (
            <>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                How many family members completed this challenge?
              </ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={completedMembers}
                onChangeText={setCompletedMembers}
                placeholder={`Enter number (0-${totalFamilyMembers})`}
              />
            </>
          ) : (
            <>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Enter points for this challenge
              </ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={manualPoints}
                onChangeText={setManualPoints}
                placeholder={`Enter points (0-${challenge.points})`}
              />
              <ThemedText type="default" style={styles.maxPoints}>
                Maximum points available: {challenge.points}
              </ThemedText>
            </>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <ThemedText type="defaultSemiBold" style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <ThemedText style={styles.submitButtonText}>Submit</ThemedText>
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