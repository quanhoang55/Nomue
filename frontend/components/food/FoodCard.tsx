import { COLORS } from "@/constants/colors";
import {
  useDishTypeImage,
  useDishTypeName,
} from "@/hooks/useDishTypeImage";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

// ===========================================================
// Food Card Accent Colors
// ===========================================================
const FOOD_CARD_COLORS = Object.entries(COLORS)
  .filter(([name]) => name !== "background" && name !== "foreground")
  .map(([, color]) => color);

// ===========================================================
// Type
// ===========================================================
export type FoodCardType = {
  dishTypeId: string | null;
  id: string;
  name: string;
  image?: string | null;
  description: string | null;
};

// ===========================================================
// Function
// ===========================================================

function checkFood(id: string) {
  router.push({
    pathname: "/locations/[dishId]",
    params: {
      dishId: id,
    },
  });
}

// ===========================================================
// Function: Select a Stable Accent Color for Each Dish
// ===========================================================
function getFoodCardColor(id: string) {
  const hash = Array.from(id).reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );

  return FOOD_CARD_COLORS[hash % FOOD_CARD_COLORS.length];
}

// ===========================================================
// Main
// ===========================================================
export function FoodCard({ item }: { item: FoodCardType }) {
  const dishTypeImage = useDishTypeImage(item.dishTypeId);
  const dishTypeName = useDishTypeName(item.dishTypeId);

  return (
    <View
      className="w-full max-h-150 min-h-80 h-100 card-normal overflow-hidden"
      style={{ backgroundColor: getFoodCardColor(item.id) }}
    >
      {dishTypeImage ? (
        <Image
          accessible={false}
          resizeMode="contain"
          source={dishTypeImage}
          style={styles.sticker}
        />
      ) : item.image ? (
        <Image
          source={{ uri: item.image }}
          resizeMode="contain"
          style={styles.sticker}
        />
      ) : null}
      <View className="h-[20%]">
        <Text className="card-name">{item.name}</Text>
        <Text className="font-sans-bold text-xs uppercase tracking-wider text-foreground">
          {dishTypeName ?? "Local dish"}
        </Text>
      </View>
      <View className="h-[65%] pt-2">
        <Text className="card-des">{item.description}</Text>
      </View>

      <View className="h-[10%]">
        <Pressable
          className="box-normal items-center bg-white"
          onPress={() => checkFood(item.id)}
        >
          <Text className="text-small">Check The Food</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sticker: {
    height: 270,
    position: "absolute",
    right: -60,
    top: 180,
    transform: [{ rotate: "20deg" }],
    width: 270,
  },
});
