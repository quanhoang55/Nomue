import type { LocationResolveRequest } from "@/services/location";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type SelectedAppLocation = {
  request: LocationResolveRequest;
  label: string;
};

type LocationContextType = {
  selectedLocation: SelectedAppLocation | null;
  selectLocation: (request: LocationResolveRequest, label: string) => void;
  clearSelectedLocation: () => void;
};

const LocationContext = createContext<LocationContextType | undefined>(
  undefined,
);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedAppLocation | null>(null);

  const selectLocation = useCallback(
    (request: LocationResolveRequest, label: string) => {
      setSelectedLocation({ request, label });
    },
    [],
  );

  const clearSelectedLocation = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const value = useMemo(
    () => ({ selectedLocation, selectLocation, clearSelectedLocation }),
    [clearSelectedLocation, selectLocation, selectedLocation],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationSelection() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error(
      "useLocationSelection must be used within LocationProvider",
    );
  }
  return context;
}
