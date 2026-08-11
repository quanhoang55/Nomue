import "@/global.css";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FoodCard, FoodCardType } from "@/components/food/FoodCard";
import { GradientBackground } from "@/components/ui/GradientBackground";

// ====================================================================================
// Card Data Test
// ====================================================================================
const card_1: FoodCardType = {
  id: "1",
  name: "Phở",
  image: "none",
  price: "50.000 VND",
  description: "Beaf Noddle",
};

// ====================================================================================
// Functions
// ====================================================================================

function chooseLocation() {
  console.log("searching...");
}

// ====================================================================================
// MAIN UI
// ====================================================================================
function Avatar() {
  return (
    <View className="content-normal flex-row items-center justify-between pl-2">
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-full box-normal bg-i-green"></View>
      </View>
    </View>
  );
}

function LocationSearch() {
  return (
    <View className="content-normal flex-row items-center justify-between">
      <TextInput
        className="box-normal bg-white h-10 w-[68%] max-w-[80%] min-w-[25%]"
        placeholder="Your Location?"
        placeholderTextColor="#10101033"
      >
        <Text className="text-box">Hanoi</Text>
      </TextInput>
      {/*<TouchableOpacity
        className="button-normal bg-i-blue h-15 w-[28%] max-w-[75%] min-w-[20%] justify-center items-center"
        onPress={chooseLocation}
      >
        <Text className="">Search</Text>
      </TouchableOpacity>*/}
    </View>
  );
}

function ScrollCardView() {
  return (
    <View>
      <FoodCard item={card_1} />
    </View>
  );
}

function MainBody() {
  return (
    <View>
      <View className="w-[80%]">
        <Text className="text-heading">Hungry?</Text>
        <Text className="text-heading">Let’s Fix That.</Text>
      </View>
    </View>
  );
}

export default function MainPage() {
  // ===========================================================
  // Main
  // ===========================================================
  return (
    <View className="page-view">
      <GradientBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View className="page-content">
          <View className="flex-row justify-between">
            <LocationSearch />
            <Avatar />
          </View>
          <View className="content-spec">
            <MainBody />
            <ScrollCardView />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
