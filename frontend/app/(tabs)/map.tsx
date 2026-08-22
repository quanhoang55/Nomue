import "@/global.css";

import {
  MapScreen,
  type DishLocation,
  type MapScreenProps,
} from "@/components/location/MapScreen";
import { COLORS } from "@/constants/colors";
import { useChatMap } from "@/providers/ChatMapProvider";
import { useLocationSelection } from "@/providers/LocationProvider";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FoodMapScreen() {
  const insets = useSafeAreaInsets();
  const { selectedLocation } = useLocationSelection();
  const { clearRestaurants, restaurants, setUserLocation, userLocation } =
    useChatMap();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationRequestActive = useRef(false);

  const selectedCoordinates = useMemo(() => {
    if (!selectedLocation) return null;
    const request = selectedLocation.request;
    if (request?.latitude === undefined || request.longitude === undefined) {
      return null;
    }
    return {
      latitude: request.latitude,
      longitude: request.longitude,
      label: selectedLocation.label,
    };
  }, [selectedLocation]);

  const mapOrigin = userLocation ?? selectedCoordinates;

  const updateDeviceLocation = useCallback(async () => {
    if (locationRequestActive.current) return;
    locationRequestActive.current = true;
    setLocating(true);
    setLocationError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error("Location permission is needed to show where you are.");
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        label: "Current location",
      });
    } catch (error) {
      setLocationError(
        error instanceof Error
          ? error.message
          : "Your current location is unavailable.",
      );
    } finally {
      locationRequestActive.current = false;
      setLocating(false);
    }
  }, [setUserLocation]);

  useEffect(() => {
    if (mapOrigin) return;
    const timer = setTimeout(() => void updateDeviceLocation(), 0);
    return () => clearTimeout(timer);
  }, [mapOrigin, updateDeviceLocation]);

  const markers = useMemo<DishLocation[]>(
    () =>
      restaurants.map((restaurant) => ({
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        name: restaurant.name,
        description: restaurant.address ?? restaurant.reason,
        rating: restaurant.rating,
        google_maps_uri: restaurant.google_maps_uri,
      })),
    [restaurants],
  );

  const mapInfo = useMemo<MapScreenProps>(
    () => ({
      user_latitude: mapOrigin?.latitude ?? null,
      user_longitude: mapOrigin?.longitude ?? null,
      dish_locations: markers,
    }),
    [mapOrigin, markers],
  );

  const mapTopInset = insets.top + 104;
  const mapBottomInset = insets.bottom + 132;

  return (
    <View style={styles.container}>
      <MapScreen
        contentInsets={{ top: mapTopInset, bottom: mapBottomInset }}
        location_info={mapInfo}
        variant="full"
      />

      <View style={[styles.header, { top: insets.top + 10 }]}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>YOUR FOOD MAP</Text>
          <Text numberOfLines={1} style={styles.title}>
            {restaurants.length > 0
              ? `${restaurants.length} place${restaurants.length === 1 ? "" : "s"} from Chat`
              : "Ready to explore"}
          </Text>
          <View style={styles.locationRow}>
            <View style={styles.locationDot} />
            <Text numberOfLines={1} style={styles.locationText}>
              {mapOrigin?.label ?? "Finding your location…"}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {restaurants.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear restaurant markers"
              hitSlop={8}
              onPress={clearRestaurants}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="trash-outline"
                color={COLORS.foreground}
                size={17}
              />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel="Use my current location"
            disabled={locating}
            onPress={() => void updateDeviceLocation()}
            style={({ pressed }) => [
              styles.locateButton,
              pressed && styles.pressed,
            ]}
          >
            {locating ? (
              <ActivityIndicator color={COLORS.foreground} size="small" />
            ) : (
              <Ionicons name="navigate" color={COLORS.foreground} size={19} />
            )}
          </Pressable>
        </View>
      </View>

      {locationError ? (
        <View style={[styles.errorBanner, { top: insets.top + 126 }]}>
          <Ionicons
            name="alert-circle-outline"
            color={COLORS.foreground}
            size={18}
          />
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      ) : null}

      {restaurants.length === 0 ? (
        <View style={[styles.emptyCard, { bottom: insets.bottom + 92 }]}>
          <Text style={styles.emptyEyebrow}>NO PINS YET</Text>
          <Text style={styles.emptyTitle}>Ask Nomue where to eat.</Text>
          <Text style={styles.emptyBody}>
            Restaurants from your Chat recommendations will appear here
            automatically.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/chat")}
            style={({ pressed }) => [
              styles.chatButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.chatButtonText}>Go to Chat</Text>
            <Ionicons
              name="arrow-forward"
              color={COLORS.foreground}
              size={19}
            />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.markerHint, { bottom: insets.bottom + 92 }]}>
          <Ionicons
            name="restaurant-outline"
            color={COLORS.foreground}
            size={18}
          />
          <Text style={styles.markerHintText}>
            Tap a purple pin for details
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#dce4da", flex: 1 },
  header: {
    alignItems: "center",
    backgroundColor: "rgba(255,252,249,0.94)",
    borderColor: COLORS.foreground,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    left: 14,
    minHeight: 98,
    padding: 15,
    position: "absolute",
    right: 14,
  },
  headerCopy: { flex: 1, gap: 2, minWidth: 0 },
  eyebrow: {
    color: "#6b625c",
    fontFamily: "normal-bold",
    fontSize: 10,
    letterSpacing: 1.3,
  },
  title: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 29,
    lineHeight: 31,
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  locationDot: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    height: 8,
    width: 8,
  },
  locationText: {
    color: "#5f5751",
    flex: 1,
    fontFamily: "normal-font",
    fontSize: 12,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginLeft: 10,
  },
  locateButton: {
    alignItems: "center",
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  clearButton: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  errorBanner: {
    alignItems: "center",
    backgroundColor: COLORS.red,
    borderColor: COLORS.foreground,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    left: 20,
    padding: 10,
    position: "absolute",
    right: 20,
  },
  errorText: {
    color: COLORS.foreground,
    flex: 1,
    fontFamily: "normal-bold",
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: "rgba(255,252,249,0.96)",
    borderColor: COLORS.foreground,
    borderRadius: 24,
    borderWidth: 1,
    gap: 7,
    left: 16,
    padding: 19,
    position: "absolute",
    right: 16,
  },
  emptyEyebrow: {
    color: "#8b443d",
    fontFamily: "normal-bold",
    fontSize: 10,
    letterSpacing: 1.3,
  },
  emptyTitle: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 33,
    lineHeight: 34,
  },
  emptyBody: {
    color: "#5f5751",
    fontFamily: "normal-font",
    fontSize: 14,
    lineHeight: 19,
  },
  chatButton: {
    alignItems: "center",
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  chatButtonText: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 15,
  },
  markerHint: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,252,249,0.94)",
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 11,
    position: "absolute",
  },
  markerHintText: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 13,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
