import { DishPoster } from "@/components/food/DishPoster";
import { TasteMeter } from "@/components/food/TasteMeter";
import { COLORS } from "@/constants/colors";
import type { Dish } from "@/services/dish";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function FeaturedDishCard({
  dish,
  province,
}: {
  dish: Dish;
  province: string;
}) {
  const openDish = () =>
    router.push({
      pathname: "/locations/[dishId]",
      params: { dishId: dish.id },
    });

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text style={styles.eyebrow}>FEATURED DISH</Text>
        <Text style={styles.sectionNote}>fit your taste</Text>
      </View>
      <View style={styles.card}>
        <DishPoster
          adventurousLevel={dish.adventurous_level}
          bitternessLevel={dish.bitterness_level}
          dishTypeId={dish.dish_type_id}
          name={dish.name}
          province={province}
          sournessLevel={dish.sourness_level}
          spiceLevel={dish.spice_level}
          sweetnessLevel={dish.sweetness_level}
          variant="hero"
        />
        <View style={styles.details}>
          <Text style={styles.localLabel}>A {province} essential</Text>
          <Text numberOfLines={3} style={styles.description}>
            {dish.description ?? "A local favorite worth making room for."}
          </Text>
          <View style={styles.metrics}>
            <TasteMeter inverted label="Spicy" value={dish.spice_level} />
            <TasteMeter
              inverted
              label="Adventure"
              value={dish.adventurous_level}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={openDish}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaText}>Find this dish nearby</Text>
            <Ionicons
              name="arrow-forward"
              color={COLORS.foreground}
              size={19}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, paddingHorizontal: 20 },
  sectionHeading: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 13,
    letterSpacing: 1.4,
  },
  sectionNote: { color: "#716963", fontFamily: "normal-font", fontSize: 12 },
  card: {
    borderColor: COLORS.foreground,
    borderRadius: 29,
    borderWidth: 1,
    overflow: "hidden",
  },
  details: { backgroundColor: COLORS.foreground, gap: 12, padding: 20 },
  localLabel: {
    color: COLORS.yellow,
    fontFamily: "normal-bold",
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  description: {
    color: COLORS.background,
    fontFamily: "normal-font",
    fontSize: 17,
    lineHeight: 24,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  cta: {
    alignItems: "center",
    backgroundColor: COLORS.yellow,
    borderRadius: 99,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    minHeight: 54,
    paddingHorizontal: 18,
  },
  ctaText: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 16,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
