import { COLORS } from "@/constants/colors";
import Octicons from "@expo/vector-icons/Octicons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Callout,
  Marker,
  UrlTile,
  type Region,
} from "react-native-maps";

// ===========================================================
// Input
// ===========================================================
export enum LocationType {
  USER_LOCATION = "USER_LOCATION",
  DISH_LOCATION = "DISH_LOCATION",
}

const IconType = {
  [LocationType.USER_LOCATION]: "accessibility",
  [LocationType.DISH_LOCATION]: "sparkle",
} as const;

export interface DishLocation {
  latitude: number;
  longitude: number;
}

export interface MapScreenProps {
  user_latitude: number;
  user_longitude: number;
  dish_locations: DishLocation[] | null;
}

// ===========================================================
// Constants
// ===========================================================
const OPEN_STREET_MAP_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OPEN_STREET_MAP_COPYRIGHT = "https://www.openstreetmap.org/copyright";
const REGION_DELTA = 0.015;

// ===========================================================
// Create Region
// ===========================================================
function createRegion(latitude: number, longitude: number): Region {
  return {
    latitude,
    longitude,
    latitudeDelta: REGION_DELTA,
    longitudeDelta: REGION_DELTA,
  };
}

// ===========================================================
// MapScreen
// ===========================================================
export function MapScreen({
  location_info,
}: {
  location_info: MapScreenProps;
}) {
  // ===========================================================
  // State
  // ===========================================================
  const mapRef = useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // ===========================================================
  // Parameter
  // ===========================================================
  const latitude = location_info.user_latitude;
  const longitude = location_info.user_longitude;
  const dishLocations = location_info.dish_locations ?? [];

  const region = useMemo(
    () => createRegion(latitude, longitude),
    [latitude, longitude],
  );

  const centerMap = useCallback(
    (animated = true) => {
      mapRef.current?.animateToRegion(region, animated ? 450 : 0);
    },
    [region],
  );

  useEffect(() => {
    if (isMapReady) {
      centerMap();
    }
  }, [centerMap, isMapReady]);

  const openAttribution = useCallback(() => {
    void Linking.openURL(OPEN_STREET_MAP_COPYRIGHT);
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        mapType="none"
        loadingEnabled
        moveOnMarkerPress={false}
        pitchEnabled={false}
        rotateEnabled={false}
        showsBuildings={false}
        showsCompass={false}
        showsIndoors={false}
        showsPointsOfInterests={false}
        showsScale={false}
        showsTraffic={false}
        toolbarEnabled={false}
        onMapReady={() => setIsMapReady(true)}
      >
        <UrlTile
          urlTemplate={OPEN_STREET_MAP_TILES}
          maximumZ={19}
          tileSize={256}
          flipY={false}
          shouldReplaceMapContent
        />

        <Marker
          coordinate={{ latitude, longitude }}
          anchor={{ x: 0.5, y: 0.9 }}
          tracksViewChanges={false}
          accessibilityLabel="Selected location"
        >
          <View style={styles.marker}>
            <View style={styles.markerPin}>
              <Octicons
                name={IconType[LocationType.USER_LOCATION]}
                size={24}
                color="black"
              />
            </View>
            <View style={styles.markerPoint} />
          </View>

          <Callout tooltip>
            <View style={styles.calloutWrapper}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}></Text>
              </View>
              <View style={styles.calloutArrow} />
            </View>
          </Callout>
        </Marker>

        {dishLocations.map((dishLocation, index) => (
          <Marker
            key={`${dishLocation.latitude}-${dishLocation.longitude}-${index}`}
            coordinate={dishLocation}
            anchor={{ x: 0.5, y: 0.9 }}
            tracksViewChanges={false}
            accessibilityLabel={`Dish location ${index + 1}`}
          >
            <View style={styles.marker}>
              <View style={[styles.markerPin, styles.dishMarkerPin]}>
                <Octicons
                  name={IconType[LocationType.DISH_LOCATION]}
                  size={24}
                  color="black"
                />
              </View>
              <View style={[styles.markerPoint, styles.dishMarkerPoint]} />
            </View>

            <Callout tooltip>
              <View style={styles.calloutWrapper}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>Dish location</Text>
                  <Text style={styles.calloutCoordinates}>
                    {dishLocation.latitude.toFixed(5)},{" "}
                    {dishLocation.longitude.toFixed(5)}
                  </Text>
                </View>
                <View style={styles.calloutArrow} />
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <Pressable
        accessibilityLabel="Open OpenStreetMap copyright information"
        accessibilityRole="link"
        onPress={openAttribution}
        style={({ pressed }) => [
          styles.attribution,
          pressed && styles.attributionPressed,
        ]}
      >
        <Text style={styles.attributionText}>© OpenStreetMap contributors</Text>
      </Pressable>

      {!isMapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#172018" size="large" />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: COLORS.foreground,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  // centerButton: {
  //   position: "absolute",
  //   right: 16,
  //   bottom: 52,
  //   width: 48,
  //   height: 48,
  //   alignItems: "center",
  //   justifyContent: "center",
  //   borderRadius: 16,
  //   borderWidth: 1,
  //   borderColor: "rgba(23, 32, 24, 0.12)",
  //   backgroundColor: "#FAF8EF",
  //   shadowColor: "#172018",
  //   shadowOffset: { width: 0, height: 5 },
  //   shadowOpacity: 0.18,
  //   shadowRadius: 10,
  //   elevation: 5,
  // },
  // centerButtonPressed: {
  //   opacity: 0.75,
  //   transform: [{ scale: 0.96 }],
  // },
  marker: {
    width: 58,
    height: 64,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  markerPin: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: COLORS.foreground,
    backgroundColor: COLORS.red,
  },
  markerPoint: {
    width: 8,
    height: 8,
    marginTop: 3,
    borderRadius: 4,
    backgroundColor: COLORS.red,
    borderWidth: 1.5,
    borderColor: COLORS.foreground,
  },
  dishMarkerPin: {
    backgroundColor: COLORS.purple,
  },
  dishMarkerPoint: {
    backgroundColor: COLORS.purple,
  },
  calloutWrapper: {
    alignItems: "center",
    paddingBottom: 5,
  },
  callout: {
    width: 220,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#172018",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 8,
  },
  calloutEyebrow: {
    marginBottom: 5,
    color: "#A9CDA7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  calloutTitle: {
    marginBottom: 7,
    color: "#FAF8EF",
    fontSize: 16,
    fontWeight: "800",
  },
  calloutCoordinates: {
    color: "#BBC4BA",
    fontSize: 12,
    fontWeight: "600",
  },
  calloutArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#172018",
  },
  attribution: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(250, 248, 239, 0.88)",
  },
  attributionPressed: {
    opacity: 0.7,
  },
  attributionText: {
    color: "#425043",
    fontSize: 9,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#DCE4DA",
  },
  loadingText: {
    color: "#425043",
    fontSize: 13,
    fontWeight: "700",
  },
});
