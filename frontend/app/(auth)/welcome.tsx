import {
  AuthButton,
  AuthLink,
  AuthScreen,
  authStyles,
} from "@/components/auth/AuthScreen";
import { router } from "expo-router";
import { Text, View } from "react-native";

export default function WelcomeScreen() {
  return (
    <AuthScreen
      title="Eat like a local"
      subtitle="Discover regional dishes across Vietnam and find the places worth visiting."
    >
      <View style={authStyles.actions}>
        <AuthButton
          label="Continue"
          onPress={() => router.push("/(auth)/sign-up")}
        />
      </View>
      <View style={authStyles.centeredRow}>
        <Text style={authStyles.helper}>Already have an account?</Text>
        <AuthLink
          label="Sign in"
          onPress={() => router.push("/(auth)/sign-in")}
        />
      </View>
    </AuthScreen>
  );
}
