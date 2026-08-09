import { Text, View, Button } from "react-native";
import { router } from "expo-router";

export default function SignUp() {
  // ===========================================================
  // Sign Up Handler
  // ===========================================================
  async function handleSignUp() {
    try {
      if (!__DEV__) {
        await SignUp();
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
        Welcome To
      </Text>
      <Text className="text-8xl font-sans-spec36 color-foreground">NOMUE</Text>
      <Button title="Sign Up" onPress={handleSignUp} />
      <Text className="text-2xl font-sans-regular color-foreground">
        Already have Account
      </Text>
      <Button title="Sign In" onPress={() => router.back()} />
    </View>
  );
}
