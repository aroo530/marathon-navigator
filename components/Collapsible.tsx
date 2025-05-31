import React, { PropsWithChildren, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors, Spacing, Font } from "@/constants/Theme";
import { IconSymbol } from "@/components/ui/IconSymbol";

export function Collapsible({
  children,
  title,
}: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useColorScheme() ?? "light";

  const iconColor =
    theme === "light" ? Colors.light.textSecondary : Colors.dark.textSecondary;
  const textColor =
    theme === "light" ? Colors.light.textPrimary : Colors.dark.textPrimary;

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}
      >
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={iconColor}
          style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
        />
        <ThemedText
          type="defaultSemiBold"
          style={[styles.title, { color: textColor }]}
        >
          {title}
        </ThemedText>
      </TouchableOpacity>

      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  title: {
    fontSize: Font.sizes.body,
    fontFamily: Font.heading.fontFamily,
  },
  content: {
    marginTop: Spacing.xs,
    marginLeft: 24,
  },
});
