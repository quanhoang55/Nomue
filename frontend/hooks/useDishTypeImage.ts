import {
  getDishType,
  getDishTypeImageName,
  getDishTypeImageSource,
} from "@/services/dishType";
import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";

export function useDishTypeImage(dishTypeId: string | null | undefined) {
  const [resolved, setResolved] = useState<{
    dishTypeId: string;
    source: ImageSourcePropType | null;
  } | null>(null);

  useEffect(() => {
    let active = true;

    if (!dishTypeId) return () => {
      active = false;
    };

    void getDishTypeImageName(dishTypeId)
      .then(({ name }) => {
        if (active) {
          setResolved({
            dishTypeId,
            source: getDishTypeImageSource(name),
          });
        }
      })
      .catch(() => {
        if (active) setResolved({ dishTypeId, source: null });
      });

    return () => {
      active = false;
    };
  }, [dishTypeId]);

  return resolved && resolved.dishTypeId === dishTypeId
    ? resolved.source
    : null;
}

export function useDishTypeName(dishTypeId: string | null | undefined) {
  const [resolved, setResolved] = useState<{
    dishTypeId: string;
    name: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;

    if (!dishTypeId) return () => {
      active = false;
    };

    void getDishType(dishTypeId)
      .then(({ name }) => {
        if (active) setResolved({ dishTypeId, name });
      })
      .catch(() => {
        if (active) setResolved({ dishTypeId, name: null });
      });

    return () => {
      active = false;
    };
  }, [dishTypeId]);

  return resolved && resolved.dishTypeId === dishTypeId
    ? resolved.name
    : null;
}
