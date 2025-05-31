import React from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MarathonCard from "@/components/marathon/MarathonCard";
import { BorderRadius, Colors, Font, Spacing } from "@/constants/Theme";
import { router } from "expo-router";
import type { Marathon } from "../context/MarathonContext";
import { useMarathon } from "../context/MarathonContext";

export default function HomeScreen() {
  const { marathons, loading, refreshMarathons, setSelectedMarathon } = useMarathon();
  const featuredMarathon = marathons[0];

  const onSelectMarathon = (marathon: Marathon) => {
    setSelectedMarathon(marathon);
    router.push(`/${marathon.id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshMarathons} />
        }
      >
        {/* Featured Marathon */}
        {featuredMarathon && (
          <TouchableOpacity onPress={() => onSelectMarathon(featuredMarathon)}>
            <View style={styles.featuredCard}>
              <View style={styles.featuredContent}>
                <Text style={styles.featuredTitle}>Active Marathon</Text>
                <Text style={styles.featuredSubtitle}>
                  {featuredMarathon.title}
                </Text>
                <Text style={styles.endsInText}>
                  Ends on {new Date(featuredMarathon.end_date).toDateString()}
                </Text>
              </View>
              {featuredMarathon.picture_url && (
                <Image
                  source={{ uri: featuredMarathon.picture_url }}
                  style={styles.featuredImage}
                />
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Available Marathons */}
        <Text style={styles.sectionTitle}>Available Marathons</Text>

        {loading && <ActivityIndicator size="large" color={Colors.purple[2]} />}

        <View style={styles.marathonList}>
          {marathons.map((marathon) => (
            <MarathonCard
              key={marathon.id}
              title={marathon.title}
              description={marathon.description}
              picture_url={marathon.picture_url || ''}
              startDate={marathon.start_date}
              endDate={marathon.end_date}
              familyCount={marathon.family_count}
              onPress={() => onSelectMarathon(marathon)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    padding: Spacing.lg,
  },
  featuredCard: {
    backgroundColor: Colors.purple[3],
    borderRadius: BorderRadius.large,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: Colors.light.cardShadow,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  featuredContent: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: Font.sizes.body,
    fontWeight: "600",
    color: Colors.orange[2],
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontSize: Font.sizes.h2,
    fontWeight: "700",
    color: Colors.dark.textPrimary,
  },
  endsInText: {
    fontSize: Font.sizes.caption,
    color: Colors.yellow[0],
    marginTop: 4,
  },
  featuredImage: {
    width: 92,
    height: 92,
    borderRadius: 500,
    marginLeft: Spacing.md,
    backgroundColor: Colors.light.background,
  },
  sectionTitle: {
    fontSize: Font.sizes.h2,
    fontWeight: "700",
    color: Colors.blue[3],
    marginBottom: Spacing.sm,
  },
  marathonList: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
});
