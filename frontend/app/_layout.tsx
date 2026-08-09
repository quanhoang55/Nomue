import "@/global.css";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  // ===========================================================
  // Sign In / Sign Up
  // ===========================================================
  const { isLogIn } = useAuth();

  // ===========================================================
  // Develop Mode
  // ===========================================================
  if (__DEV__) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    );
  }
  // ===========================================================
  // Main
  // ===========================================================
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isLogIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isLogIn}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // ===========================================================
  // Font
  // ===========================================================
  const [fontsLoaded] = useFonts({
    "normal-font": require("../assets/fonts/josefin/JosefinSans-Regular.ttf"),
    "normal-italic": require("../assets/fonts/josefin/JosefinSans-Italic.ttf"),
    "normal-bold": require("../assets/fonts/josefin/JosefinSans-SemiBold.ttf"),
    "normal-bold-italic": require("../assets/fonts/josefin/JosefinSans-SemiBoldItalic.ttf"),
    "spec-font": require("../assets/fonts/bigshoulder/BigShoulders-Black.ttf"),
    "spec-36": require("../assets/fonts/bigshoulder/BigShoulders_36pt-Black.ttf"),
    "spec-60": require("../assets/fonts/bigshoulder/BigShoulders_60pt-Black.ttf"),
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
      <RootNavigator />
    </AuthProvider>
  );
}
