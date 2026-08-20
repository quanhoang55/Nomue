import { MapScreen } from "@/components/location/MapScreen";
import { COLORS } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useLocationSelection } from "@/providers/LocationProvider";
import { getDish, type Dish } from "@/services/dish";
import type { LocationResolveRequest } from "@/services/location";
import {
  discoverRestaurants,
  type DiscoveredRestaurant,
} from "@/services/restaurant";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ===========================================================
// Constants
// ===========================================================
const LEVELS = [1, 2, 3, 4, 5] as const;

const LEVEL_DETAILS = [
  { key: "spice_level", label: "Spice", color: COLORS.red },
  { key: "sweetness_level", label: "Sweetness", color: COLORS.yellow },
  { key: "sourness_level", label: "Sourness", color: COLORS.green },
  { key: "bitterness_level", label: "Bitterness", color: COLORS.purple },
  { key: "adventurous_level", label: "Adventurous", color: COLORS.orange },
] as const satisfies readonly {
  key: keyof Pick<
    Dish,
    | "spice_level"
    | "sweetness_level"
    | "sourness_level"
    | "bitterness_level"
    | "adventurous_level"
  >;
  label: string;
  color: string;
}[];

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

type DiscoveryState = "idle" | "loading" | "success" | "empty" | "error";

type DiscoveryLocation = {
  request: LocationResolveRequest;
  mapOrigin: { latitude: number; longitude: number } | null;
  source: "user_selected" | "device_gps";
};

// ===========================================================
// Component: Page Header
// ===========================================================
function DetailHeader() {
  return (
    <View className="flex-row items-center border-b border-foreground bg-background px-4 py-3">
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center rounded-full border border-foreground bg-white"
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.foreground} />
      </Pressable>
      <Text className="ml-3 font-sans-spec36 text-3xl text-foreground">
        Dish details
      </Text>
    </View>
  );
}

