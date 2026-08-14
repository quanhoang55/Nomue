import "@/global.css";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "@/components/ui/GradientBackground";

export default function ChatPage() {
  // ===========================================================
  // State
  // ===========================================================

  // ===========================================================
  // Function
  // ===========================================================

  // ===========================================================
  // Main
  // ===========================================================
  return (
    <View className="page-view">
      <GradientBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View className="page-content">
          <Text className="text-7xl font-sans-spec36 color-foreground">
            chat page
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
