// app/(tabs)/marathon/challenges.tsx
import { useTranslation } from 'react-i18next';

import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import { Header } from "@/components/Header";
import ScoreInputModal from "@/components/ScoreInputModal";
import { BorderRadius, Colors, Font, Spacing } from "@/constants/Theme";
import { useAuth } from '@/context/AuthContext';
import { useFamily } from "@/context/FamilyContext";
import { useMarathon } from "@/context/MarathonContext";
import {
  type Challenge,
  type ChallengeWithProgress,
  deleteChallengeScore,
  fetchMarathonChallenges,
  updateChallengeScore
} from '@/services/challenges';
import { getCurrentFamily } from '@/services/familyService';
import { fetchWeeksByMarathonId } from '@/services/marathonService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

const CHALLENGE_TYPE_CONFIG: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }> = {
  kahoot:     { icon: 'help-circle-outline',  label: 'Brain Storm' },
  project:    { icon: 'construct-outline',    label: 'Project' },
  attendance: { icon: 'calendar-outline',     label: 'Attendance' },
  activity:   { icon: 'star-outline',         label: 'Activity' },
  game:       { icon: 'game-controller-outline', label: 'Game' },
  tournament: { icon: 'trophy-outline',       label: 'Tournament' },
  confession: { icon: 'heart-outline',        label: 'Confession' },
};

const GAME_TYPE_LABELS: Record<string, string> = {
  mass:            'القداس',
  memorization:    'المحفوظات',
  one_heart:       'قلب واحد',
  escape_room:     'Escape Room',
  '3d_model':      'سلاح المهندسين',
  video:           'المبدع الصغير',
  problem_solving: 'ادارة الازمة',
  doctrine:        'خط دفاع العقيدة',
  book_summary:    'تلخيص الكتاب',
};

