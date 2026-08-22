import { getDishes, type Dish } from "@/services/dish";
import { useCallback, useEffect, useState } from "react";

export function useLocalDishes(provinceId: string | null) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loadedProvinceId, setLoadedProvinceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(provinceId));
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const refresh = useCallback(() => setRequestKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;

    if (!provinceId) {
      setDishes([]);
      setLoadedProvinceId(null);
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError(null);

      try {
        const response = await getDishes(provinceId);
        if (active) {
          setDishes(response);
          setLoadedProvinceId(provinceId);
        }
      } catch (requestError) {
        if (!active) return;
        setDishes([]);
        setLoadedProvinceId(provinceId);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load local dishes right now.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [provinceId, requestKey]);

  const currentDishes = loadedProvinceId === provinceId ? dishes : [];
  const currentLoading = Boolean(provinceId) && (loading || loadedProvinceId !== provinceId);

  return { dishes: currentDishes, loading: currentLoading, error, refresh };
}
