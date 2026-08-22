import { DishPoster } from "@/components/food/DishPoster";
import { COLORS } from "@/constants/colors";
import { useDishTypeName } from "@/hooks/useDishTypeImage";
import type { Dish } from "@/services/dish";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type CompactDishCardProps = {
  dish: Dish;
  province: string;
  label?: string;
};

export const CompactDishCard = memo(function CompactDishCard({
  dish,
  province,
  label,
}: CompactDishCardProps) {
  const dishTypeName = useDishTypeName(dish.dish_type_id);

  return (
    <Pressable
      accessibilityHint="Opens nearby places for this dish"
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/locations/[dishId]",
          params: { dishId: dish.id },
        })
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <DishPoster
        adventurousLevel={dish.adventurous_level}
        bitternessLevel={dish.bitterness_level}
        dishTypeId={dish.dish_type_id}
        name={dish.name}
        province={province}
        sournessLevel={dish.sourness_level}
        spiceLevel={dish.spice_level}
        sweetnessLevel={dish.sweetness_level}
      />
      <View style={styles.copy}>
        <Text numberOfLines={2} style={styles.name}>
          {dish.name}
        </Text>
        <Text numberOfLines={1} style={styles.label}>
          {label ?? `${province} essential`}
        </Text>
        <View style={styles.footer}>
          <Text numberOfLines={1} style={styles.dishType}>
            {dishTypeName ?? "Local dish"}
          </Text>
          <View style={styles.arrow}>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={COLORS.foreground}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.foreground,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    width: 220,
  },
  copy: { gap: 4, minHeight: 130, padding: 15 },
  name: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 25,
    lineHeight: 30,
    paddingTop: 10,
  },
  label: { color: "#665e58", fontFamily: "normal-font", fontSize: 14 },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 12,
  },
  dishType: {
    color: COLORS.foreground,
    flex: 1,
    fontFamily: "normal-bold",
    fontSize: 11,
    letterSpacing: 0.7,
    marginRight: 8,
    textTransform: "uppercase",
  },
  arrow: {
    alignItems: "center",
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