export default function ChallengesScreen() {
  const { t } = useTranslation();

  const { marathonId } = useLocalSearchParams();
  const { selectedMarathon } = useMarathon();
  const currentMarathonId = Number(marathonId ?? selectedMarathon?.id);
  const { currentFamily, setCurrentFamily } = useFamily();
  const { userProfile } = useAuth();

  const [weeks, setWeeks] = useState<{ id: number; week_number: number; start_date: string; end_date: string }[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekChallenges, setWeekChallenges] = useState<ChallengeWithProgress[]>([]);
  const [generalChallenges, setGeneralChallenges] = useState<ChallengeWithProgress[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [challengeToDelete, setChallengeToDelete] = useState<Challenge | null>(null);

  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    Toast.show({
      type,
      text1: title,
      text2: message,
      position: 'top',
      topOffset: 100,
      visibilityTime: 3000,
      autoHide: true,
    });
  };
  // 1. Load all weeks & auto-detect current one
  const loadWeeks = async () => {
    if (!currentMarathonId) return;
    try {
      const allWeeks = await fetchWeeksByMarathonId(currentMarathonId);
      setWeeks(allWeeks);

      const today = new Date();
      const current = allWeeks.find(w => {
        const start = new Date(w.start_date);
        const end = new Date(w.end_date);
        return today >= start && today <= end;
      });

      setSelectedWeekId(current?.id ?? allWeeks[0]?.id ?? null);
    } catch (err) {
      console.error('Error loading weeks', err);
      const msg = err instanceof Error ? err.message : 'Could not load weeks.';
      showToast('error', 'Error', msg);
      setError(msg);
    }
  };

  // 2. Fetch challenges for selected week
  const fetchChallenges = async () => {
    if (!currentFamily || selectedWeekId == null) return;
    try {
      setLoading(true);
      setError(null);

      const { weekChallenges: weekly, generalChallenges: general } =
        await fetchMarathonChallenges(
          currentMarathonId,
          currentFamily.id,
          selectedWeekId
        );

      setWeekChallenges(weekly);
      setGeneralChallenges(general);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to fetch challenges');
    } finally {
      setLoading(false);
    }
  };


  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const fetchFamily = async () => {
        if (!userProfile?.id || currentFamily) return;   // bail if we already have it

        try {
          const fam = await getCurrentFamily(currentMarathonId, userProfile.id);
          if (isActive && fam) {
            setCurrentFamily(fam);
          }
        } catch (err) {
          console.error("fetch family failed:", err);
        }
      };

      fetchFamily();

      return () => {
        isActive = false;  // prevents state updates if screen blurs before fetch finishes
      };
    }, [userProfile?.id, currentFamily])
  );

  // inside your component:
  useFocusEffect(
    React.useCallback(() => {
      // 1) whenever we focus and have marathon+family, load weeks
      if (currentMarathonId && currentFamily) {
        loadWeeks();
      }
      // optional cleanup:
      return () => {
        // if you need to cancel inflight requests, do it here
      };
    }, [currentMarathonId, currentFamily])
  );

  useFocusEffect(
    React.useCallback(() => {
      // 2) after weeks have loaded (selectedWeekId set), fetch challenges
      if (selectedWeekId != null && currentFamily) {
        fetchChallenges();
      }
      return () => { };
    }, [selectedWeekId, currentFamily])
  );
  const handleChallengePress = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setModalVisible(true);
  };

  const handleScoreSubmit = async (points: number, percentage?: number) => {
    if (!currentFamily || !selectedChallenge) return;
    try {
      await updateChallengeScore(
        currentFamily.id,
        points,
        percentage,
        selectedChallenge.week_challenge_id,
        selectedChallenge.id
      );
      showToast('success', t('challenges.success'), t('challenges.scoreUpdated'))

      fetchChallenges();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update challenge';
      showToast('error', t('common.error'), t('challenges.updateFailed'))
      setError(message);

    }
  };

  const handleDeletePress = (challenge: Challenge) => {
    setChallengeToDelete(challenge);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!currentFamily || !challengeToDelete) return;
    try {
      await deleteChallengeScore(
        currentFamily.id,
        challengeToDelete.week_challenge_id,
        challengeToDelete.id
      );
      showToast('success', t('challenges.success'), t('challenges.scoreDeleted'));
      fetchChallenges();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete score';
      showToast('error', t('common.error'), t('challenges.deleteFailed'));
      setError(message);
    } finally {
      setDeleteModalVisible(false);
      setChallengeToDelete(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('challenges.title')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple[2]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title={t('challenges.title')} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchChallenges}>
            <Text>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Header title={t('challenges.title')} />
      <SafeAreaView style={styles.safeArea}>
        {/* Week selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weekSelectorContainer}
          contentContainerStyle={styles.weekSelector}
        >
          {weeks.map(week => (
            <TouchableOpacity
              key={week.id}
              style={[
                styles.weekButton,
                selectedWeekId === week.id && styles.selectedWeekButton,
              ]}
              onPress={() => setSelectedWeekId(week.id)}
            >
              <Text
                style={[
                  styles.weekButtonText,
                  selectedWeekId === week.id && styles.selectedWeekText,
                ]}
              >
                Week {week.week_number}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Challenges list */}
        <FlatList
          style={styles.container}
          data={[
            { title: t('challenges.currentWeek'), data: weekChallenges },
            { title: t('challenges.general'), data: generalChallenges }
          ]}
          renderItem={({ item: section }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.data.map((challenge) => (
                <View key={challenge.id}>
                  <View style={styles.challengeCard}>
                    <View style={styles.challengeHeader}>
                      <Text style={styles.challengeTitle}>{challenge.title}</Text>
                      <View style={styles.pointsBadge}>
                        <Text style={styles.pointsText}>{challenge.points} pts</Text>
                      </View>
                    </View>
                    <Text style={styles.challengeDescription}>{challenge.description}</Text>
                    <View style={styles.challengeFooter}>
                      <View style={styles.challengeType}>
                        <Ionicons
                          name={CHALLENGE_TYPE_CONFIG[challenge.challenge_type]?.icon ?? 'ellipse-outline'}
                          size={16}
                          color={Colors.light.textSecondary}
                        />
                        <Text style={styles.challengeTypeText}>
                          {challenge.game_type && GAME_TYPE_LABELS[challenge.game_type]
                            ? GAME_TYPE_LABELS[challenge.game_type]
                            : (CHALLENGE_TYPE_CONFIG[challenge.challenge_type]?.label ?? challenge.challenge_type)}
                        </Text>
                      </View>
                      <View style={styles.actionButtons}>
                        {challenge.points_awarded && (
                          <TouchableOpacity
                            style={[styles.statusButton, styles.deleteButton]}
                            onPress={() => handleDeletePress(challenge)}
                          >
                            <Text style={styles.deleteButtonText}>
                              {t('common.delete')}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.statusButton}
                          onPress={() => handleChallengePress(challenge)}
                        >
                          <Text style={styles.statusButtonText}>
                            {challenge.points_awarded
                              ? t('challenges.editScore')
                              : t('challenges.markComplete')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          keyExtractor={(section) => section.title}
        />

        {!!selectedChallenge && (
          <ScoreInputModal
            visible={modalVisible}
            challenge={selectedChallenge}
            totalFamilyMembers={currentFamily?.member_count ?? 1}
            initialPoints={selectedChallenge.points_awarded ?? 0}
            initialPercentage={selectedChallenge.percentage_score ?? 0}
            onClose={() => setModalVisible(false)}
            onSubmit={handleScoreSubmit}
          />
        )}

        <DeleteConfirmationModal
          visible={deleteModalVisible}
          challengeTitle={challengeToDelete?.title ?? ''}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setDeleteModalVisible(false);
            setChallengeToDelete(null);
          }}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },

  container: {
    flex: 1,
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    fontSize: Font.sizes.body,
    color: Colors.light.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.purple[2],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: Font.sizes.body,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Font.sizes.h2,
    fontWeight: '700',
    color: Colors.purple[3],
    marginBottom: Spacing.md,
  },
  challengeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  challengeTitle: {
    flex: 1,
    fontSize: Font.sizes.h2,
    fontWeight: '600',
    color: Colors.light.textPrimary,
    marginRight: Spacing.sm,
  },
  pointsBadge: {
    backgroundColor: Colors.purple[2],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.medium,
  },
  pointsText: {
    color: Colors.white,
    fontSize: Font.sizes.caption,
    fontWeight: '600',
  },
  challengeDescription: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.lg,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeTypeText: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    marginLeft: Spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    marginRight: Spacing.xs,
  },
  statusButton: {
    backgroundColor: Colors.teal[0],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.medium,
  },
  statusButtonText: {
    color: Colors.teal[3],
    fontSize: Font.sizes.caption,
    fontWeight: '600',
  },
  weekSelectorContainer: {
    width: '100%',
    flexGrow: 0,            // prevent ScrollView from stretching vertically
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  },
  weekSelector: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  weekButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.large,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    marginRight: Spacing.sm,
  },
  selectedWeekButton: {
    backgroundColor: Colors.purple[2],
    borderColor: Colors.purple[2],
  },
  weekButtonText: {
    fontSize: Font.sizes.caption,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  selectedWeekText: {
    color: Colors.white,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  deleteButton: {
    backgroundColor: Colors.red[1],
  },
  deleteButtonText: {
    color: Colors.white,
    fontSize: Font.sizes.caption,
    fontWeight: '600',
  },
});
