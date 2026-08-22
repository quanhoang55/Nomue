import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/constants/colors";

type TasteMeterProps = {
  label: string;
  value: number;
  max?: number;
  inverted?: boolean;
};

export function TasteMeter({
  label,
  value,
  max = 5,
  inverted = false,
}: TasteMeterProps) {
  const safeValue = Math.max(0, Math.min(max, Math.round(value)));
  const activeColor = inverted ? COLORS.background : COLORS.foreground;
  const inactiveColor = inverted
    ? "rgba(255,252,249,0.35)"
    : "rgba(16,16,16,0.18)";

  return (
    <View
      accessibilityLabel={`${label}, ${safeValue} out of ${max}`}
      style={styles.container}
    >
      <Text style={[styles.label, inverted && styles.labelInverted]}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.dots}>
        {Array.from({ length: max }, (_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor:
                  index < safeValue ? activeColor : inactiveColor,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flexDirection: "row", gap: 8 },
  label: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 10,
    letterSpacing: 0.9,
  },
  labelInverted: { color: COLORS.background },
  dots: { flexDirection: "row", gap: 4 },
  dot: { borderRadius: 99, height: 7, width: 7 },
});
