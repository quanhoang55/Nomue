import "@/global.css";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatPage() {
  // ===========================================================
  // Main
  // ===========================================================
  return (
    <View className="page-view">
      <SafeAreaView style={{ flex: 1 }}>
        <View className="page-content">
          <Text className="text-7xl font-sans-spec36 color-foreground">
            Chat Page
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
