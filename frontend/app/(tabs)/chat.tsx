import "@/global.css";

import { FoodCard, type FoodCardType } from "@/components/food/FoodCard";
import {
  MapScreen,
  type MapScreenProps,
} from "@/components/location/MapScreen";
import { COLORS } from "@/constants/colors";
import { useLocationSelection } from "@/providers/LocationProvider";
import {
  createChatResponse,
  type ChatLocationRequest,
  type ChatLocationSource,
  type ChatRequest,
  type ChatResponse,
  type ChatRestaurantRecommendation,
} from "@/services/chat";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  type ColorValue,
  FlatList,
  Keyboard,
  Linking,
  Platform,
  PlatformColor,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ==========================================================================
// Types: Local Conversation UI
// ==========================================================================
type ChatAuthor = "assistant" | "user";

type TextChatItem = {
  id: string;
  type: "text";
  author: ChatAuthor;
  text: string;
  time: string;
};

type RecommendationChatItem = {
  id: string;
  type: "recommendation";
  summary: string;
  paragraph: string;
  foods: FoodCardType[];
  restaurants: ChatRestaurantRecommendation[];
  location: MapScreenProps | null;
  time: string;
};

type ChatItem = TextChatItem | RecommendationChatItem;

type ChatComposerProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
};

type PreparedChatLocation = {
  location?: ChatLocationRequest;
  source: ChatLocationSource | "none";
};

const IOS_COMPOSER_BACKGROUND: ColorValue =
  Platform.OS === "ios" ? PlatformColor("systemBackground") : COLORS.background;

const IOS_COMPOSER_BORDER: ColorValue =
  Platform.OS === "ios" ? PlatformColor("separator") : COLORS.foreground;

const IOS_INPUT_BACKGROUND: ColorValue =
  Platform.OS === "ios"
    ? PlatformColor("secondarySystemBackground")
    : "#ffffff";

const IOS_INPUT_PLACEHOLDER: ColorValue =
  Platform.OS === "ios"
    ? PlatformColor("placeholderText")
    : `${COLORS.foreground}66`;

const IOS_SEND_BACKGROUND: ColorValue =
  Platform.OS === "ios" ? PlatformColor("systemBlue") : COLORS.red;

// ==========================================================================
// Constants
// ==========================================================================
const INITIAL_CONVERSATION: ChatItem[] = [
  {
    id: "welcome-message",
    type: "text",
    author: "assistant",
    text: "Xin chào! Tell me where you are and what you feel like eating. I’ll help you discover a Vietnamese dish.",
    time: "Now",
  },
];

const QUICK_PROMPTS = [
  "What should I eat in Hà Nội?",
  "Find something spicy nearby",
  "Recommend a local breakfast",
];

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

// ==========================================================================
// Function: Convert an API Response to a Conversation Item
// ==========================================================================
function createRecommendationItem(
  id: number,
  response: ChatResponse,
): RecommendationChatItem {
  const latitude = response.location?.latitude;
  const longitude = response.location?.longitude;
  const restaurantLocations = response.recommended_restaurants.flatMap(
    (restaurant) =>
      restaurant.latitude !== null && restaurant.longitude !== null
        ? [
            {
              latitude: restaurant.latitude,
              longitude: restaurant.longitude,
            },
          ]
        : [],
  );
  const location =
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    restaurantLocations.length > 0
      ? {
          user_latitude: latitude,
          user_longitude: longitude,
          dish_locations: restaurantLocations,
        }
      : null;

  return {
    id: `recommendation-${id}`,
    type: "recommendation",
    summary: response.summary,
    paragraph: response.paragraph,
    foods: response.recommended_dishes.map(({ dish, reason }) => ({
      id: dish.id,
      name: dish.name,
      price: vndFormatter.format(dish.typical_price),
      description: dish.description
        ? `${dish.description}\n\nWhy this fits: ${reason}`
        : reason,
    })),
    restaurants: response.recommended_restaurants,
    location,
    time: "Now",
  };
}

// ==========================================================================
// Component: Chat Header
// ==========================================================================
function ChatHeader() {
  return (
    <View className="flex-row items-center border-b border-foreground bg-background px-4 py-3">
      <View className="h-12 w-12 items-center justify-center rounded-full border border-foreground bg-i-green">
        <Ionicons name="sparkles" size={22} color={COLORS.foreground} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-sans-spec36 text-3xl text-foreground">
          Nomue Guide
        </Text>
        <View className="mt-1 flex-row items-center">
          <View className="mr-2 h-2 w-2 rounded-full bg-i-green" />
          <Text className="font-sans-regular text-sm text-foreground">
            Live recommendations
          </Text>
        </View>
      </View>
      <View className="rounded-full border border-foreground bg-i-yellow px-3 py-1">
        <Text className="font-sans-bold text-xs text-foreground">AI</Text>
      </View>
    </View>
  );
}

