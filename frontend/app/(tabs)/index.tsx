import "@/global.css";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { LegendList } from "@legendapp/list/react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { FoodCard, type FoodCardType } from "@/components/food/FoodCard";
// import { GradientBackground } from "@/components/ui/GradientBackground";
import { getDishes } from "@/services/dish";
import {
  type LocationResolveRequest,
  resolveLocation,
} from "@/services/location";
import { useCallback, useEffect, useState } from "react";
import {
  MapScreen,
  type MapScreenProps,
} from "@/components/location/MapScreen";

// ====================================================================================
// Initial Stage 2 Location
// ====================================================================================
const DEFAULT_LOCATION_TEXT = "Phú Thọ";
const DEFAULT_LOCATION_REQUEST: LocationResolveRequest = {
  text: DEFAULT_LOCATION_TEXT,
};
const DEFAULT_MAP_COORDINATES = {
  latitude: 21.3227,
  longitude: 105.4019,
};

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

type LocationSearchProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
  onUseGps: () => void;
};

function LocationSearch({
  value,
  disabled,
  onChange,
  onSearch,
  onUseGps,
}: LocationSearchProps) {
  return (
    <View className="content-normal flex-1 flex-row items-center gap-2">
      <TextInput
        className="box-normal bg-white h-10 flex-1 px-3 max-w-100 min-w-50 w-20"
        placeholder="Vinh, Nghệ An"
        placeholderTextColor="#10101033"
        value={value}
        editable={!disabled}
        onChangeText={onChange}
        onSubmitEditing={onSearch}
        returnKeyType="search"
      />
      {/*<Pressable
        className="box-normal bg-i-blue px-3 py-2"
        disabled={disabled}
        onPress={onSearch}
      >
        <Text>Search</Text>
      </Pressable>*/}
      <Pressable
        className="box-normal bg-i-yellow px-3 py-2"
        disabled={disabled}
        onPress={onUseGps}
      >
        <Text>GPS</Text>
      </Pressable>
    </View>
  );
}

type DishListProps = {
  cards: FoodCardType[];
  isLoading: boolean;
  error: string | null;
  locationName: string;
  onRetry: () => void;
};

function DishList({
  cards,
  isLoading,
  error,
  locationName,
  onRetry,
}: DishListProps) {
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
          onPress={onRetry}
        >
          <Text>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <Text className="text-box py-10">
        No dishes found for {locationName}.
      </Text>
    );
  }

  return (
    <LegendList
      data={cards}
      horizontal
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View className="w-80">
          <FoodCard item={item} />
        </View>
      )}
      ItemSeparatorComponent={() => <View className="w-4" />}
      showsHorizontalScrollIndicator={false}
    />
  );
}

export default function MainPage() {
  const [locationText, setLocationText] = useState(DEFAULT_LOCATION_TEXT);
  const [locationName, setLocationName] = useState(DEFAULT_LOCATION_TEXT);
  const [lastRequest, setLastRequest] = useState<LocationResolveRequest>(
    DEFAULT_LOCATION_REQUEST,
  );
  const [cards, setCards] = useState<FoodCardType[]>([]);
  const [userCoordinates, setUserCoordinates] = useState(
    DEFAULT_MAP_COORDINATES,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===========================================================
  // Load Location
  // ===========================================================
  const loadLocation = useCallback(async (request: LocationResolveRequest) => {
    setLastRequest(request);
    setIsLoading(true);
    setError(null);
    try {
      const resolved = await resolveLocation(request);
      const dishes = await getDishes(resolved.province.id);
      const resolvedName = resolved.local_area
        ? `${resolved.local_area.name}, ${resolved.province.name}`
        : resolved.province.name;
      const requestCoordinates =
        request.latitude !== undefined && request.longitude !== undefined
          ? { latitude: request.latitude, longitude: request.longitude }
          : null;
      const resolvedCoordinates = requestCoordinates ?? resolved.local_area;

      setLocationName(resolvedName);
      setLocationText(resolvedName);
      if (resolvedCoordinates) {
        setUserCoordinates({
          latitude: resolvedCoordinates.latitude,
          longitude: resolvedCoordinates.longitude,
        });
      }
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
          : "Unable to resolve this location",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLocation(DEFAULT_LOCATION_REQUEST);
  }, [loadLocation]);

  // ===========================================================
  // Current Location: Text Input
  // ===========================================================
  const searchTextLocation = useCallback(() => {
    const text = locationText.trim();
    if (!text) {
      setError("Enter a city, district, or province");
      return;
    }
    void loadLocation({ text });
  }, [loadLocation, locationText]);

  // ===========================================================
  // Current Location: GPS
  // ===========================================================
  const handleCurrentLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error("Location permission was denied");
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await loadLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    } catch (locationError) {
      setCards([]);
      setError(
        locationError instanceof Error
          ? locationError.message
          : "Unable to read your current location",
      );
      setIsLoading(false);
    }
  }, [loadLocation]);

  // ===========================================================
  // Body
  // ===========================================================
  const locationInfo: MapScreenProps = {
    user_latitude: userCoordinates.latitude,
    user_longitude: userCoordinates.longitude,
    dish_locations: [
      // { latitude: 18.68, longitude: 105.69 },
      // { latitude: 18.67, longitude: 105.68 },
    ],
  };
  const MainBody = () => (
    <View className="content-outside content-spec h-300">
      <View className="w-[80%]">
        <Text className="text-heading">Hungry?</Text>
        <Text className="text-heading">Let’s Fix That.</Text>
      </View>
      <View className="content-outside w-full h-60">
        <MapScreen location_info={locationInfo} />
      </View>
      <View className="content-outside">
        <DishList
          cards={cards}
          isLoading={isLoading}
          error={error}
          locationName={locationName}
          onRetry={() => void loadLocation(lastRequest)}
        />
      </View>
    </View>
  );
  // ===========================================================
  // Main
  // ===========================================================
  return (
    <View className="page-view bg-background">
      {/*<GradientBackground />*/}
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View className="page-content">
          <View className="content-outside flex-row justify-between">
            <LocationSearch
              value={locationText}
              disabled={isLoading}
              onChange={setLocationText}
              onSearch={searchTextLocation}
              onUseGps={() => void handleCurrentLocation()}
            />
            <Avatar />
          </View>
          <LegendList ListHeaderComponent={MainBody} estimatedItemSize={50} />
        </View>
      </SafeAreaView>
    </View>
  );
}
