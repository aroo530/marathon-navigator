import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

type BreakdownItem = {
  source: string;
  challenge_title: string;
  points_awarded: number;
  submitted_at: string;
};

interface Family {
  id: number;
  name: string;
  totalpoints: number;
  breakdown: BreakdownItem[];
}

interface FamilyBreakdownModalProps {
  visible: boolean;
  onClose: () => void;
  family: Family | null;
}

const FamilyBreakdownModal: React.FC<FamilyBreakdownModalProps> = ({
  visible,
  onClose,
  family,
}) => {
  const { t } = useTranslation();
  
  if (!family) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{family.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{t('leaderboard.breakdown.close')}</Text>
            </TouchableOpacity>
          </View>

          {/* Total Points */}
          <View style={styles.totalPointsCard}>
            <Text style={styles.totalPointsLabel}>{t('leaderboard.points')}</Text>
            <Text style={styles.totalPointsValue}>
              {family.totalpoints}
            </Text>
          </View>

          {/* Breakdown List */}
          <FlatList
            data={family.breakdown}
            keyExtractor={(item, idx) => `${item.challenge_title}-${idx}`}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={styles.breakdownItem}>
                <Text style={styles.sourceText}>{t('leaderboard.breakdown.source')}: {item.source}</Text>
                <Text style={styles.challengeText}>
                  {t('leaderboard.breakdown.challenge')}: {item.challenge_title}
                </Text>
                <Text style={styles.pointsText}>
                  {t('leaderboard.breakdown.points')}: {item.points_awarded}
                </Text>
                <Text style={styles.dateText}>
                  {t('leaderboard.breakdown.date')}: {new Date(item.submitted_at).toLocaleString()}
                </Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

export default FamilyBreakdownModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  } as ViewStyle,
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  } as ViewStyle,
  modalTitle: {
    fontWeight: '700',
    fontSize: Font.sizes.h1,
    color: Colors.light.textPrimary,
  } as TextStyle,
  closeButton: {
    padding: Spacing.xs,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  closeButtonText: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
  } as TextStyle,
  totalPointsCard: {
    backgroundColor: Colors.blue[0],
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: Colors.blue[2],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  } as ViewStyle,
  totalPointsLabel: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  } as TextStyle,
  totalPointsValue: {
    fontSize: Font.sizes.h1,
    color: Colors.blue[2],
    fontWeight: '700',
  } as TextStyle,
  listContainer: {
    paddingBottom: Spacing.sm,
  } as ViewStyle,
  breakdownItem: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  } as ViewStyle,
  sourceText: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  challengeText: {
    fontSize: Font.sizes.body,
    fontWeight: '600',
    color: Colors.light.textPrimary,
    marginBottom: Spacing.xs,
  } as TextStyle,
  pointsText: {
    fontSize: Font.sizes.body,
    color: Colors.green[2],
    marginBottom: Spacing.xs,
    fontWeight: '600',
  } as TextStyle,
  dateText: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  } as TextStyle,
});
