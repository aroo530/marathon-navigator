import React from "react";
import { useTranslation } from "react-i18next";
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

import { Header } from "@/components/Header";
import MarathonCard from "@/components/marathon/MarathonCard";
import { BorderRadius, Colors, Font, Spacing } from "@/constants/Theme";
import { useAuth } from "@/context/AuthContext";
import { useFamily } from "@/context/FamilyContext";
import { getCurrentFamily } from "@/services/familyService";
import { router } from "expo-router";
import type { Marathon } from "../../context/MarathonContext";
import { useMarathon } from "../../context/MarathonContext";

export default function HomeScreen() {
  const { t } = useTranslation();
  const { marathons, loading, refreshMarathons, setSelectedMarathon } = useMarathon();
  const featured = marathons[0];
  const { userProfile } = useAuth();
  const { setCurrentFamily } = useFamily();

  const onSelect = async (m: Marathon) => {
    setSelectedMarathon(m);
    if (userProfile?.id) {
      try {
        const fam = await getCurrentFamily(m.id, userProfile.id);
        fam && setCurrentFamily(fam);
      } catch (err) {
        console.error("fetch family failed:", err);
      }
    }
    router.push(`/${m.id}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={t("home.tournamentTitle")} />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshMarathons} />
        }
      >
        {featured && (
          <TouchableOpacity onPress={() => onSelect(featured)}>
            <View style={styles.featuredCard}>
              <View style={styles.featuredContent}>
                <Text style={styles.featuredTitle}>
                  {t("home.activeMarathon")}
                </Text>
                <Text style={styles.featuredSubtitle}>
                  {featured.title}
                </Text>
                <Text style={styles.endsInText}>
                  {t("home.endsOn", {
                    date: new Date(featured.end_date).toLocaleDateString(),
                  })}
                </Text>
              </View>
              {featured.picture_url && (
                <Image
                  source={{ uri: featured.picture_url }}
                  style={styles.featuredImage}
                />
              )}
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>
          {t("home.availableMarathons")}
        </Text>

        {loading && (
          <ActivityIndicator size="large" color={Colors.purple[2]} />
        )}

        <View style={styles.marathonList}>
          {marathons.map((m) => (
            <MarathonCard
              key={m.id}
              title={m.title}
              description={m.description}
              picture_url={m.picture_url || ""}
              startDate={m.start_date}
              endDate={m.end_date}
              familyCount={m.family_count}
              onPress={() => onSelect(m)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// …styles stay exactly the same…

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
    color: Colors.white,
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
