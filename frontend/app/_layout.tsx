import "@/global.css";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { LocationProvider } from "@/providers/LocationProvider";
import { ChatMapProvider } from "@/providers/ChatMapProvider";
import { COLORS } from "@/constants/colors";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { continueWithoutAccount, error, retryProfileBootstrap, status } =
    useAuth();

  if (status === "initializing") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.foreground} size="large" />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>We couldn’t load your account</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable
          onPress={() => void retryProfileBootstrap()}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
        <Pressable
          onPress={continueWithoutAccount}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Continue browsing</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="locations/[dishId]" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  errorTitle: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 36,
    marginBottom: 10,
    textAlign: "center",
  },
  errorBody: {
    color: COLORS.foreground,
    fontFamily: "normal-font",
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 22,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    borderRadius: 999,
    marginBottom: 10,
    minWidth: 180,
    padding: 15,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontFamily: "normal-bold",
    fontSize: 17,
  },
  secondaryButton: { padding: 12 },
  secondaryButtonText: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});

export default function RootLayout() {
  // ===========================================================
  // Font
  // ===========================================================
  const [fontsLoaded] = useFonts({
    // "normal-font": require("../assets/fonts/josefin/JosefinSans-Regular.ttf"),
    // "normal-italic": require("../assets/fonts/josefin/JosefinSans-Italic.ttf"),
    // "normal-bold": require("../assets/fonts/josefin/JosefinSans-SemiBold.ttf"),
    // "normal-bold-italic": require("../assets/fonts/josefin/JosefinSans-SemiBoldItalic.ttf"),
    // "spec-font": require("../assets/fonts/bigshoulder/BigShoulders-Black.ttf"),
    // "spec-36": require("../assets/fonts/bigshoulder/BigShoulders_36pt-Black.ttf"),
    // "spec-60": require("../assets/fonts/bigshoulder/BigShoulders_60pt-Black.ttf"),
    "normal-font": require("../assets/fonts/lexend/Lexend-Regular.ttf"),
    "normal-bold": require("../assets/fonts/lexend/Lexend-Bold.ttf"),
    "normal-black": require("../assets/fonts/lexend/Lexend-Black.ttf"),
    "spec-font": require("../assets/fonts/sigmar/Sigmar-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // ===========================================================
  // Main
  // ===========================================================
  return (
    <AuthProvider>
      <LocationProvider>
        <ChatMapProvider>
          <RootNavigator />
        </ChatMapProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
