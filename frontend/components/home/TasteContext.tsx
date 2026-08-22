import { COLORS } from "@/constants/colors";
import { StyleSheet, Text, View } from "react-native";

export type HomeTastePreferences = {
  spicy?: boolean;
  adventurous?: boolean;
  maxPrice?: number | null;
};

export function TasteContext({
  preferences = null,
}: {
  preferences?: HomeTastePreferences | null;
}) {
  const tags = preferences
    ? [
        preferences.spicy ? "Spicy" : null,
        preferences.adventurous ? "Adventurous" : null,
        preferences.maxPrice
          ? `Under ${Math.round(preferences.maxPrice / 1_000)}K`
          : null,
      ].filter((value): value is string => Boolean(value))
    : [];

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>
        {tags.length > 0 ? "YOUR TASTE" : "FIND YOUR NEXT FAVORITE"}
      </Text>
      {tags.length > 0 ? (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.message}>Explore the flavors around you</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.purple,
    borderColor: COLORS.foreground,
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 20,
    padding: 18,
  },
  eyebrow: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 12,
    letterSpacing: 1.3,
  },
  message: { color: COLORS.foreground, fontFamily: "spec-font", fontSize: 28 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagText: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 13,
  },
});
