import "@/global.css";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FoodCard, type FoodCardType } from "@/components/food/FoodCard";
import { GradientBackground } from "@/components/ui/GradientBackground";
import { getDishes } from "@/services/dish";
import { useCallback, useEffect, useState } from "react";

// ====================================================================================
// Temporary Stage 1 Location
// ====================================================================================
const DEFAULT_PROVINCE_ID = "184649d0-2df2-4173-bd1e-9d61089fb841";

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

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
        value="Phú Thọ"
        editable={false}
      />
    </View>
  );
}

function ScrollCardView() {
  const [cards, setCards] = useState<FoodCardType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDishes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dishes = await getDishes(DEFAULT_PROVINCE_ID);
      setCards(
        dishes.map((dish) => ({
          id: dish.id,
          name: dish.name,
          price: vndFormatter.format(dish.typical_price),
          description: dish.description,
        })),
      );
    } catch (requestError) {
      setCards([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load dishes",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDishes();
  }, [loadDishes]);

  if (isLoading) {
    return (
      <View className="items-center py-10">
        <ActivityIndicator size="large" />
        <Text className="text-box mt-3">Loading local dishes…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="items-center py-10">
        <Text className="text-box text-center">{error}</Text>
        <Pressable
          className="button-normal bg-i-blue mt-4 px-5 py-3"
          onPress={() => void loadDishes()}
        >
          <Text>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (cards.length === 0) {
    return <Text className="text-box py-10">No dishes found for Phú Thọ.</Text>;
  }

  return (
    <FlatList
      data={cards}
      horizontal
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View className="w-72">
          <FoodCard item={item} />
        </View>
      )}
      ItemSeparatorComponent={() => <View className="w-4" />}
      showsHorizontalScrollIndicator={false}
    />
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
