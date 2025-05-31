// app/(tabs)/marathon/challenges.tsx - Challenges Screen
import ScoreInputModal from "@/components/ScoreInputModal";
import { BorderRadius, Colors, Font, Spacing } from "@/constants/Theme";
import {
  type Challenge,
  type ChallengeWithProgress,
  fetchMarathonChallenges,
  updateChallengeScore
} from '@/services/challenges';
import { getCurrentFamily } from "@/services/familyService";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFamily } from "../../context/FamilyContext";
import { useMarathon } from "../../context/MarathonContext";

export default function ChallengesScreen() {
  const { marathonId } = useLocalSearchParams();
  const { selectedMarathon } = useMarathon();
  const currentMarathonId = marathonId || selectedMarathon?.id;

  const { currentFamily, setCurrentFamily } = useFamily();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekChallenges, setWeekChallenges] = useState<ChallengeWithProgress[]>([]);
  const [generalChallenges, setGeneralChallenges] = useState<ChallengeWithProgress[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // TODO: Calculate based on marathon start date
  const currentWeekId = 1;
  // TODO: Get this from the family data
  const totalFamilyMembers = 4;

  const fetchChallenges = async () => {
    if (!currentFamily) return;

    try {
      setLoading(true);
      setError(null);
      const { weekChallenges: weekly, generalChallenges: general } =
        await fetchMarathonChallenges(
          Number(currentMarathonId),
          currentFamily.id,
          currentWeekId
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

  const handleChallengePress = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setSelectedChallenge(null);
    setModalVisible(false);
  };

  const handleScoreSubmit = async (points: number, percentage?: number) => {
    if (!currentFamily || !selectedChallenge) return;

    if (!selectedChallenge.week_challenge_id && !selectedChallenge.is_general) {
      setError('Challenge is not properly linked to a week');
      return;
    }

    try {
      await updateChallengeScore(
        currentFamily.id,
        points,
        percentage,
        selectedChallenge.week_challenge_id,
        selectedChallenge.id
      );

      // Refresh challenges after update
      await fetchChallenges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update challenge status');
    }
  };

  useEffect(() => {
    async function initializeFamily() {
      if (currentMarathonId && !currentFamily) {
        const family = await getCurrentFamily(Number(currentMarathonId));
        if (family) {
          setCurrentFamily(family);
        }
      }
    }

    initializeFamily();
  }, [currentMarathonId, currentFamily]);

  useEffect(() => {
    if (currentMarathonId && currentFamily) {
      fetchChallenges();
    }
  }, [currentMarathonId, currentFamily, currentWeekId]);

  const renderChallengeCard = ({ item }: { item: ChallengeWithProgress }) => {
    const isCompleted = !!item.points_awarded;
    return (
      <View style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeTitle}>{item.title}</Text>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>{item.points} pts</Text>
          </View>
        </View>

        <Text style={styles.challengeDescription}>{item.description}</Text>

        <View style={styles.challengeFooter}>
          <View style={styles.challengeType}>
            <Ionicons
              name={item.is_general ? "infinite" : "calendar"}
              size={16}
              color={Colors.light.textSecondary}
            />
            <Text style={styles.challengeTypeText}>
              {item.is_general ? "General" : "Weekly"}
            </Text>
          </View>

          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status:</Text>
            <TouchableOpacity
              style={[
                styles.statusButton,
                isCompleted && styles.statusButtonCompleted
              ]}
              onPress={() => handleChallengePress(item)}
            >
              <Text style={[
                styles.statusButtonText,
                isCompleted && styles.statusButtonTextCompleted
              ]}>
                {isCompleted ? 'Completed' : 'Mark Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple[2]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
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
    <SafeAreaView style={styles.safeArea}>
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
              <React.Fragment key={challenge.id}>
                {renderChallengeCard({ item: challenge })}
              </React.Fragment>
            ))}
          </View>
        )}
        keyExtractor={(section) => section.title}
      />

      {selectedChallenge && (
        <ScoreInputModal
          visible={modalVisible}
          challenge={selectedChallenge}
          totalFamilyMembers={totalFamilyMembers}
          onClose={handleModalClose}
          onSubmit={handleScoreSubmit}
        />
      )}
    </SafeAreaView>
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
    color: Colors.blue[3],
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
    fontWeight: '700',
    color: Colors.light.textPrimary,
    marginRight: Spacing.sm,
  },
  pointsBadge: {
    backgroundColor: Colors.purple[0],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.medium,
  },
  pointsText: {
    color: Colors.purple[3],
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
});