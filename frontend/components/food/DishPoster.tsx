import { COLORS } from "@/constants/colors";
import {
  useDishTypeImage,
  useDishTypeName,
} from "@/hooks/useDishTypeImage";
import { Image, StyleSheet, Text, View } from "react-native";
import { TasteMeter } from "@/components/food/TasteMeter";

export interface DishPosterProps {
  dishTypeId?: string | null;
  name: string;
  province?: string;
  spiceLevel: number;
  sweetnessLevel: number;
  sournessLevel: number;
  bitternessLevel: number;
  adventurousLevel: number;
  variant?: "hero" | "compact";
}

const POSTER_PALETTES = [
  { background: COLORS.red, shape: COLORS.yellow, detail: COLORS.purple },
  { background: COLORS.green, shape: COLORS.yellow, detail: COLORS.blue },
  { background: COLORS.purple, shape: COLORS.orange, detail: COLORS.yellow },
  { background: COLORS.yellow, shape: COLORS.blue, detail: COLORS.red },
  { background: COLORS.orange, shape: COLORS.purple, detail: COLORS.green },
  { background: COLORS.blue, shape: COLORS.red, detail: COLORS.yellow },
] as const;

function hashText(value: string) {
  return Array.from(value).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
}

function posterName(name: string) {
  return name.toUpperCase();
}

export function DishPoster({
  dishTypeId,
  name,
  province,
  spiceLevel,
  sweetnessLevel,
  sournessLevel,
  bitternessLevel,
  adventurousLevel,
  variant = "compact",
}: DishPosterProps) {
  const dishTypeImage = useDishTypeImage(dishTypeId);
  const dishTypeName = useDishTypeName(dishTypeId);
  const compact = variant === "compact";
  const intensity = spiceLevel + sournessLevel + adventurousLevel;
  const signature = hashText(`${name}-${province ?? "nomue"}`);
  const palette = POSTER_PALETTES[signature % POSTER_PALETTES.length];
  const rotation = `${(spiceLevel - sweetnessLevel) * 5}deg`;
  const scale = 0.85 + intensity / 40;
  const corner = 28 + bitternessLevel * 8;

  return (
    <View
      accessibilityLabel={`${name} Nomue poster`}
      style={[
        styles.poster,
        compact ? styles.compact : styles.hero,
        { backgroundColor: palette.background },
      ]}
    >
      <View
        style={[
          styles.largeShape,
          compact && styles.largeShapeCompact,
          {
            backgroundColor: palette.shape,
            borderRadius: corner,
            transform: [{ rotate: rotation }, { scale }],
          },
        ]}
      />
      <View
        style={[
          styles.smallShape,
          compact && styles.smallShapeCompact,
          { backgroundColor: palette.detail },
        ]}
      />
      {dishTypeImage ? (
        <Image
          accessible={false}
          resizeMode="contain"
          source={dishTypeImage}
          style={[styles.sticker, compact && styles.stickerCompact]}
        />
      ) : (
        <View style={[styles.ring, compact && styles.ringCompact]} />
      )}

      <View style={styles.posterContent}>
        <View style={styles.posterTopline}>
          <Text numberOfLines={1} style={styles.region}>
            {(province ?? "LOCAL DISH").toUpperCase()}
          </Text>
          {!compact && dishTypeName ? (
            <Text numberOfLines={1} style={styles.typeMark}>
              {dishTypeName.toUpperCase()}
            </Text>
          ) : null}
        </View>

        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.68}
          numberOfLines={compact ? 2 : 3}
          style={[styles.name, compact ? styles.nameCompact : styles.nameHero]}
        >
          {posterName(name)}
        </Text>

        {!compact ? (
          <View style={styles.meters}>
            <TasteMeter inverted label="Spicy" value={spiceLevel} />
            <TasteMeter inverted label="Adventure" value={adventurousLevel} />
          </View>
        ) : (
          <View style={styles.signatureRow}>
            <View style={styles.signatureLine} />
            <Text style={styles.signature}>Nº {(signature % 90) + 10}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: {
    borderColor: COLORS.foreground,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  hero: { aspectRatio: 0.94, borderRadius: 28, minHeight: 360 },
  compact: { aspectRatio: 1.14, borderRadius: 20, minHeight: 146 },
  largeShape: {
    height: 210,
    opacity: 0.82,
    position: "absolute",
    right: -42,
    top: 56,
    width: 210,
  },
  largeShapeCompact: { height: 100, right: -18, top: 36, width: 100 },
  smallShape: {
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    bottom: 42,
    height: 92,
    left: -18,
    position: "absolute",
    transform: [{ rotate: "-18deg" }],
    width: 92,
  },
  smallShapeCompact: { bottom: -10, height: 62, left: -12, width: 62 },
  ring: {
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 2,
    height: 200,
    width: 200,
    position: "absolute",
    right: -25,
    bottom: -25,
  },
  ringCompact: { height: 66, right: 14, top: 50, width: 66 },
  sticker: {
    height: 270,
    position: "absolute",
    right: -60,
    top: 180,
    transform: [{ rotate: "20deg" }],
    width: 270,
  },
  stickerCompact: {
    height: 118,
    right: -26,
    top: 68,
    transform: [{ rotate: "20deg" }],
    width: 118,
  },
  posterContent: { flex: 1, justifyContent: "space-between", padding: 22 },
  posterTopline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  region: {
    color: COLORS.foreground,
    flex: 1,
    fontFamily: "normal-bold",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  typeMark: {
    color: COLORS.foreground,
    flexShrink: 1,
    fontFamily: "normal-bold",
    fontSize: 10,
    letterSpacing: 0.8,
    marginLeft: 10,
    maxWidth: "48%",
    textAlign: "right",
  },
  name: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    paddingTop: 10,
    textTransform: "uppercase",
  },
  nameHero: { fontSize: 56, lineHeight: 60, maxWidth: "82%" },
  nameCompact: { fontSize: 26, lineHeight: 30, maxWidth: "86%" },
  meters: { alignItems: "flex-start", gap: 7 },
  signatureRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  signatureLine: { backgroundColor: COLORS.foreground, height: 1, width: 24 },
  signature: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 9,
    letterSpacing: 1,
  },
});
