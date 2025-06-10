// app/(tabs)/marathon/challenges.tsx
import { Header } from "@/components/Header";
import ScoreInputModal from "@/components/ScoreInputModal";
import { BorderRadius, Colors, Font, Spacing } from "@/constants/Theme";
import { useAuth } from '@/context/AuthContext';
import { useFamily } from "@/context/FamilyContext";
import { useMarathon } from "@/context/MarathonContext";
import {
  type Challenge,
  type ChallengeWithProgress,
  fetchMarathonChallenges,
  updateChallengeScore
} from '@/services/challenges';
import { fetchWeeksByMarathonId } from '@/services/marathonService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

export default function ChallengesScreen() {
  const { marathonId } = useLocalSearchParams();
  const { selectedMarathon } = useMarathon();
  const currentMarathonId = Number(marathonId ?? selectedMarathon?.id);
  const { currentFamily } = useFamily();
  const { userProfile } = useAuth();

  const [weeks, setWeeks] = useState<{ id: number; week_number: number; start_date: string; end_date: string }[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekChallenges, setWeekChallenges] = useState<ChallengeWithProgress[]>([]);
  const [generalChallenges, setGeneralChallenges] = useState<ChallengeWithProgress[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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
      setError('Could not load weeks.');
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

  // Kick off weeks load when marathon & family ready
  useEffect(() => {
    if (currentMarathonId && currentFamily) {
      loadWeeks();
    }
  }, [currentMarathonId, currentFamily]);

  // Fetch challenges when week selection changes
  useEffect(() => {
    fetchChallenges();
  }, [selectedWeekId, currentFamily]);

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
      fetchChallenges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update challenge');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Challenges" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple[2]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Challenges" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchChallenges}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Header title="Challenges" />
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
            { title: 'Current Week Challenges', data: weekChallenges },
            { title: 'General Challenges', data: generalChallenges }
          ]}
          renderItem={({ item: section }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.data.map((challenge) => (
                <View key={challenge.id}>{/* renderChallengeCard */}
                  <View style={styles.challengeCard}>
                    {/* ...same as before... */}
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
                          name={challenge.is_general ? "infinite" : "calendar"}
                          size={16}
                          color={Colors.light.textSecondary}
                        />
                        <Text style={styles.challengeTypeText}>
                          {challenge.is_general ? "General" : "Weekly"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.statusButton,
                          !!challenge.points_awarded && styles.statusButtonCompleted
                        ]}
                        onPress={() => handleChallengePress(challenge)}
                      >
                        <Text style={[
                          styles.statusButtonText,
                          !!challenge.points_awarded && styles.statusButtonTextCompleted
                        ]}>
                          {challenge.points_awarded ? 'Completed' : 'Mark Complete'}
                        </Text>
                      </TouchableOpacity>
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
            onClose={() => setModalVisible(false)}
            onSubmit={handleScoreSubmit}
          />
        )}
      </SafeAreaView >
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
  statusButtonCompleted: {
    backgroundColor: Colors.teal[2],
    // disable button
    opacity: 0.5,
    pointerEvents: 'none',
  },
  statusButtonText: {
    color: Colors.teal[3],
    fontSize: Font.sizes.caption,
    fontWeight: '600',
  },
  statusButtonTextCompleted: {
    color: Colors.white,
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
});
