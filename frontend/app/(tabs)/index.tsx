import "@/global.css";
import { FeaturedDishCard } from "@/components/home/FeaturedDishCard";
import { DishSection } from "@/components/home/DishSection";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeMapPreview } from "@/components/home/HomeMapPreview";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";
import { TasteContext } from "@/components/home/TasteContext";
import { type MapScreenProps } from "@/components/location/MapScreen";
import { COLORS } from "@/constants/colors";
import { useLocalDishes } from "@/hooks/useLocalDishes";
import { useLocationSelection } from "@/providers/LocationProvider";
import {
  resolveLocation,
  type LocationResolveRequest,
  type ResolvedLocation,
} from "@/services/location";
import { buildHomeSections } from "@/utils/homeRecommendations";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DEFAULT_LOCATION_TEXT = "Phú Thọ";
const DEFAULT_LOCATION_REQUEST: LocationResolveRequest = {
  text: DEFAULT_LOCATION_TEXT,
};
const DEFAULT_MAP_COORDINATES = { latitude: 21.3227, longitude: 105.4019 };
const HEADING_COLORS = [
  COLORS.green,
  COLORS.purple,
  COLORS.red,
  COLORS.yellow,
  COLORS.orange,
  COLORS.blue,
] as const;

type Coordinates = { latitude: number; longitude: number };

function locationLabel(location: ResolvedLocation | null) {
  if (!location) return "Choose where you’re exploring";
  return location.local_area
    ? `${location.local_area.name}, ${location.province.name}`
    : location.province.name;
}

