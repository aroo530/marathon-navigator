export const Colors = {
  // Core palette
  yellow: ["#ffdd33", "#ffc00a", "#ffa602", "#d89e00"],
  orange: ["#fad09e", "#f5a23d", "#eb670f", "#e24104"],
  red: ["#ff99aa", "#ff3355", "#eb21b3c", "#c60929"],
  green: ["#b2df9c", "#66b739", "#26890c", "#106b03"],
  teal: ["#99e5e5", "#33cccc", "#0aa3a3", "#028282"],
  blue: ["#a2d1f2", "#45a3e5", "#1368ce", "#0542b9"],
  purple: ["#c2a5df", "#864cbf", "#46178f", "#25076b"],
  white: "#FFF",
  // Light theme
  light: {
    background: "#FFFFFF",
    textPrimary: "#212121",
    textSecondary: "#666666",
    cardBackground: "#FFFFFF",
    cardBorder: "#E0E0E0",
    cardShadow: "#000000",
  },

  // Dark theme
  dark: {
    background: "#121212",
    textPrimary: "#EEEEEE",
    textSecondary: "#CCCCCC",
    cardBackground: "#1E1E1E",
    cardBorder: "#333333",
    cardShadow: "#000000",
  },
};

export const Font = {
  heading: {
    fontFamily: "Poppins", // Use this for H1, H2
    fontWeight: "600",
  },
  body: {
    fontFamily: "Inter", // Or 'Roboto'
    fontWeight: "400",
  },
  sizes: {
    h1: 26,
    h2: 20,
    body: 16,
    caption: 14,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const BorderRadius = {
  small: 8,
  medium: 12,
  large: 16,
};
