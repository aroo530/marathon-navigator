import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BorderRadius, Colors, Spacing } from "@/constants/Theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

type BreakdownItem = {
  activity: string;
  points: number;
};

type Family = {
  name: string;
  avatarUrl: string;
  breakdown: BreakdownItem[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  family: Family | null;
};

export default function FamilyBreakdownModal({
  visible,
  onClose,
  family,
}: Props) {
  if (!family) return null;
  const theme = useColorScheme() ?? "light";
  const { name, avatarUrl, breakdown } = family;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ThemedView style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons
              name="close"
              size={24}
              color={theme === "light" ? Colors.light.textSecondary : Colors.dark.textSecondary}
            />
          </TouchableOpacity>

          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <ThemedText type="title" style={styles.familyName}>{name}</ThemedText>

          <FlatList
            data={breakdown}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.breakdownItem}>
                <ThemedText type="default" style={styles.breakdownText}>
                  {item.activity}
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={styles.breakdownPoints}>
                  +{item.points}
                </ThemedText>
              </View>
            )}
            contentContainerStyle={styles.breakdownList}
          />
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    borderRadius: BorderRadius.large,
    width: "80%",
    padding: Spacing.lg,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: Spacing.md,
  },
  familyName: {
    marginBottom: Spacing.md,
  },
  breakdownList: {
    width: "100%",
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.cardBorder,
  },
  breakdownText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  breakdownPoints: {
    color: Colors.green[2],
  },
});
