import "@/global.css";
import { Text, View } from "react-native";

export default function MainPage() {
  return (
    <View className="flex-1 items-center justify-center --color-background">
      <Text className="text-xl font-bold --color-foreground">
        Main Page
      </Text>
    </View>
  );
}
