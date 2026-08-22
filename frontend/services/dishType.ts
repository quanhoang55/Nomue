import { apiFetch } from "@/lib/api";
import type { ImageSourcePropType } from "react-native";

export type DishTypeImageNameResponse = {
  name: string;
};

export type DishTypeResponse = {
  name: string;
};

const DISH_TYPE_IMAGES: Record<string, ImageSourcePropType> = {
  bread_sandwich: require("../assets/images/dish_type/bread_sandwich.png"),
  condiment_side: require("../assets/images/dish_type/condiment_side.png"),
  dessert_sweet: require("../assets/images/dish_type/dessert_sweet.png"),
  drink: require("../assets/images/dish_type/drink.png"),
  dry_noodles: require("../assets/images/dish_type/dry_noodles.png"),
  hotpot: require("../assets/images/dish_type/hotpot.png"),
  meat_dish: require("../assets/images/dish_type/meat_dish.png"),
  noodle_soup: require("../assets/images/dish_type/noodle_soup.png"),
  porridge: require("../assets/images/dish_type/porridge.png"),
  rice_dish: require("../assets/images/dish_type/rice_dish.png"),
  rolls_wraps: require("../assets/images/dish_type/rolls_wraps.png"),
  salad_vegetable: require("../assets/images/dish_type/salad_vegetable.png"),
  savory_cakes_dumplings: require("../assets/images/dish_type/savory_cakes_dumplings.png"),
  seafood_dish: require("../assets/images/dish_type/seafood_dish.png"),
  snack_street_food: require("../assets/images/dish_type/snack_street_food.png"),
  soup_stew: require("../assets/images/dish_type/soup_stew.png"),
};

const imageNameCache = new Map<string, string>();
const imageNameRequests = new Map<
  string,
  Promise<DishTypeImageNameResponse>
>();
const dishTypeCache = new Map<string, DishTypeResponse>();
const dishTypeRequests = new Map<string, Promise<DishTypeResponse>>();

export function getDishType(dishTypeId: string): Promise<DishTypeResponse> {
  const cachedDishType = dishTypeCache.get(dishTypeId);
  if (cachedDishType) return Promise.resolve(cachedDishType);

  const pendingRequest = dishTypeRequests.get(dishTypeId);
  if (pendingRequest) return pendingRequest;

  const request = apiFetch<DishTypeResponse>(`/dish-types/${dishTypeId}`, {
    auth: "none",
  })
    .then((response) => {
      dishTypeCache.set(dishTypeId, response);
      return response;
    })
    .finally(() => {
      dishTypeRequests.delete(dishTypeId);
    });

  dishTypeRequests.set(dishTypeId, request);
  return request;
}

export function getDishTypeImageName(
  dishTypeId: string,
): Promise<DishTypeImageNameResponse> {
  const cachedName = imageNameCache.get(dishTypeId);
  if (cachedName) return Promise.resolve({ name: cachedName });

  const pendingRequest = imageNameRequests.get(dishTypeId);
  if (pendingRequest) return pendingRequest;

  const request = apiFetch<DishTypeImageNameResponse>(
    `/dish-types/image-name/${dishTypeId}`,
    { auth: "none" },
  )
    .then((response) => {
      imageNameCache.set(dishTypeId, response.name);
      return response;
    })
    .finally(() => {
      imageNameRequests.delete(dishTypeId);
    });

  imageNameRequests.set(dishTypeId, request);
  return request;
}

export function getDishTypeImageSource(
  imageName: string,
): ImageSourcePropType | null {
  return DISH_TYPE_IMAGES[imageName] ?? null;
}