// ===========================================================
// Component: Flavor Level Bar
// ===========================================================
function LevelBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const normalizedValue = Math.min(5, Math.max(0, Math.round(value)));

  return (
    <View
      accessibilityLabel={`${label}: ${normalizedValue} out of 5`}
      className="mb-4"
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-sans-bold text-base text-foreground">
          {label}
        </Text>
        <Text className="font-sans-bold text-sm text-foreground opacity-60">
          {normalizedValue}/5
        </Text>
      </View>
      <View className="flex-row gap-2">
        {LEVELS.map((level) => (
          <View
            key={level}
            className="h-4 flex-1 rounded-full border border-foreground"
            style={{
              backgroundColor:
                level <= normalizedValue ? color : COLORS.background,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ===========================================================
// Component: Restaurant Discovery Results
// ===========================================================
function RestaurantResults({
  restaurants,
  mapOrigin,
}: {
  restaurants: DiscoveredRestaurant[];
  mapOrigin: DiscoveryLocation["mapOrigin"];
}) {
  const locationInfo = useMemo(
    () => ({
      user_latitude: mapOrigin?.latitude ?? null,
      user_longitude: mapOrigin?.longitude ?? null,
      dish_locations: restaurants.map((restaurant) => ({
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        name: restaurant.name,
        description: restaurant.address,
      })),
    }),
    [mapOrigin, restaurants],
  );

  return (
    <View className="gap-3">
      <View className="h-72 w-full">
        <MapScreen location_info={locationInfo} />
      </View>

      {restaurants.map((restaurant, index) => (
        <Pressable
          key={`${restaurant.google_place_id}-${index}`}
          accessibilityRole={restaurant.google_maps_uri ? "link" : undefined}
          className="rounded-2xl border border-foreground bg-white p-4"
          disabled={!restaurant.google_maps_uri}
          onPress={() => {
            if (restaurant.google_maps_uri) {
              void Linking.openURL(restaurant.google_maps_uri);
            }
          }}
        >
          <View className="flex-row items-start justify-between gap-3">
            <Text className="min-w-0 flex-1 font-sans-bold text-lg text-foreground">
              {restaurant.name}
            </Text>
            {restaurant.rating !== null && (
              <Text className="font-sans-bold text-sm text-foreground">
                ★ {restaurant.rating.toFixed(1)}
              </Text>
            )}
          </View>
          {restaurant.address && (
            <Text className="mt-1 font-sans-regular text-sm leading-5 text-foreground opacity-65">
              {restaurant.address}
            </Text>
          )}
          {restaurant.reason && (
            <Text className="mt-2 font-sans-regular text-sm leading-5 text-foreground">
              {restaurant.reason}
            </Text>
          )}
          {restaurant.google_maps_uri && (
            <View className="mt-3 flex-row items-center">
              <Ionicons
                name="navigate-outline"
                size={16}
                color={COLORS.foreground}
              />
              <Text className="ml-1 font-sans-bold text-sm text-foreground underline">
                Open in Google Maps
              </Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

// ===========================================================
// Main
// ===========================================================
export default function LocationPage() {
  const params = useLocalSearchParams<{ dishId?: string | string[] }>();
  const dishId = Array.isArray(params.dishId)
    ? params.dishId[0]
    : params.dishId;
  const { selectedLocation } = useLocationSelection();
  const { isLogIn } = useAuth();

  const [dish, setDish] = useState<Dish | null>(null);
  const [isDishLoading, setIsDishLoading] = useState(true);
  const [dishError, setDishError] = useState<string | null>(null);
  const [dishRequestKey, setDishRequestKey] = useState(0);
  const [restaurants, setRestaurants] = useState<DiscoveredRestaurant[]>([]);
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState>("idle");
  const [discoveryOrigin, setDiscoveryOrigin] =
    useState<DiscoveryLocation["mapOrigin"]>(null);

  // =========================================================
  // Effect: Load Dish Details When the Route Opens
  // =========================================================
  useEffect(() => {
    let isActive = true;

    if (!dishId) {
      return () => {
        isActive = false;
      };
    }

    const loadDish = async () => {
      await Promise.resolve();
      if (!isActive) {
        return;
      }

      setIsDishLoading(true);
      setDishError(null);

      try {
        const response = await getDish(dishId);
        if (isActive) {
          setDish(response);
        }
      } catch (error: unknown) {
        if (isActive) {
          setDish(null);
          setDishError(
            error instanceof Error
              ? error.message
              : "Unable to load this dish right now.",
          );
        }
      } finally {
        if (isActive) {
          setIsDishLoading(false);
        }
      }
    };

    void loadDish();

    return () => {
      isActive = false;
    };
  }, [dishId, dishRequestKey]);

  // =========================================================
  // Function: Prefer Explicit App Location, Then Device GPS
  // =========================================================
  const prepareDiscoveryLocation = useCallback(async () => {
    if (selectedLocation) {
      const request = selectedLocation.request;
      const hasCoordinates =
        request.latitude !== undefined && request.longitude !== undefined;
      return {
        request,
        mapOrigin: hasCoordinates
          ? {
              latitude: request.latitude,
              longitude: request.longitude,
            }
          : null,
        source: "user_selected",
      } satisfies DiscoveryLocation;
    }

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      throw new Error("Location permission is required to search nearby.");
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const request: LocationResolveRequest = {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    };

    return {
      request,
      mapOrigin: request,
      source: "device_gps",
    } satisfies DiscoveryLocation;
  }, [selectedLocation]);

  // =========================================================
  // Function: Find Restaurants for the Current Dish
  // =========================================================
  const findRestaurants = useCallback(async () => {
    if (!dishId || discoveryState === "loading") {
      return;
    }
    if (!isLogIn) {
      router.push("/(auth)/sign-in");
      return;
    }

    setDiscoveryState("loading");
    setRestaurants([]);
    setDiscoveryOrigin(null);

    try {
      const location = await prepareDiscoveryLocation();

      const request = { dish_id: dishId, location: location.request };

      if (__DEV__) {
        console.log("RESTAURANT DISCOVERY REQUEST:", {
          request,
          locationSource: location.source,
        });
      }

      const response = await discoverRestaurants(request);

      if (__DEV__) {
        console.log("RESTAURANT DISCOVERY RESPONSE:", {
          restaurantCount: response.length,
        });
      }

      setRestaurants(response);
      setDiscoveryOrigin(location.mapOrigin);
      setDiscoveryState(response.length > 0 ? "success" : "empty");
    } catch (error) {
      if (__DEV__) {
        console.log("RESTAURANT DISCOVERY ERROR:", error);
      }
      setDiscoveryState("error");
    }
  }, [dishId, discoveryState, isLogIn, prepareDiscoveryLocation]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <DetailHeader />

      {dishId && isDishLoading ? (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <ActivityIndicator color={COLORS.foreground} size="large" />
          <Text className="font-sans-regular text-base text-foreground">
            Loading dish…
          </Text>
        </View>
      ) : dishError || !dish ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full rounded-3xl border border-foreground bg-i-yellow p-5">
            <Text className="text-center font-sans-bold text-lg text-foreground">
              {dishError ??
                (dishId
                  ? "Unable to load this dish."
                  : "This dish link is invalid.")}
            </Text>
            {dishId && (
              <Pressable
                accessibilityRole="button"
                className="mt-4 items-center rounded-full border border-foreground bg-white px-5 py-3"
                onPress={() => setDishRequestKey((current) => current + 1)}
              >
                <Text className="font-sans-bold text-base text-foreground">
                  Try again
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 22 }}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Pressable
              accessibilityRole="button"
              className="flex-row items-center justify-center rounded-full border border-foreground bg-i-green px-5 py-4"
              disabled={discoveryState === "loading"}
              onPress={() => void findRestaurants()}
              style={{ opacity: discoveryState === "loading" ? 0.65 : 1 }}
            >
              {discoveryState === "loading" ? (
                <ActivityIndicator color={COLORS.foreground} size="small" />
              ) : (
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={COLORS.foreground}
                />
              )}
              <Text className="ml-2 font-sans-bold text-lg text-foreground">
                {discoveryState === "loading"
                  ? "Finding restaurants…"
                  : "Find Location"}
              </Text>
            </Pressable>

            {(discoveryState === "empty" || discoveryState === "error") && (
              <View className="mt-3 rounded-2xl border border-foreground bg-i-yellow p-4">
                <Text className="text-center font-sans-bold text-base text-foreground">
                  Can&apos;t search any nearby restaurants right now.
                </Text>
              </View>
            )}

            {discoveryState === "success" && restaurants.length > 0 && (
              <View className="mt-4">
                <RestaurantResults
                  mapOrigin={discoveryOrigin}
                  restaurants={restaurants}
                />
              </View>
            )}
          </View>

          <View>
            <Text className="font-sans-spec36 text-5xl leading-tight text-foreground">
              {dish.name}
            </Text>
          </View>

          <View className="rounded-3xl border border-foreground bg-white p-5">
            <Text className="mb-2 font-sans-bold text-sm uppercase tracking-widest text-foreground opacity-50">
              Description
            </Text>
            <Text className="font-sans-regular text-lg leading-7 text-foreground">
              {dish.description || "No description is available for this dish."}
            </Text>
          </View>

          <View className="rounded-3xl border border-foreground bg-white p-5">
            <Text className="mb-5 font-sans-spec36 text-3xl text-foreground">
              Flavor profile
            </Text>
            {LEVEL_DETAILS.map((level) => (
              <LevelBar
                key={level.key}
                color={level.color}
                label={level.label}
                value={dish[level.key]}
              />
            ))}
          </View>

          <View className="rounded-3xl border border-foreground bg-i-blue p-5">
            <Text className="font-sans-bold text-sm uppercase tracking-widest text-foreground opacity-60">
              Typical price
            </Text>
            <Text className="mt-2 font-sans-spec36 text-4xl text-foreground">
              {vndFormatter.format(dish.typical_price)}
            </Text>
          </View>

          <View className="h-72 items-center justify-center rounded-3xl border border-foreground bg-white p-5">
            <View className="mb-3 h-16 w-16 items-center justify-center rounded-full border border-foreground bg-i-purple">
              <Ionicons
                name="image-outline"
                size={30}
                color={COLORS.foreground}
              />
            </View>
            <Text className="font-sans-bold text-lg text-foreground">
              Image coming soon
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
