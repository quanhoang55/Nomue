import {
  MapScreen,
  type MapScreenProps,
} from "@/components/location/MapScreen";
import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

type HomeMapPreviewProps = {
  featuredDishId?: string;
  locationInfo: MapScreenProps;
};

export function HomeMapPreview({
  featuredDishId,
  locationInfo,
}: HomeMapPreviewProps) {
  const openMap = () => {
    if (!featuredDishId) return;
    router.push({
      pathname: "/locations/[dishId]",
      params: { dishId: featuredDishId },
    });
  };

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>EXPLORE AROUND YOU</Text>
        <Text style={styles.subtitle}>
          Start nearby, then follow your appetite
        </Text>
      </View>
      <Pressable
        accessibilityHint="Opens the full dish and restaurant map"
        accessibilityRole="button"
        disabled={!featuredDishId}
        onPress={openMap}
        style={({ pressed }) => [styles.preview, pressed && styles.pressed]}
      >
        <View pointerEvents="none" style={styles.map}>
          <MapScreen location_info={locationInfo} />
        </View>
        <View style={styles.mapBadge}>
          <Ionicons name="scan-outline" color={COLORS.foreground} size={17} />
          <Text style={styles.mapBadgeText}>Preview</Text>
        </View>
      </Pressable>
      {featuredDishId ? (
        <Pressable
          onPress={openMap}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkText}>Open full map</Text>
          <Ionicons name="arrow-forward" color={COLORS.foreground} size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14, paddingHorizontal: 20 },
  heading: { gap: 4 },
  title: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 34,
    lineHeight: 35,
  },
  subtitle: { color: "#665e58", fontFamily: "normal-font", fontSize: 16 },
  preview: { height: 205, position: "relative" },
  map: { flex: 1 },
  mapBadge: {
    alignItems: "center",
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    position: "absolute",
    right: 10,
    top: 10,
  },
  mapBadgeText: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 12,
  },
  link: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 7,
    paddingVertical: 5,
  },
  linkText: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 15,
    textDecorationLine: "underline",
  },
  pressed: { opacity: 0.74 },
});
