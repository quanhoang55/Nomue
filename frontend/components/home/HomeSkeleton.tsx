import { COLORS } from "@/constants/colors";
import { StyleSheet, View } from "react-native";

function Block({ style }: { style: object }) {
  return <View style={[styles.block, style]} />;
}

export function HomeSkeleton() {
  return (
    <View
      accessibilityLabel="Loading local food guide"
      style={styles.container}
    >
      <View style={styles.header}>
        <Block style={styles.greeting} />
        <Block style={styles.title} />
        <Block style={styles.titleShort} />
        <Block style={styles.location} />
      </View>
      <View style={styles.section}>
        <Block style={styles.eyebrow} />
        <Block style={styles.hero} />
      </View>
      <Block style={styles.taste} />
      <View style={styles.section}>
        <Block style={styles.sectionTitle} />
        <View style={styles.row}>
          <Block style={styles.card} />
          <Block style={styles.card} />
        </View>
      </View>
      <View style={styles.section}>
        <Block style={styles.sectionTitle} />
        <Block style={styles.map} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 34, paddingBottom: 40, paddingTop: 18 },
  header: { gap: 11, paddingHorizontal: 20 },
  section: { gap: 12, paddingHorizontal: 20 },
  block: { backgroundColor: "#e8dfd9", borderRadius: 12 },
  greeting: { height: 14, width: 110 },
  title: { height: 38, width: "88%" },
  titleShort: { height: 38, width: "68%" },
  location: { height: 58, marginTop: 10, width: "100%" },
  eyebrow: { height: 11, width: 150 },
  hero: {
    aspectRatio: 0.72,
    borderColor: COLORS.foreground,
    borderRadius: 28,
    borderWidth: 1,
    width: "100%",
  },
  taste: { height: 92, marginHorizontal: 20 },
  sectionTitle: { height: 28, width: 220 },
  row: { flexDirection: "row", gap: 12, overflow: "hidden" },
  card: { height: 270, minWidth: 220 },
  map: { height: 205, width: "100%" },
});
