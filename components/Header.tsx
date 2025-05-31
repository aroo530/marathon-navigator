import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Font, Spacing, BorderRadius } from "@/constants/Theme";

type HeaderProps = {
  title: string;
};

export default function Header({ title }: HeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.purple[2], // 👈 vibrant header background
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: Font.sizes.h1,
    fontFamily: Font.heading.fontFamily,
    fontWeight: "700",
    color: Colors.white, // white text for contrast
  },
});
