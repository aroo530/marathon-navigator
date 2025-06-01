// app/(tabs)/marathon/tournament.tsx - Tournament Screen
import { useAuth } from '@/app/context/AuthContext';
import { Header } from "@/components/Header";
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { BorderRadius, Colors, Font, Spacing } from '@/constants/Theme';
import { Tournament, TournamentMatch, canUpdateMatchResults, getCurrentTournament, updateMatchResult } from '@/services/tournamentService';
import { format } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMarathon } from "../../context/MarathonContext";

type ConfirmationModalProps = {
  visible: boolean;
  match: TournamentMatch;
  newWinnerId: number;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmationModal = ({ visible, match, newWinnerId, onConfirm, onCancel }: ConfirmationModalProps) => {
  if (!visible || !match || newWinnerId === null) return null;

  const currentWinnerName = match.winner_family_id === match.family1_id ? match.family1_name : match.family2_name;
  const newWinnerName = newWinnerId === match.family1_id ? match.family1_name : match.family2_name;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={styles.modalContent}>
          <ThemedText type="title" style={styles.modalTitle}>Change Match Result?</ThemedText>
          <ThemedText type="default" style={styles.modalText}>
            Are you sure you want to change the winner from{' '}
            <ThemedText type="defaultSemiBold" style={styles.teamHighlight}>{currentWinnerName}</ThemedText> to{' '}
            <ThemedText type="defaultSemiBold" style={styles.teamHighlight}>{newWinnerName}</ThemedText>?
          </ThemedText>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onCancel}
            >
              <ThemedText type="defaultSemiBold" style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={onConfirm}
            >
              <ThemedText type="defaultSemiBold" style={styles.confirmButtonText}>Confirm</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
};

