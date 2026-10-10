import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// Shared visual kit for the auth screens (sign-in, sign-up, forgot password).
// Palette: deep navy/indigo base, silver "chrome" highlights, 9tel gold accent.

export const AUTH_COLORS = {
  bgTop: "#0D0A2A",
  bgMid: "#171342",
  bgBottom: "#2B2478",
  silverLight: "#F4F5FA",
  silver: "#C9CCDD",
  silverDark: "#8E92AD",
  gold: "#FCC200",
  goldDeep: "#E89B00",
  goldSoft: "#FFE27A",
  text: "#FFFFFF",
  muted: "#CFCBFF",
};

// Full-screen gradient with soft silver/indigo glows behind the content.
export const AuthBackground = ({ children }) => (
  <LinearGradient
    colors={[AUTH_COLORS.bgTop, AUTH_COLORS.bgMid, AUTH_COLORS.bgBottom]}
    start={{ x: 0.1, y: 0 }}
    end={{ x: 0.9, y: 1 }}
    style={{ flex: 1 }}
  >
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["rgba(201,204,221,0.22)", "rgba(201,204,221,0)"]}
        style={[styles.orb, { top: -110, right: -90, width: 300, height: 300 }]}
      />
      <LinearGradient
        colors={["rgba(252,194,0,0.16)", "rgba(252,194,0,0)"]}
        style={[styles.orb, { bottom: -120, left: -100, width: 320, height: 320 }]}
      />
    </View>
    {children}
  </LinearGradient>
);

// Brand mark: gold gradient tile with a silver rim, plus wordmark.
export const AuthLogo = ({ style }) => (
  <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
    <LinearGradient
      colors={[AUTH_COLORS.silverLight, AUTH_COLORS.silverDark, AUTH_COLORS.silverLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.logoRim}
    >
      <LinearGradient
        colors={[AUTH_COLORS.goldSoft, AUTH_COLORS.gold, AUTH_COLORS.goldDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logoTile}
      >
        <Text style={styles.logoText}>9</Text>
      </LinearGradient>
    </LinearGradient>
    <View style={{ marginLeft: 12 }}>
      <Text style={styles.wordmark}>9tel</Text>
      <Text style={styles.tagline}>SIMPLE. SECURE. CONNECTED.</Text>
    </View>
  </View>
);

// Frosted card with a brushed-silver gradient border.
export const AuthCard = ({ children, style }) => (
  <LinearGradient
    colors={["rgba(244,245,250,0.55)", "rgba(142,146,173,0.12)", "rgba(244,245,250,0.35)"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.cardBorder, style]}
  >
    <LinearGradient
      colors={["#2A2470", "#1D1858", "#241E66"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardInner}
    >
      {children}
    </LinearGradient>
  </LinearGradient>
);

// Primary call-to-action: gold gradient with a glossy top highlight.
export const AuthButton = ({ title, onPress, isLoading, disabled, style }) => {
  const isDisabled = isLoading || disabled;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!isLoading }}
      style={[styles.btnShadow, isDisabled && { opacity: 0.55 }, style]}
    >
      <LinearGradient
        colors={[AUTH_COLORS.goldSoft, AUTH_COLORS.gold, AUTH_COLORS.goldDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.btn}
      >
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]}
          style={styles.btnGloss}
        />
        <Text style={styles.btnText}>{title}</Text>
        {isLoading && <ActivityIndicator color="#211B59" size="small" style={{ marginLeft: 8 }} />}
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Silver-outlined secondary button (e.g. "Continue as Guest").
export const AuthGhostButton = ({ onPress, disabled, children, style }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
    style={[disabled && { opacity: 0.6 }, style]}
  >
    <LinearGradient
      colors={["rgba(244,245,250,0.55)", "rgba(142,146,173,0.25)", "rgba(244,245,250,0.45)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.ghostBorder}
    >
      <View style={styles.ghostInner}>{children}</View>
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  orb: { position: "absolute", borderRadius: 999 },
  logoRim: { width: 54, height: 54, borderRadius: 18, padding: 2 },
  logoTile: { flex: 1, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#211B59", fontSize: 26, fontFamily: "Poppins-Bold" },
  wordmark: { color: "#FFFFFF", fontSize: 24, fontFamily: "Poppins-Bold", letterSpacing: -0.5 },
  tagline: { color: "#CFCBFF", fontSize: 10, fontFamily: "Poppins-Regular", letterSpacing: 1.2 },
  cardBorder: { borderRadius: 28, padding: 1.2 },
  cardInner: { borderRadius: 27, padding: 20 },
  btnShadow: {
    marginTop: 18,
    borderRadius: 16,
    shadowColor: "#FCC200",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  btn: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  btnGloss: { position: "absolute", top: 0, left: 0, right: 0, height: "50%" },
  btnText: { color: "#211B59", fontSize: 17, fontFamily: "Poppins-SemiBold" },
  ghostBorder: { borderRadius: 16, padding: 1 },
  ghostInner: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: "#272166",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
