// app/(tabs)/marathon/tournament.tsx - Tournament Screen
import Header from "@/components/Header";
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMarathon } from "../../context/MarathonContext";

export default function TournamentScreen() {
  const { marathonId } = useLocalSearchParams();
  const { selectedMarathon } = useMarathon();
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={`${selectedMarathon?.title || 'Marathon'} Tournament`} />
      <View style={styles.container}>
        <Text style={styles.title}>Tournament</Text>

        <View style={styles.tournamentCard}>
          <Text style={styles.tournamentTitle}>Spring Marathon Cup</Text>
          <Text style={styles.tournamentSubtitle}>Bracket Stage</Text>

          <View style={styles.matchInfo}>
            <Text style={styles.matchTitle}>Your Next Match</Text>
            <View style={styles.versus}>
              <Text style={styles.playerName}>You</Text>
              <Text style={styles.vsText}>VS</Text>
              <Text style={styles.playerName}>Sarah Connor</Text>
            </View>
            <Text style={styles.matchTime}>Tomorrow at 9:00 AM</Text>
          </View>

          <TouchableOpacity style={styles.viewBracketButton}>
            <Text style={styles.viewBracketText}>View Full Bracket</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Tournament Stats</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Matches Won:</Text>
            <Text style={styles.statValue}>3</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Matches Lost:</Text>
            <Text style={styles.statValue}>1</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Current Round:</Text>
            <Text style={styles.statValue}>Quarter Finals</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  tournamentCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tournamentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  tournamentSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  matchInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  versus: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 100,
    textAlign: "center",
  },
  vsText: {
    fontSize: 14,
    color: "#666",
    marginHorizontal: 20,
  },
  matchTime: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  viewBracketButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewBracketText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  statsCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statLabel: {
    fontSize: 16,
    color: "#666",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
  },
});
