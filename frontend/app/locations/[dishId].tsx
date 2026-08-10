import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ===========================================================
// Type
// ===========================================================

// ===========================================================
// Function
// ===========================================================

function goBack() {
  router.back();
}

// ===========================================================
// Main
// ===========================================================
export default function LocationPage() {
  const { dishId } = useLocalSearchParams();

  return (
    <SafeAreaView>
      <View>
        <Text>{dishId}</Text>
        <Pressable className="box-normal bg-white" onPress={goBack}>
          <Text>Go Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
