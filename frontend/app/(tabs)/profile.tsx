import "@/global.css";
import { router } from "expo-router";
import { Text, View, Button } from "react-native";

export default function Profile() {
  // ===========================================================
  // Main
  // ===========================================================
  return (
    <View className="flex-1 items-center justify-center">
      <Text className="text-7xl font-sans-spec36 color-foreground">
        Profile
      </Text>
      <Button title="Sign In" onPress={() => router.push("/(auth)/sign-in")} />
    </View>
  );
}
