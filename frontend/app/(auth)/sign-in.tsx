import { Text, View, Button } from "react-native";
import { router } from "expo-router";

export default function SignIn() {
  // ===========================================================
  // Sign In Handler
  // ===========================================================
  async function handleSignIn() {
    try {
      if (!__DEV__) {
        await SignIn();
      }
      router.replace("/(tabs)");
    } catch (error) {
      console.error(error);
    }
  }

  // ===========================================================
  // Main
  // ===========================================================
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-5xl font-sans-spec36 color-foreground">
        Welcome Back To
      </Text>
      <Text className="text-8xl font-sans-spec36 color-foreground">NOMUE</Text>
      <Button title="Sign in" onPress={handleSignIn} />
      <Button title="Sign Up" onPress={() => router.push("/(auth)/sign-up")} />
    </View>
  );
}