export default function HomeScreen() {
  const { selectedLocation, selectLocation } = useLocationSelection();
  const initialRequest = useRef(
    selectedLocation?.request ?? DEFAULT_LOCATION_REQUEST,
  );
  const [resolvedLocation, setResolvedLocation] =
    useState<ResolvedLocation | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    DEFAULT_MAP_COORDINATES,
  );
  const [searchValue, setSearchValue] = useState(
    selectedLocation?.label ?? DEFAULT_LOCATION_TEXT,
  );
  const [editingLocation, setEditingLocation] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<LocationResolveRequest>(
    selectedLocation?.request ?? DEFAULT_LOCATION_REQUEST,
  );
  const [accentColor] = useState(
    () => HEADING_COLORS[Math.floor(Math.random() * HEADING_COLORS.length)],
  );

  const provinceId = resolvedLocation?.province.id ?? null;
  const {
    dishes,
    loading: dishesLoading,
    error: dishesError,
    refresh,
  } = useLocalDishes(provinceId);
  const sections = useMemo(() => buildHomeSections(dishes), [dishes]);

  const loadLocation = useCallback(
    async (request: LocationResolveRequest) => {
      setLastRequest(request);
      setResolvingLocation(true);
      setLocationError(null);

      try {
        const resolved = await resolveLocation(request);
        const label = locationLabel(resolved);
        const requestCoordinates =
          request.latitude !== undefined && request.longitude !== undefined
            ? { latitude: request.latitude, longitude: request.longitude }
            : null;
        const fallbackCoordinates =
          "text" in request && request.text === DEFAULT_LOCATION_TEXT
            ? DEFAULT_MAP_COORDINATES
            : null;

        setResolvedLocation(resolved);
        setCoordinates(
          requestCoordinates ?? resolved.local_area ?? fallbackCoordinates,
        );
        setSearchValue(label);
        setEditingLocation(false);
        selectLocation(request, label);
      } catch (requestError) {
        setLocationError(
          requestError instanceof Error
            ? requestError.message
            : "We couldn’t find that location.",
        );
      } finally {
        setResolvingLocation(false);
      }
    },
    [selectLocation],
  );

  useEffect(() => {
    const request = initialRequest.current;
    const timer = setTimeout(() => void loadLocation(request), 0);
    return () => clearTimeout(timer);
  }, [loadLocation]);

  const searchLocation = useCallback(() => {
    const text = searchValue.trim();
    if (!text) {
      setLocationError("Enter a city, district, or province.");
      return;
    }
    void loadLocation({ text });
  }, [loadLocation, searchValue]);

  const handleUseCurrentLocation = useCallback(async () => {
    setResolvingLocation(true);
    setLocationError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error("Location permission was denied.");
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await loadLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch (requestError) {
      setLocationError(
        requestError instanceof Error
          ? requestError.message
          : "We couldn’t read your current location.",
      );
      setResolvingLocation(false);
    }
  }, [loadLocation]);

  const mapInfo: MapScreenProps = useMemo(
    () => ({
      user_latitude: coordinates?.latitude ?? null,
      user_longitude: coordinates?.longitude ?? null,
      // Dish data does not contain restaurant coordinates. Pins appear only
      // after the existing restaurant flow returns grounded coordinates.
      dish_locations: [],
    }),
    [coordinates],
  );

  const initialLoading = resolvingLocation && !resolvedLocation;
  const contentLoading =
    Boolean(resolvedLocation) && dishesLoading && dishes.length === 0;
  const provinceName = resolvedLocation?.province.name ?? "Vietnam";
  const resolvedLabel = locationLabel(resolvedLocation);

  const header = (
    <HomeHeader
      accentColor={accentColor}
      disabled={resolvingLocation}
      editing={editingLocation}
      locationLabel={resolvedLabel}
      onCancel={() => {
        setEditingLocation(false);
        setSearchValue(resolvedLabel);
        setLocationError(null);
      }}
      onChangeLocation={() => setEditingLocation(true)}
      onChangeSearch={setSearchValue}
      onSearch={searchLocation}
      onUseGps={() => void handleUseCurrentLocation()}
      provinceName={provinceName}
      searchValue={searchValue}
    />
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            colors={[COLORS.red]}
            onRefresh={() => {
              if (resolvedLocation) refresh();
              else void loadLocation(lastRequest);
            }}
            refreshing={
              resolvingLocation || (dishesLoading && dishes.length > 0)
            }
            tintColor={COLORS.red}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {initialLoading || contentLoading ? (
          <HomeSkeleton />
        ) : (
          <>
            {header}

            {locationError ? (
              <View style={styles.inlineError}>
                <Ionicons
                  name="alert-circle-outline"
                  color={COLORS.foreground}
                  size={20}
                />
                <Text style={styles.inlineErrorText}>{locationError}</Text>
              </View>
            ) : null}

            {!resolvedLocation ? (
              <View style={styles.locationEmpty}>
                <View style={styles.emptyMark}>
                  <Ionicons
                    name="navigate-outline"
                    color={COLORS.foreground}
                    size={33}
                  />
                </View>
                <Text style={styles.emptyTitle}>Where are you exploring?</Text>
                <Text style={styles.emptyBody}>
                  Choose a place to unlock its local food guide.
                </Text>
                <Pressable
                  onPress={() => void handleUseCurrentLocation()}
                  style={styles.primaryAction}
                >
                  <Text style={styles.primaryActionText}>Use my location</Text>
                </Pressable>
                <Pressable
                  onPress={() => setEditingLocation(true)}
                  style={styles.secondaryAction}
                >
                  <Text style={styles.secondaryActionText}>Choose a place</Text>
                </Pressable>
              </View>
            ) : dishesError ? (
              <View style={styles.locationEmpty}>
                <Text style={styles.emptyTitle}>
                  The local guide missed a turn.
                </Text>
                <Text style={styles.emptyBody}>{dishesError}</Text>
                <Pressable onPress={refresh} style={styles.primaryAction}>
                  <Text style={styles.primaryActionText}>Try again</Text>
                </Pressable>
              </View>
            ) : dishes.length === 0 ? (
              <View style={styles.locationEmpty}>
                <Text style={styles.emptyTitle}>
                  We’re still mapping the flavors of this area.
                </Text>
                <Text style={styles.emptyBody}>
                  Try another nearby location.
                </Text>
                <Pressable
                  onPress={() => setEditingLocation(true)}
                  style={styles.primaryAction}
                >
                  <Text style={styles.primaryActionText}>
                    Choose another place
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.homeContent}>
                {sections.featured ? (
                  <FeaturedDishCard
                    dish={sections.featured}
                    province={provinceName}
                  />
                ) : null}

                <TasteContext preferences={null} />

                <DishSection
                  dishes={sections.localEssentials}
                  province={provinceName}
                  subtitle={`What ${provinceName} is known for`}
                  title="Local essentials"
                />

                <HomeMapPreview
                  featuredDishId={sections.featured?.id}
                  locationInfo={mapInfo}
                />

                <DishSection
                  cardLabel="Outside your comfort zone"
                  dishes={sections.adventurous}
                  province={provinceName}
                  subtitle="Try something outside your comfort zone"
                  title="Feeling adventurous?"
                  tone="adventurous"
                />

                <DishSection
                  cardLabel="Local value"
                  dishes={sections.budget}
                  province={provinceName}
                  subtitle="Local food that won’t break the budget"
                  title="Good food under 100K"
                  tone="budget"
                />

                <View style={styles.exploreMore}>
                  <Text style={styles.exploreEyebrow}>EXPLORE MORE</Text>
                  <Text style={styles.exploreTitle}>
                    Still hungry for ideas?
                  </Text>
                  <Text style={styles.exploreBody}>
                    Ask Nomue for a recommendation that fits your mood.
                  </Text>
                  <Pressable
                    onPress={() => router.push("/(tabs)/chat")}
                    style={({ pressed }) => [
                      styles.exploreButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.exploreButtonText}>Ask Nomue</Text>
                    <Ionicons
                      name="arrow-forward"
                      color={COLORS.foreground}
                      size={19}
                    />
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: COLORS.background, flex: 1 },
  scrollContent: { paddingBottom: 54 },
  homeContent: { gap: 42, paddingTop: 36 },
  inlineError: {
    alignItems: "center",
    backgroundColor: "#f9ddd9",
    borderColor: COLORS.foreground,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 12,
  },
  inlineErrorText: {
    color: COLORS.foreground,
    flex: 1,
    fontFamily: "normal-font",
    fontSize: 14,
    lineHeight: 19,
  },
  locationEmpty: {
    alignItems: "flex-start",
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.foreground,
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 20,
    marginTop: 34,
    padding: 24,
  },
  emptyMark: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  emptyTitle: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 37,
    lineHeight: 38,
    paddingTop: 10,
  },
  emptyBody: {
    color: "#5f5751",
    fontFamily: "normal-font",
    fontSize: 16,
    lineHeight: 22,
  },
  primaryAction: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: COLORS.foreground,
    borderRadius: 99,
    marginTop: 4,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryActionText: {
    color: COLORS.background,
    fontFamily: "normal-bold",
    fontSize: 16,
  },
  secondaryAction: {
    alignItems: "center",
    alignSelf: "stretch",
    minHeight: 40,
    justifyContent: "center",
  },
  secondaryActionText: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 15,
    textDecorationLine: "underline",
  },
  exploreMore: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.foreground,
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 20,
    overflow: "hidden",
    padding: 24,
  },
  exploreEyebrow: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 12,
    letterSpacing: 1.4,
  },
  exploreTitle: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 39,
    lineHeight: 40,
  },
  exploreBody: {
    color: "#2c3138",
    fontFamily: "normal-font",
    fontSize: 16,
    lineHeight: 22,
  },
  exploreButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: COLORS.background,
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  exploreButtonText: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 16,
  },
  pressed: { opacity: 0.74 },
});