// ==========================================================================
// Component: Assistant Avatar
// ==========================================================================
function AssistantAvatar() {
  return (
    <View className="mr-2 mt-1 h-8 w-8 items-center justify-center rounded-full border border-foreground bg-i-green">
      <Ionicons name="sparkles" size={15} color={COLORS.foreground} />
    </View>
  );
}

// ==========================================================================
// Component: Text Message Bubble
// ==========================================================================
function TextMessage({ item }: { item: TextChatItem }) {
  const isUser = item.author === "user";

  return (
    <View
      className={`mb-4 flex-row ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && <AssistantAvatar />}
      <View className={`max-w-[82%] ${isUser ? "items-end" : "items-start"}`}>
        <View
          className={`rounded-3xl border border-foreground px-4 py-3 ${
            isUser ? "rounded-br-md bg-i-blue" : "rounded-bl-md bg-i-yellow"
          }`}
        >
          <Text className="font-sans-regular text-base leading-6 text-foreground">
            {item.text}
          </Text>
        </View>
        <Text className="mt-1 px-1 font-sans-regular text-xs text-foreground opacity-50">
          {item.time}
        </Text>
      </View>
    </View>
  );
}

// ==========================================================================
// Component: Recommended Food Cards
// ==========================================================================
function RecommendedFoods({ foods }: { foods: FoodCardType[] }) {
  return (
    <View className="mt-4">
      <View className="mb-2 flex-row items-center">
        <Ionicons name="restaurant" size={17} color={COLORS.foreground} />
        <Text className="ml-2 font-sans-bold text-base text-foreground">
          Recommended dishes
        </Text>
      </View>
      <ScrollView
        horizontal
        contentContainerStyle={{ gap: 12 }}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
      >
        {foods.map((food) => (
          <View key={food.id} className="h-100 w-72">
            <FoodCard item={food} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ==========================================================================
// Component: Recommendation Map
// ==========================================================================
function RecommendationMap({ location }: { location: MapScreenProps }) {
  return (
    <View className="mt-4">
      <View className="mb-2 flex-row items-center">
        <Ionicons name="map" size={17} color={COLORS.foreground} />
        <Text className="ml-2 font-sans-bold text-base text-foreground">
          Nearby places
        </Text>
      </View>
      <View className="h-60 w-full">
        <MapScreen location_info={location} />
      </View>
    </View>
  );
}

// ==========================================================================
// Component: Recommended Restaurants
// ==========================================================================
function RecommendedRestaurants({
  restaurants,
}: {
  restaurants: ChatRestaurantRecommendation[];
}) {
  if (restaurants.length === 0) {
    return null;
  }

  return (
    <View className="mt-4">
      <View className="mb-2 flex-row items-center">
        <Ionicons name="storefront" size={17} color={COLORS.foreground} />
        <Text className="ml-2 font-sans-bold text-base text-foreground">
          Recommended restaurants
        </Text>
      </View>
      {restaurants.map((restaurant, index) => (
        <Pressable
          key={restaurant.google_place_id ?? `${restaurant.name}-${index}`}
          accessibilityRole={restaurant.google_maps_uri ? "link" : undefined}
          className="mb-2 rounded-2xl border border-foreground bg-white p-3"
          disabled={!restaurant.google_maps_uri}
          onPress={() => {
            if (restaurant.google_maps_uri) {
              void Linking.openURL(restaurant.google_maps_uri);
            }
          }}
        >
          <View className="flex-row items-start justify-between gap-3">
            <Text className="min-w-0 flex-1 font-sans-bold text-base text-foreground">
              {restaurant.name}
            </Text>
            {restaurant.rating !== null && (
              <Text className="font-sans-bold text-sm text-foreground">
                ★ {restaurant.rating.toFixed(1)}
              </Text>
            )}
          </View>
          {restaurant.address && (
            <Text className="mt-1 font-sans-regular text-sm text-foreground opacity-70">
              {restaurant.address}
            </Text>
          )}
          {restaurant.reason && (
            <Text className="mt-2 font-sans-regular text-sm leading-5 text-foreground">
              {restaurant.reason}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

// ==========================================================================
// Component: Structured Assistant Recommendation
// ==========================================================================
function RecommendationMessage({ item }: { item: RecommendationChatItem }) {
  return (
    <View className="mb-6 flex-row items-start">
      <AssistantAvatar />
      <View className="min-w-0 flex-1">
        <View className="rounded-3xl rounded-bl-md border border-foreground bg-i-yellow p-4">
          <Text className="font-sans-bold text-xl leading-6 text-foreground">
            {item.summary}
          </Text>
          <Text className="mt-2 font-sans-regular text-base leading-6 text-foreground">
            {item.paragraph}
          </Text>
        </View>
        {item.foods.length > 0 && <RecommendedFoods foods={item.foods} />}
        <RecommendedRestaurants restaurants={item.restaurants} />
        {item.location && <RecommendationMap location={item.location} />}
        <Text className="mt-2 px-1 font-sans-regular text-xs text-foreground opacity-50">
          {item.time}
        </Text>
      </View>
    </View>
  );
}

// ==========================================================================
// Component: Conversation Item
// ==========================================================================
function ConversationItem({ item }: { item: ChatItem }) {
  if (item.type === "recommendation") {
    return <RecommendationMessage item={item} />;
  }
  return <TextMessage item={item} />;
}

// ==========================================================================
// Component: Quick Prompt Suggestions
// ==========================================================================
function QuickPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <View className="pb-3">
      <Text className="mb-2 font-sans-bold text-sm text-foreground">
        Ask another question
      </Text>
      <FlatList
        horizontal
        data={QUICK_PROMPTS}
        keyExtractor={(prompt) => prompt}
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            className={`max-w-60 rounded-2xl border border-foreground px-4 py-3 ${
              index % 2 === 0 ? "bg-i-purple" : "bg-i-orange"
            }`}
            onPress={() => onSelect(item)}
          >
            <Text className="font-sans-regular text-sm text-foreground">
              {item}
            </Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View className="w-2" />}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

// ==========================================================================
// Component: Assistant Loading State
// ==========================================================================
function AssistantLoadingMessage() {
  return (
    <View className="mb-4 flex-row items-center">
      <AssistantAvatar />
      <View className="flex-row items-center rounded-3xl rounded-bl-md border border-foreground bg-i-yellow px-4 py-3">
        <ActivityIndicator color={COLORS.foreground} size="small" />
        <Text className="ml-2 font-sans-regular text-base text-foreground">
          Finding recommendations…
        </Text>
      </View>
    </View>
  );
}

// ==========================================================================
// Component: Local Message Composer
// ==========================================================================
function ChatComposer({
  value,
  disabled,
  onChange,
  onSend,
}: ChatComposerProps) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={styles.composer}>
      <View style={styles.inputContainer}>
        <TextInput
          accessibilityLabel="Chat message"
          className="max-h-28 min-h-8 font-sans-regular text-base text-foreground"
          maxLength={2_000}
          multiline
          editable={!disabled}
          onChangeText={onChange}
          onSubmitEditing={() => onSend()}
          placeholder="Ask about food or places…"
          placeholderTextColor={IOS_INPUT_PLACEHOLDER}
          returnKeyType="send"
          submitBehavior="blurAndSubmit"
          value={value}
        />
      </View>
      <Pressable
        accessibilityLabel="Send message"
        accessibilityRole="button"
        disabled={!canSend}
        onPress={onSend}
        style={[styles.sendButton, { opacity: canSend ? 1 : 0.35 }]}
      >
        <Ionicons name="arrow-up" size={22} color="#ffffff" />
      </Pressable>
    </View>
  );
}

// ==========================================================================
// Page: Chat
// ==========================================================================
export default function ChatPage() {
  const { selectedLocation } = useLocationSelection();
  const [conversation, setConversation] =
    useState<ChatItem[]>(INITIAL_CONVERSATION);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const nextItemId = useRef(1);
  const lastKnownLocation = useRef<ChatLocationRequest | null>(null);
  const requestInFlight = useRef(false);
  const conversationScrollRef = useRef<ScrollView>(null);
  const shouldRevealNewTurn = useRef(false);

  // ========================================================================
  // Function: Prefer Explicit App Selection, Then Optional Device GPS
  // ========================================================================
  const prepareChatLocation = useCallback(
    async (): Promise<PreparedChatLocation> => {
      if (selectedLocation) {
        return {
          location: selectedLocation.request,
          source: "user_selected",
        };
      }

      try {
        if (lastKnownLocation.current) {
          return {
            location: lastKnownLocation.current,
            source: "device_gps",
          };
        }

        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          return { source: "none" };
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const location: ChatLocationRequest = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        lastKnownLocation.current = location;
        return { location, source: "device_gps" };
      } catch (locationError) {
        if (__DEV__) {
          console.log("CHAT GPS CONTEXT UNAVAILABLE:", locationError);
        }
        return { source: "none" };
      }
    },
    [selectedLocation],
  );

  // ========================================================================
  // Function: Send a Message to the Chat API
  // ========================================================================
  const sendMessage = useCallback(
    async (messageText?: string) => {
      const text = (
        typeof messageText === "string" ? messageText : draft
      ).trim();
      if (!text || requestInFlight.current) {
        return;
      }

      Keyboard.dismiss();
      requestInFlight.current = true;
      setIsSending(true);
      setDraft("");
      const turnId = nextItemId.current++;
      setConversation((currentConversation) => {
        shouldRevealNewTurn.current = true;
        return [
          ...currentConversation,
          {
            id: `local-user-message-${turnId}`,
            type: "text",
            author: "user",
            text,
            time: "Now",
          },
        ];
      });

      try {
        const preparedLocation = await prepareChatLocation();
        const request: ChatRequest = { message: text };
        if (preparedLocation.location && preparedLocation.source !== "none") {
          request.location = preparedLocation.location;
          request.location_source = preparedLocation.source;
        }
        if (__DEV__) {
          console.log("CHAT REQUEST:", {
            request,
            selectedLocationSource: preparedLocation.source,
          });
        }

        const response = await createChatResponse(request);
        if (__DEV__) {
          console.log("CHAT RESPONSE:", {
            recommendedDishesLength: response.recommended_dishes.length,
            resolvedLocation: response.location,
          });
        }
        setConversation((currentConversation) => {
          shouldRevealNewTurn.current = true;
          return [
            ...currentConversation,
            createRecommendationItem(turnId, response),
          ];
        });
      } catch (requestError) {
        const errorMessage =
          requestError instanceof Error
            ? requestError.message
            : "Unable to get a recommendation right now.";
        setConversation((currentConversation) => {
          shouldRevealNewTurn.current = true;
          return [
            ...currentConversation,
            {
              id: `assistant-error-${turnId}`,
              type: "text",
              author: "assistant",
              text: errorMessage,
              time: "Now",
            },
          ];
        });
      } finally {
        requestInFlight.current = false;
        setIsSending(false);
      }
    },
    [draft, prepareChatLocation],
  );

  // ========================================================================
  // Main UI
  // ========================================================================
  return (
    <View className="page-view bg-background" collapsable={false}>
      <SafeAreaView
        collapsable={false}
        style={{ flex: 1 }}
        edges={["top", "left", "right", "bottom"]}
      >
        <ScrollView
          ref={conversationScrollRef}
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (!shouldRevealNewTurn.current) {
              return;
            }
            conversationScrollRef.current?.scrollToEnd({ animated: true });
            shouldRevealNewTurn.current = false;
          }}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
        >
          <ChatHeader />
          <View className="p-4">
            <View className="mb-5 rounded-3xl border border-foreground bg-i-green p-4">
              <Text className="font-sans-bold text-lg text-foreground">
                Your Vietnamese food companion
              </Text>
              <Text className="mt-1 font-sans-regular text-sm leading-5 text-foreground">
                Each answer can combine a concise recommendation, food cards,
                and a nearby map without removing earlier turns.
              </Text>
            </View>
            {conversation.map((item) => (
              <ConversationItem key={item.id} item={item} />
            ))}
            {isSending && <AssistantLoadingMessage />}
            <QuickPrompts onSelect={(prompt) => void sendMessage(prompt)} />
          </View>
        </ScrollView>
        <ChatComposer
          value={draft}
          disabled={isSending}
          onChange={setDraft}
          onSend={() => void sendMessage()}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    alignItems: "flex-end",
    backgroundColor: IOS_COMPOSER_BACKGROUND,
    borderTopColor: IOS_COMPOSER_BORDER,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputContainer: {
    backgroundColor: IOS_INPUT_BACKGROUND,
    borderColor: IOS_COMPOSER_BORDER,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: IOS_SEND_BACKGROUND,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});
