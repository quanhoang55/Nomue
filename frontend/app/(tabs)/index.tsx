import "@/global.css";
import { Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MainPage() {
  // ===========================================================
  // Main
  // ===========================================================
  return (
    <View className="page-view">
      <SafeAreaView style={{ flex: 1 }}>
        <View className="page-content">
          <View className="content-normal flex-row items-center justify-between">
            <Text className="text-normal">Hello, Quan</Text>
            <View className="flex-row items-center">
              <Text className="text-small pr-3">QuanHoang</Text>
              <View className="w-10 h-10 rounded-full bg-i-green"></View>
            </View>
          </View>
          <View className="">
            <TextInput
              className="box-normal h-15 w-[70%] max-w-[80%] min-w-[25%]"
              placeholder="Your Location?"
              placeholderTextColor="#10101033"
            >
              <Text className="text-box">Hanoi</Text>
            </TextInput>
          </View>
          <View></View>
        </View>
      </SafeAreaView>
    </View>
  );
}
