import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

type Props = {
  visible: boolean;
  challengeTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteConfirmationModal({
  visible,
  challengeTitle,
  onConfirm,
  onCancel
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <ThemedView style={styles.modalContent}>
          <ThemedText type="title" style={styles.title}>
            {t('challenges.deleteScore.title', 'Delete Score')}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.challengeTitle}>{challengeTitle}</ThemedText>
          <ThemedText type="default" style={styles.message}>
            {t('challenges.deleteScore.message', 'Are you sure you want to delete this score? This action cannot be undone.')}
          </ThemedText>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <ThemedText type="defaultSemiBold" style={styles.cancelButtonText}>
                {t('common.cancel', 'Cancel')}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onConfirm}
            >
              <ThemedText style={styles.deleteButtonText}>
                {t('common.delete', 'Delete')}
              </ThemedText>
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
    marginBottom: Spacing.md,
  },
  message: {
    marginBottom: Spacing.lg,
    textAlign: 'center',
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
  deleteButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.red[1],
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: Font.sizes.body,
    fontWeight: '600',
  },
}); 