// app/(tabs)/marathon/tournament.tsx
import { Header } from '@/components/Header';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { useMarathon } from '@/context/MarathonContext';
import { fetchWeeksByMarathonId } from '@/services/marathonService';
import {
  Tournament,
  TournamentMatch,
  canUpdateMatchResults,
  getCurrentTournament,
  updateMatchResult,
} from '@/services/tournamentService';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Week = {
  id: number;
  week_number: number;
  start_date: string;
  end_date: string;
};

type ConfirmationModalProps = {
  visible: boolean;
  match: TournamentMatch | null;
  newWinnerId: number | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmationModal = ({
  visible,
  match,
  newWinnerId,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  if (!visible || !match || newWinnerId == null) return null;
  const currentWinnerName =
    match.winner_family_id === match.family1_id
      ? match.family1_name
      : match.family2_name;
  const newWinnerName =
    newWinnerId === match.family1_id ? match.family1_name : match.family2_name;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <ThemedText type="title" style={styles.modalTitle}>
            Change Match Result?
          </ThemedText>
          <ThemedText type="default" style={styles.modalText}>
            Are you sure you want to change the winner from{' '}
            <ThemedText type="defaultSemiBold" style={styles.teamHighlight}>
              {currentWinnerName}
            </ThemedText>{' '}
            to{' '}
            <ThemedText type="defaultSemiBold" style={styles.teamHighlight}>
              {newWinnerName}
            </ThemedText>
            ?
          </ThemedText>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <ThemedText type="defaultSemiBold" style={styles.cancelButtonText}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={onConfirm}
            >
              <ThemedText type="defaultSemiBold" style={styles.confirmButtonText}>
                Confirm
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
};

export default function TournamentScreen() {
  const insets = useSafeAreaInsets();
  const { marathonId: paramId } = useLocalSearchParams();
  const { selectedMarathon } = useMarathon();
  const currentMarathonId = Number(paramId ?? selectedMarathon?.id);

  const { userProfile } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    match: TournamentMatch | null;
    newWinnerId: number | null;
  }>({
    visible: false,
    match: null,
    newWinnerId: null,
  });

  // Fetch weeks and auto-select current
  const loadWeeks = async () => {
    if (!currentMarathonId) return;
    try {
      const allWeeks = await fetchWeeksByMarathonId(currentMarathonId);
      setWeeks(allWeeks);

      const today = new Date();
      const current = allWeeks.find((w) => {
        const start = new Date(w.start_date);
        const end = new Date(w.end_date);
        return today >= start && today <= end;
      });
      setSelectedWeek(current?.week_number ?? allWeeks[0]?.week_number ?? null);
    } catch (err) {
      console.error('Error loading weeks:', err);
      Alert.alert('Error', 'Could not load weeks.');
    }
  };

  // Fetch tournament for the selected week
  const loadTournament = async () => {
    if (!currentMarathonId || selectedWeek == null) return;
    try {
      setLoading(true);
      const data = await getCurrentTournament(currentMarathonId, selectedWeek);
      setTournament(data);
    } catch (err) {
      console.error('Error loading tournament:', err);
      Alert.alert('Error', 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTournament();
    setRefreshing(false);
  };

  // Initial load of weeks
  useEffect(() => {
    loadWeeks();
  }, [currentMarathonId]);

  // Reload tournament when week changes
  useEffect(() => {
    loadTournament();
  }, [selectedWeek]);

  const handleUpdateMatchResult = async (
    match: TournamentMatch,
    winnerFamilyId: number
  ) => {
    if (!userProfile || !canUpdateMatchResults(userProfile.role)) {
      Alert.alert('Error', 'You do not have permission to update match results');
      return;
    }

    if (match.status === 'completed' && match.winner_family_id !== winnerFamilyId) {
      setConfirmationModal({
        visible: true,
        match,
        newWinnerId: winnerFamilyId,
      });
      return;
    }
    await updateMatchWinner(match, winnerFamilyId);
  };

  const updateMatchWinner = async (
    match: TournamentMatch,
    winnerFamilyId: number
  ) => {
    const loserFamilyId =
      winnerFamilyId === match.family1_id ? match.family2_id : match.family1_id;
    try {
      const result = await updateMatchResult(
        tournament!.id,
        selectedWeek!,
        winnerFamilyId,
        loserFamilyId,
        userProfile!.id
      );
      if (result.success) {
        await loadTournament();
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', 'Failed to update match result');
      }
    } catch (err) {
      console.error('Error updating match result:', err);
      Alert.alert('Error', 'Failed to update match result');
    }
  };

  const handleConfirmationResponse = async (confirmed: boolean) => {
    const { match, newWinnerId } = confirmationModal;
    setConfirmationModal({ visible: false, match: null, newWinnerId: null });
    if (confirmed && match && newWinnerId != null) {
      await updateMatchWinner(match, newWinnerId);
    }
  };

  const renderMatch = (match: TournamentMatch) => {
    const isAdmin = userProfile?.role === 'admin';
    const family1Won = match.winner_family_id === match.family1_id;
    const family2Won = match.winner_family_id === match.family2_id;

    return (
      <View key={match.match_id} style={styles.matchCard}>
        <View style={styles.versus}>
          <TouchableOpacity
            style={[styles.teamButton, family1Won && styles.winnerTeam]}
            disabled={!isAdmin}
            onPress={() => handleUpdateMatchResult(match, match.family1_id)}
          >
            <Text style={[styles.teamName, family1Won && styles.winnerText]}>
              {match.family1_name}
            </Text>
          </TouchableOpacity>
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <TouchableOpacity
            style={[styles.teamButton, family2Won && styles.winnerTeam]}
            disabled={!isAdmin}
            onPress={() => handleUpdateMatchResult(match, match.family2_id)}
          >
            <Text style={[styles.teamName, family2Won && styles.winnerText]}>
              {match.family2_name}
            </Text>
          </TouchableOpacity>
        </View>
        {match.status === 'completed' && (
          <View style={styles.resultBadge}>
            <Text style={styles.resultText}>
              Winner:{' '}
              {family1Won ? match.family1_name : match.family2_name}
            </Text>
          </View>
        )}
        {isAdmin && match.status !== 'completed' && (
          <Text style={styles.adminHint}>Tap a team to set as winner</Text>
        )}
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Tournament" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.purple[1]} />
        </View>
      </View>
    );
  }

  // No tournament
  if (!tournament) {
    return (
      <View style={styles.container}>
        <Header title="Tournament" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.centerContainer,
            { paddingBottom: insets.bottom },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.purple[1]}
            />
          }
        >
          <Text style={styles.noTournamentText}>
            No active tournament found
          </Text>
        </ScrollView>
      </View>
    );
  }

  // Main UI
  return (
    <View style={styles.container}>
      <Header title={tournament.title} subtitle={tournament.description} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.purple[1]}
          />
        }
      >
        {/* Week selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekSelector}
        >
          {weeks.map((w) => (
            <TouchableOpacity
              key={w.week_number}
              style={[
                styles.weekButton,
                selectedWeek === w.week_number &&
                styles.selectedWeekButton,
              ]}
              onPress={() => setSelectedWeek(w.week_number)}
            >
              <Text
                style={[
                  styles.weekButtonText,
                  selectedWeek === w.week_number &&
                  styles.selectedWeekText,
                ]}
              >
                Week {w.week_number}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Matches */}
        <View style={styles.matchesContainer}>
          <Text style={styles.sectionTitle}>
            Week {selectedWeek} Matches
          </Text>
          {tournament.matches.length > 0 ? (
            tournament.matches.map(renderMatch)
          ) : (
            <View style={styles.noMatchesContainer}>
              <Text style={styles.noMatchesText}>
                No matches scheduled for this week
              </Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Tournament Stats</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Total Matches:</Text>
            <Text style={styles.statValue}>
              {tournament.matches.length}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Completed Matches:</Text>
            <Text style={styles.statValue}>
              {
                tournament.matches.filter((m) => m.status === 'completed')
                  .length
              }
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{tournament.status}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={confirmationModal.visible}
        match={confirmationModal.match!}
        newWinnerId={confirmationModal.newWinnerId}
        onConfirm={() => handleConfirmationResponse(true)}
        onCancel={() => handleConfirmationResponse(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scrollView: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  noTournamentText: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },

  weekSelector: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
    justifyContent: 'space-around',
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

  matchesContainer: { padding: Spacing.lg },
  sectionTitle: {
    fontSize: Font.sizes.h2,
    fontWeight: '700',
    marginBottom: Spacing.md,
    color: Colors.purple[2],
  },
  matchCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  versus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vsContainer: {
    marginHorizontal: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.light.cardBackground,
  },
  vsText: {
    fontSize: Font.sizes.caption,
    fontWeight: '700',
    color: Colors.purple[3],
  },
  teamButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  teamName: {
    fontSize: Font.sizes.body,
    fontWeight: '500',
    textAlign: 'center',
    color: Colors.light.textPrimary,
  },
  winnerTeam: {
    backgroundColor: Colors.purple[2],
    borderColor: Colors.purple[1],
  },
  winnerText: { color: Colors.white },
  resultBadge: {
    marginTop: Spacing.md,
    alignSelf: 'center',
  },
  resultText: {
    fontSize: Font.sizes.caption,
    fontWeight: '600',
    color: Colors.purple[3],
  },
  adminHint: {
    fontSize: Font.sizes.caption,
    fontStyle: 'italic',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  noMatchesContainer: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.large,
    alignItems: 'center',
  },
  noMatchesText: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
  },

  statsCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: Font.sizes.h2,
    fontWeight: '700',
    color: Colors.purple[2],
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  },
  statLabel: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
  },
  statValue: {
    fontSize: Font.sizes.body,
    fontWeight: '600',
    color: Colors.purple[2],
  },

  statusBadge: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.purple[0],
  },
  statusText: {
    fontSize: Font.sizes.caption,
    fontWeight: '600',
    color: Colors.purple[3],
    textTransform: 'capitalize',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: { fontSize: Font.sizes.h1, marginBottom: Spacing.md },
  modalText: { textAlign: 'center', marginBottom: Spacing.lg },
  teamHighlight: { color: Colors.purple[2] },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  cancelButtonText: { textAlign: 'center' },
  confirmButton: { backgroundColor: Colors.purple[2] },
  confirmButtonText: { color: Colors.white, textAlign: 'center' },
});
