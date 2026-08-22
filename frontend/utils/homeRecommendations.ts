import type { Dish } from "@/services/dish";

export type HomeDishSections = {
  featured: Dish | null;
  localEssentials: Dish[];
  adventurous: Dish[];
  budget: Dish[];
};

function importanceOf(dish: Dish) {
  return dish.importance_score ?? dish.important_score;
}

function deterministicDishOrder(a: Dish, b: Dish) {
  const importanceDifference = (importanceOf(b) ?? -1) - (importanceOf(a) ?? -1);
  if (importanceDifference !== 0) return importanceDifference;
  return a.name.localeCompare(b.name, "vi");
}

export function buildHomeSections(dishes: Dish[]): HomeDishSections {
  if (dishes.length === 0) {
    return { featured: null, localEssentials: [], adventurous: [], budget: [] };
  }

  const hasImportanceScores = dishes.some((dish) => importanceOf(dish) !== undefined);
  // The current API preserves dish_province importance ordering. Until the
  // score is included in DishResponse, the first item is the best local pick.
  const importanceRanked = hasImportanceScores
    ? [...dishes].sort(deterministicDishOrder)
    : [...dishes];

  const scoredEssentials = importanceRanked.filter(
    (dish) => (importanceOf(dish) ?? 0) >= 4,
  );

  return {
    featured: importanceRanked[0] ?? null,
    localEssentials: (scoredEssentials.length > 0 ? scoredEssentials : importanceRanked).slice(0, 8),
    adventurous: [...dishes]
      .sort(
        (a, b) =>
          b.adventurous_level - a.adventurous_level ||
          deterministicDishOrder(a, b),
      )
      .slice(0, 6),
    budget: importanceRanked
      .filter((dish) => dish.typical_price <= 100_000)
      .slice(0, 8),
  };
}

export function formatCompactPrice(price: number) {
  if (price >= 1_000_000) {
    return `~${(price / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M ₫`;
  }
  return `~${Math.round(price / 1_000)}K ₫`;
}
