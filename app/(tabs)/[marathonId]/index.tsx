// app/(tabs)/marathon/index.tsx - Marathon Home Screen
import { router, useLocalSearchParams } from "expo-router";
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMarathon } from "../../../context/MarathonContext";

export default function MarathonScreen() {
  const { marathonId } = useLocalSearchParams();
  const { selectedMarathon } = useMarathon();

  if (!selectedMarathon) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Marathon not found</Text>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.exitButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Marathon Dashboard</Text>
        <Text style={styles.subtitle}>Welcome to {selectedMarathon.title}!</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {Math.ceil((new Date(selectedMarathon.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
            </Text>
            <Text style={styles.statLabel}>Days Remaining</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{selectedMarathon.family_count}</Text>
            <Text style={styles.statLabel}>Families</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.exitButton}
          onPress={() => {
            router.replace("/");
          }}
        >
          <Text style={styles.exitButtonText}>Exit Marathon</Text>
        </TouchableOpacity>
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
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  exitButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: "center",
  },
  exitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
