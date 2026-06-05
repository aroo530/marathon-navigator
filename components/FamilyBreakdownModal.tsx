import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { useMarathonTheme } from '@/hooks/useMarathonTheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
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
  const marathonTheme = useMarathonTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [visible]);

  if (!family) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          { opacity: fadeAnim }
        ]}
      >
        <Animated.View 
          style={[
            styles.modalContent,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{family.name}</Text>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name='close' size={24} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Total Points */}
          <LinearGradient
            colors={[marathonTheme.primary, marathonTheme.shade]}
            style={[styles.totalPointsCard, { shadowColor: marathonTheme.primary }]}
          >
            <Text style={styles.totalPointsLabel}>{t('leaderboard.points')}</Text>
            <Text style={styles.totalPointsValue}>
              {family.totalpoints}
            </Text>
          </LinearGradient>

          {/* Breakdown List */}
          <FlatList
            data={family.breakdown}
            keyExtractor={(item, idx) => `${item.challenge_title}-${idx}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.sourceText}>{t('leaderboard.breakdown.source')}: {item.source}</Text>
                  <Text style={styles.pointsText}>
                    {t('leaderboard.breakdown.points')}: {item.points_awarded}
                  </Text>
                </View>
                <Text style={styles.challengeText}>
                  {t('leaderboard.breakdown.challenge')}: {item.challenge_title}
                </Text>
                <Text style={styles.dateText}>
                  {t('leaderboard.breakdown.date')}: {new Date(item.submitted_at).toLocaleString()}
                </Text>
              </View>
            )}
          />
        </Animated.View>
      </Animated.View>
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
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 8,
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
    fontSize: Font.sizes.h2,
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
  totalPointsCard: {
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: Colors.purple[2],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  } as ViewStyle,
  totalPointsLabel: {
    fontSize: Font.sizes.body,
    color: Colors.white,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.9,
  } as TextStyle,
  totalPointsValue: {
    fontSize: Font.sizes.h1,
    color: Colors.white,
    fontWeight: '800',
  } as TextStyle,
  listContainer: {
    paddingBottom: Spacing.sm,
  } as ViewStyle,
  breakdownItem: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  } as ViewStyle,
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  } as ViewStyle,
  sourceText: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
  challengeText: {
    fontSize: Font.sizes.body,
    fontWeight: '600',
    color: Colors.light.textPrimary,
    marginBottom: Spacing.sm,
  } as TextStyle,
  pointsText: {
    fontSize: Font.sizes.body,
    color: Colors.green[2],
    fontWeight: '700',
  } as TextStyle,
  dateText: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  } as TextStyle,
});
