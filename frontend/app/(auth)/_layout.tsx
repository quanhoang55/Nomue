import { Stack } from "expo-router";
import "@/global.css";
import { useAuth } from "@/providers/AuthProvider";

export default function RootLayout() {
  const { isLogIn, isPasswordRecovery } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isLogIn || isPasswordRecovery}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="callback" />
      </Stack.Protected>
      <Stack.Protected guard={isLogIn && !isPasswordRecovery}>
        <Stack.Screen name="question" />
        <Stack.Screen name="subscription" />
      </Stack.Protected>
    </Stack>
  );
}
