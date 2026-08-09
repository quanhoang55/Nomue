import { SplashScreen, Stack } from "expo-router";
import "@/global.css";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import { hide, hideAsync } from "expo-router/build/utils/splash";

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
      SplashScreen: hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // ===========================================================
  // Dev Mode
  // ===========================================================
  const devmode = __DEV__;

  // ===========================================================
  // Main
  // ===========================================================
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!devmode}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={devmode}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
