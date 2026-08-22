import { useAuth } from "@/providers/AuthProvider";
import type {
  ChatLocation,
  ChatRestaurantRecommendation,
} from "@/services/chat";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ChatMapRestaurant = Omit<
  ChatRestaurantRecommendation,
  "latitude" | "longitude"
> & {
  latitude: number;
  longitude: number;
};

export type ChatMapLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

type ChatMapContextValue = {
  restaurants: ChatMapRestaurant[];
  userLocation: ChatMapLocation | null;
  publishChatResults: (
    restaurants: ChatRestaurantRecommendation[],
    location: ChatLocation | null,
  ) => void;
  setUserLocation: (location: ChatMapLocation) => void;
  clearRestaurants: () => void;
};

const ChatMapContext = createContext<ChatMapContextValue | undefined>(
  undefined,
);

function restaurantKey(restaurant: ChatMapRestaurant) {
  if (restaurant.google_place_id) return `place:${restaurant.google_place_id}`;
  return [
    restaurant.name.trim().toLocaleLowerCase(),
    restaurant.latitude.toFixed(5),
    restaurant.longitude.toFixed(5),
  ].join(":");
}

function hasCoordinates(
  restaurant: ChatRestaurantRecommendation,
): restaurant is ChatMapRestaurant {
  return restaurant.latitude !== null && restaurant.longitude !== null;
}

function locationLabel(location: ChatLocation) {
  return location.local_area
    ? `${location.local_area.name}, ${location.province.name}`
    : location.province.name;
}

export function ChatMapProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<ChatMapRestaurant[]>([]);
  const [userLocation, setUserLocationState] =
    useState<ChatMapLocation | null>(null);

  useEffect(() => {
    setRestaurants([]);
    setUserLocationState(null);
  }, [user?.id]);

  const publishChatResults = useCallback(
    (
      nextRestaurants: ChatRestaurantRecommendation[],
      location: ChatLocation | null,
    ) => {
      const mappedRestaurants = nextRestaurants.filter(hasCoordinates);
      if (mappedRestaurants.length > 0) {
        setRestaurants((current) => {
          const merged = new Map(
            current.map((restaurant) => [restaurantKey(restaurant), restaurant]),
          );
          mappedRestaurants.forEach((restaurant) => {
            merged.set(restaurantKey(restaurant), restaurant);
          });
          return Array.from(merged.values());
        });
      }

      if (
        location &&
        location.latitude !== null &&
        location.longitude !== null
      ) {
        setUserLocationState({
          latitude: location.latitude,
          longitude: location.longitude,
          label: locationLabel(location),
        });
      }
    },
    [],
  );

  const setUserLocation = useCallback((location: ChatMapLocation) => {
    setUserLocationState(location);
  }, []);

  const clearRestaurants = useCallback(() => setRestaurants([]), []);

  const value = useMemo(
    () => ({
      restaurants,
      userLocation,
      publishChatResults,
      setUserLocation,
      clearRestaurants,
    }),
    [
      clearRestaurants,
      publishChatResults,
      restaurants,
      setUserLocation,
      userLocation,
    ],
  );

  return (
    <ChatMapContext.Provider value={value}>
      {children}
    </ChatMapContext.Provider>
  );
}

export function useChatMap() {
  const context = useContext(ChatMapContext);
  if (!context) {
    throw new Error("useChatMap must be used within ChatMapProvider");
  }
  return context;
}
