import { useAuth } from '@/app/context/AuthContext';
import { Colors } from '@/constants/Theme';
import { Challenge, canUserEditChallenge } from '@/services/challenges';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
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
        <View style={styles.modalContent}>
          <Text style={styles.title}>Complete Challenge</Text>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.blue[2]} />
          ) : challenge.uses_percentage_based_scoring ? (
            <>
              <Text style={styles.label}>
                How many family members completed this challenge?
              </Text>
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
              <Text style={styles.label}>
                Enter points for this challenge
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={manualPoints}
                onChangeText={setManualPoints}
                placeholder={`Enter points (0-${challenge.points})`}
              />
              <Text style={styles.maxPoints}>
                Maximum points available: {challenge.points}
              </Text>
            </>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.light.textPrimary,
  },
  challengeTitle: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.light.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  maxPoints: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: -16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  cancelButtonText: {
    color: Colors.light.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.blue[2],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 