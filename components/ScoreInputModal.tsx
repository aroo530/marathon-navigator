import { Colors } from '@/constants/Theme';
import { ScoringConfig, calculatePoints, fetchScoringConfig } from '@/services/challengeConfig';
import { Challenge } from '@/services/challenges';
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
  const [completedMembers, setCompletedMembers] = useState('');
  const [manualPoints, setManualPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [scoringConfigs, setScoringConfigs] = useState<ScoringConfig[]>([]);

  useEffect(() => {
    if (visible && challenge.uses_percentage_based_scoring) {
      loadScoringConfigs();
    }
  }, [visible, challenge.id]);

  const loadScoringConfigs = async () => {
    try {
      setLoading(true);
      const configs = await fetchScoringConfig(challenge.id);
      setScoringConfigs(configs);
    } catch (error) {
      Alert.alert('Error', 'Failed to load scoring configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (challenge.uses_percentage_based_scoring) {
        const members = parseInt(completedMembers);
        if (isNaN(members) || members < 0 || members > totalFamilyMembers) {
          Alert.alert('Error', `Please enter a number between 0 and ${totalFamilyMembers}`);
          return;
        }

        const percentage = (members / totalFamilyMembers) * 100;
        const points = calculatePoints(scoringConfigs, percentage);
        await onSubmit(points, percentage);
      } else {
        const points = parseInt(manualPoints);
        if (isNaN(points) || points < 0 || points > challenge.points) {
          Alert.alert('Error', `Please enter a number between 0 and ${challenge.points}`);
          return;
        }

        await onSubmit(points); // For non-percentage challenges, we set percentage to 100
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

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={Colors.blue[2]} />;
    }

    if (challenge.uses_percentage_based_scoring) {
      return (
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

          {scoringConfigs.length > 0 && (
            <View style={styles.scoringInfo}>
              <Text style={styles.scoringTitle}>Scoring Rules:</Text>
              {scoringConfigs.map((config) => (
                <Text key={config.id} style={styles.scoringText}>
                  {config.min_percentage}%-{config.max_percentage}%: {config.points} points
                </Text>
              ))}
            </View>
          )}
        </>
      );
    }

    return (
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
    );
  };

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

          {renderContent()}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
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
  scoringInfo: {
    backgroundColor: Colors.blue[0],
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  scoringTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.blue[3],
  },
  scoringText: {
    fontSize: 14,
    color: Colors.blue[3],
    marginBottom: 4,
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
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 