export default function TournamentScreen() {
  const insets = useSafeAreaInsets();
  const { marathonId } = useLocalSearchParams();
  const { selectedMarathon } = useMarathon();
  const currentMarathonId = marathonId || selectedMarathon?.id;

  const { userProfile } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    match: TournamentMatch | null;
    newWinnerId: number | null;
  }>({
    visible: false,
    match: null,
    newWinnerId: null
  });

  // Mock weeks - in a real app, you would fetch this from your backend
  const weeks = [1, 2, 3, 4];

  useEffect(() => {
    loadTournament();
  }, [marathonId, selectedWeek]);

  const loadTournament = async () => {
    try {
      setLoading(true);
      const data = await getCurrentTournament(Number(currentMarathonId), selectedWeek);
      setTournament(data);
    } catch (error) {
      console.error('Error loading tournament:', error);
      Alert.alert('Error', 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTournament();
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateMatchResult = async (match: TournamentMatch, winnerFamilyId: number) => {
    if (!tournament || !userProfile || !canUpdateMatchResults(userProfile.role)) {
      Alert.alert('Error', 'You do not have permission to update match results');
      return;
    }

    // If match is completed and winner is being changed, show confirmation
    if (match.status === 'completed' && match.winner_family_id !== winnerFamilyId) {
      setConfirmationModal({
        visible: true,
        match,
        newWinnerId: winnerFamilyId
      });
      return;
    }

    await updateMatchWinner(match, winnerFamilyId);
  };

  const updateMatchWinner = async (match: TournamentMatch, winnerFamilyId: number) => {
    const loserFamilyId = winnerFamilyId === match.family1_id ? match.family2_id : match.family1_id;

    try {
      const result = await updateMatchResult(
        tournament!.id,
        selectedWeek,
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
    } catch (error) {
      console.error('Error updating match result:', error);
      Alert.alert('Error', 'Failed to update match result');
    }
  };

  const handleConfirmationResponse = async (confirmed: boolean) => {
    const { match, newWinnerId } = confirmationModal;
    setConfirmationModal({ visible: false, match: null, newWinnerId: null });

    if (confirmed && match && newWinnerId) {
      await updateMatchWinner(match, newWinnerId);
    }
  };

  const renderMatch = (match: TournamentMatch) => {
    const isAdmin = userProfile?.role === 'admin';
    const isCompleted = match.status === 'completed';
    const family1Won = match.winner_family_id === match.family1_id;
    const family2Won = match.winner_family_id === match.family2_id;

    return (
      <View key={match.match_id} style={styles.matchCard}>
        {/* <Text style={styles.matchTime}>
          {format(new Date(match.match_date), 'MMM d, yyyy h:mm a')}
        </Text>
         */}
        <View style={styles.versus}>
          <TouchableOpacity 
            style={[
              styles.teamButton,
              family1Won && styles.winnerTeam
            ]}
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
            style={[
              styles.teamButton,
              family2Won && styles.winnerTeam
            ]}
            disabled={!isAdmin}
            onPress={() => handleUpdateMatchResult(match, match.family2_id)}
          >
            <Text style={[styles.teamName, family2Won && styles.winnerText]}>
              {match.family2_name}
            </Text>
          </TouchableOpacity>
        </View>

        {isCompleted && (
          <View style={styles.resultBadge}>
            <Text style={styles.resultText}>
              Winner: {match.winner_family_id === match.family1_id ? match.family1_name : match.family2_name}
            </Text>
          </View>
        )}

        {isAdmin && !isCompleted && (
          <Text style={styles.adminHint}>Tap a team to set as winner</Text>
        )}
      </View>
    );
  };

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

  if (!tournament) {
    return (
      <View style={styles.container}>
        <Header title="Tournament" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.centerContainer, { paddingBottom: insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.purple[1]}
              colors={[Colors.purple[1]]}
              progressBackgroundColor={Colors.white}
            />
          }
        >
          <Text style={styles.noTournamentText}>No active tournament found</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header 
        title={tournament.title}
        subtitle={tournament.description}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.purple[1]}
            colors={[Colors.purple[1]]}
            progressBackgroundColor={Colors.white}
          />
        }
      >
        <View style={styles.dateContainer}>
          <ThemedText type="default" style={styles.dates}>
            {format(new Date(tournament.start_date), 'MMM d')} - {format(new Date(tournament.end_date), 'MMM d, yyyy')}
          </ThemedText>
        </View>

        <View style={styles.weekSelector}>
          {weeks.map((week) => (
            <TouchableOpacity
              key={week}
              style={[
                styles.weekButton,
                selectedWeek === week && styles.selectedWeekButton
              ]}
              onPress={() => setSelectedWeek(week)}
            >
              <Text style={[
                styles.weekButtonText,
                selectedWeek === week && styles.selectedWeekText
              ]}>
                Week {week}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.matchesContainer}>
          <Text style={styles.sectionTitle}>Week {selectedWeek} Matches</Text>
          
          {tournament.matches && tournament.matches.length > 0 ? (
            tournament.matches.map(renderMatch)
          ) : (
            <View style={styles.noMatchesContainer}>
              <Text style={styles.noMatchesText}>No matches scheduled for this week</Text>
            </View>
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Tournament Stats</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Total Matches:</Text>
            <Text style={styles.statValue}>{tournament.matches?.length || 0}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Completed Matches:</Text>
            <Text style={styles.statValue}>
              {tournament.matches?.filter(m => m.status === 'completed').length || 0}
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

      {confirmationModal.visible && confirmationModal.match && confirmationModal.newWinnerId !== null && (
        <ConfirmationModal
          visible={confirmationModal.visible}
          match={confirmationModal.match}
          newWinnerId={confirmationModal.newWinnerId}
          onConfirm={() => handleConfirmationResponse(true)}
          onCancel={() => handleConfirmationResponse(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  } as ViewStyle,
  scrollView: {
    flex: 1,
  } as ViewStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: Colors.purple[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.purple[3],
  },
  title: {
    fontSize: Font.sizes.h2,
    fontWeight: "bold",
    color: Colors.white,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Font.sizes.caption,
    color: Colors.white,
    opacity: 0.9,
    textAlign: "center",
    marginTop: 4,
  },
  dates: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  },
  weekButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
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
  matchesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: Font.sizes.h2,
    fontWeight: "700",
    marginBottom: 16,
    color: Colors.purple[2],
  },
  matchCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    paddingTop: 24,
    padding: 16,
    paddingBottom: 16,
    marginBottom: 16,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: Colors.purple[1],
    borderRightWidth: 4,
    borderRightColor: Colors.purple[1],
  },
  matchTime: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  versus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  vsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  teamButton: {
    flex: 1,
    padding: 12,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  teamName: {
    fontSize: Font.sizes.body,
    fontWeight: "500",
    textAlign: "center",
    color: Colors.light.textPrimary,
  },
  winnerTeam: {
    backgroundColor: Colors.purple[2],
    borderColor: Colors.purple[1],
  },
  winnerText: {
    color: Colors.white,
  },
  vsText: {
    fontSize: Font.sizes.caption,
    color: Colors.purple[3],
    fontWeight: "700",
  },
  resultBadge: {
    // backgroundColor: Colors.purple[0],
    borderRadius: BorderRadius.small,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
    marginTop: 8,
  },
  resultText: {
    fontSize: Font.sizes.caption,
    color: Colors.purple[3],
    fontWeight: "500",
    textAlign: "center",
  },
  adminHint: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  noMatchesContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.purple[0],
    borderStyle: 'dashed',
  },
  noMatchesText: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsCard: {
    backgroundColor: Colors.white,
    margin: 20,
    padding: 20,
    borderRadius: BorderRadius.large,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderTopWidth: 4,
    borderTopColor: Colors.purple[1],
  },
  statsTitle: {
    fontSize: Font.sizes.h2,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: Colors.purple[2],
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  },
  statLabel: {
    fontSize: Font.sizes.body,
    color: Colors.light.textSecondary,
  },
  statValue: {
    fontSize: Font.sizes.body,
    fontWeight: "600",
    color: Colors.purple[2],
  },
  statusBadge: {
    backgroundColor: Colors.purple[0],
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusText: {
    fontSize: Font.sizes.caption,
    color: Colors.purple[3],
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  noTournamentText: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: BorderRadius.large,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    // borderLeftWidth: 3,
    // borderLeftColor: Colors.purple[2],
  },
  modalTitle: {
    marginBottom: Spacing.md,
    fontSize: Font.sizes.h1,
  },
  modalText: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  teamHighlight: {
    color: Colors.purple[2],
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  modalButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    minWidth: 120,
  },
  cancelButton: {
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.cardBorder,
  },
  confirmButton: {
    backgroundColor: Colors.purple[2],
  },
  cancelButtonText: {
    textAlign: 'center',
  },
  confirmButtonText: {
    color: Colors.white,
    textAlign: 'center',
  },
  dateContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  } as ViewStyle,
});

