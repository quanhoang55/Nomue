import "@/global.css";
import { router } from "expo-router";
import { Text, View, Button } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  // ===========================================================
  // Main
  // ===========================================================
  return (
    <View className="page-view">
      <SafeAreaView style={{ flex: 1 }}>
        <View className="page-content">
          <Text className="text-7xl font-sans-spec36 color-foreground">
            Profile
          </Text>
          <Button
            title="Sign In"
            onPress={() => router.push("/(auth)/sign-in")}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
