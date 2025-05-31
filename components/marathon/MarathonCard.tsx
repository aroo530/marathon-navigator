import { BorderRadius, Colors, Font, Spacing } from "@/constants/Theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type MarathonCardProps = {
  title: string;
  description: string;
  picture_url: string;
  startDate: string;
  endDate: string;
  familyCount: number;
  onPress?: () => void;
};

export default function MarathonCard({
  title,
  description,
  picture_url,
  startDate,
  endDate,
  familyCount,
  onPress,
}: MarathonCardProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.card}>
        {picture_url && (
          <Image source={{ uri: picture_url }} style={styles.image} />
        )}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{title}</Text>
          {/* <Text style={styles.description}>{description}</Text> */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={Colors.light.textPrimary}
              />
              <Text style={styles.metaText}>
                {startDate} - {endDate}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons
                name="people-outline"
                size={14}
                color={Colors.light.textPrimary}
              />
              <Text style={styles.metaText}>{familyCount} families</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: Colors.light.cardBackground,
    borderRadius: BorderRadius.medium,
    elevation: 2,
    shadowColor: Colors.light.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    alignItems: "center",
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 1000,
    marginRight: Spacing.sm,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: Font.sizes.body,
    fontWeight: "600",
    color: Colors.light.textPrimary,
  },
  description: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textPrimary,
  },
  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    marginRight: Spacing.md,
  },
  metaText: {
    fontSize: Font.sizes.caption,
    color: Colors.light.textPrimary,
    marginLeft: 4,
  },
});
