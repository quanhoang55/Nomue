import { CompactDishCard } from "@/components/food/CompactDishCard";
import { COLORS } from "@/constants/colors";
import type { Dish } from "@/services/dish";
import { LegendList } from "@legendapp/list/react-native";
import { StyleSheet, Text, View } from "react-native";

type DishSectionProps = {
  title: string;
  subtitle: string;
  dishes: Dish[];
  province: string;
  cardLabel?: string;
  tone?: "default" | "adventurous" | "budget";
};

export function DishSection({
  title,
  subtitle,
  dishes,
  province,
  cardLabel,
  tone = "default",
}: DishSectionProps) {
  if (dishes.length === 0) return null;

  return (
    <View
      style={[
        styles.section,
        tone === "adventurous" && styles.adventurous,
        tone === "budget" && styles.budget,
      ]}
    >
      <View style={styles.heading}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <LegendList
        contentContainerStyle={styles.listContent}
        data={dishes}
        horizontal
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyExtractor={(dish) => dish.id}
        renderItem={({ item }) => (
          <CompactDishCard dish={item} label={cardLabel} province={province} />
        )}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16, paddingVertical: 4 },
  adventurous: {
    backgroundColor: "#f6dfd7",
    borderBottomColor: COLORS.foreground,
    borderTopColor: COLORS.foreground,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    paddingVertical: 24,
  },
  budget: {
    backgroundColor: "#eef2d6",
    borderBottomColor: COLORS.foreground,
    borderTopColor: COLORS.foreground,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    paddingVertical: 24,
  },
  heading: { gap: 4, paddingHorizontal: 20 },
  title: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 34,
    lineHeight: 35,
  },
  subtitle: {
    color: "#665e58",
    fontFamily: "normal-font",
    fontSize: 16,
    lineHeight: 22,
  },
  listContent: { paddingHorizontal: 20 },
  separator: { width: 12 },
});
