import { router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

// ===========================================================
// Type
// ===========================================================
export type FoodCardType = {
  id: string;
  name: string;
  image?: string | null;
  price: string;
  description: string | null;
};

// ===========================================================
// Function
// ===========================================================

function findLocation(id: string) {
  router.push({
    pathname: "/locations/[dishId]",
    params: {
      dishId: id,
    },
  });
}

// ===========================================================
// Main
// ===========================================================
export function FoodCard({ item }: { item: FoodCardType }) {
  return (
    <View className="w-full max-h-110 min-h-80 h-85 card-normal bg-i-orange">
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          className="w-full h-40 card-normal bg-white"
        />
      ) : (
        <View className="w-full h-40 card-normal bg-white items-center justify-center">
          <Text className="text-box">Image coming soon</Text>
        </View>
      )}
      <Text className="card-name">{item.name}</Text>
      <Text className="card-price">{item.price}</Text>
      <Text className="card-des">{item.description}</Text>

      <Pressable
        className="box-normal items-center bg-white"
        onPress={() => findLocation(item.id)}
      >
        <Text>Location</Text>
      </Pressable>
    </View>
  );
}
