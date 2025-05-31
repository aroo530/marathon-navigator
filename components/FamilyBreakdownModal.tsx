import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { Colors, Spacing, Font } from "@/constants/Theme";
import { Ionicons } from "@expo/vector-icons";

export default function FamilyBreakdownModal({
  visible,
  onClose,
  family,
}) {
  if (!family) return null;

  const { name, avatarUrl, breakdown } = family;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={Colors.dark.textPrimary} />
          </TouchableOpacity>

          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <Text style={styles.familyName}>{name}</Text>

          <FlatList
            data={breakdown}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownText}>{item.activity}</Text>
                <Text style={styles.breakdownPoints}>+{item.points}</Text>
              </View>
            )}
            contentContainerStyle={styles.breakdownList}
          />
        </View>
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
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    width: "80%",
    padding: Spacing.lg,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: Spacing.md,
  },
  familyName: {
    fontSize: Font.sizes.h2,
    fontWeight: "700",
    color: Colors.purple[2],
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
    fontSize: Font.sizes.body,
    color: Colors.dark.textPrimary,
  },
  breakdownPoints: {
    fontSize: Font.sizes.body,
    fontWeight: "700",
    color: Colors.green[2],
  },
});
