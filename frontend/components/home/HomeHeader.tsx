import { COLORS } from "@/constants/colors";
import Octicons from "@expo/vector-icons/Octicons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type HomeHeaderProps = {
  accentColor: string;
  disabled?: boolean;
  editing: boolean;
  locationLabel: string;
  provinceName: string;
  searchValue: string;
  onCancel: () => void;
  onChangeLocation: () => void;
  onChangeSearch: (value: string) => void;
  onSearch: () => void;
  onUseGps: () => void;
};

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeHeader({
  accentColor,
  disabled = false,
  editing,
  locationLabel,
  provinceName,
  searchValue,
  onCancel,
  onChangeLocation,
  onChangeSearch,
  onSearch,
  onUseGps,
}: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>{greetingForNow()}</Text>
      <View style={styles.headline}>
        <Text style={styles.title}>What Should We Eat</Text>
        <Text style={styles.title}>
          In <Text style={{ color: accentColor }}>{provinceName}</Text> Today?
        </Text>
      </View>

      {editing ? (
        <View style={styles.editor}>
          <View style={styles.inputRow}>
            <Octicons name="search" size={19} color={COLORS.foreground} />
            <TextInput
              autoFocus
              editable={!disabled}
              onChangeText={onChangeSearch}
              onSubmitEditing={onSearch}
              placeholder="City, Province"
              placeholderTextColor="#817972"
              returnKeyType="search"
              style={styles.input}
              value={searchValue}
            />
            <Pressable
              accessibilityLabel="Search location"
              disabled={disabled}
              onPress={onSearch}
              style={({ pressed }) => [
                styles.searchButton,
                pressed && styles.pressed,
              ]}
            >
              <Octicons
                name="arrow-right"
                size={24}
                color={COLORS.background}
              />
            </Pressable>
          </View>
          <View style={styles.editorActions}>
            <Pressable
              disabled={disabled}
              onPress={onUseGps}
              style={styles.textButton}
            >
              <Octicons
                name="paper-airplane"
                size={17}
                color={COLORS.foreground}
              />
              <Text style={styles.textButtonLabel}>Use my location</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={styles.textButton}>
              <Text style={styles.textButtonLabel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.locationBar}>
          <View style={styles.locationIdentity}>
            <View style={styles.pin}>
              <Octicons name="location" size={18} color={COLORS.foreground} />
            </View>
            <Text numberOfLines={1} style={styles.locationLabel}>
              {locationLabel}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onChangeLocation}
            style={({ pressed }) => [
              styles.changeButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.changeLabel}>Change</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, paddingHorizontal: 20, paddingTop: 20 },
  greeting: { color: "#655d5799", fontFamily: "normal-font", fontSize: 16 },
  headline: { maxWidth: 520 },
  title: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 32,
    // letterSpacing: ,
    lineHeight: 38,
    paddingTop: 10,
  },
  locationBar: {
    alignItems: "center",
    backgroundColor: "#ffffff80",
    borderColor: COLORS.foreground,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 12,
  },
  locationIdentity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  pin: {
    alignItems: "center",
    backgroundColor: COLORS.yellow,
    borderRadius: 99,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  locationLabel: {
    color: COLORS.foreground,
    flex: 1,
    fontFamily: "normal-bold",
    fontSize: 16,
  },
  changeButton: {
    borderColor: COLORS.foreground,
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  changeLabel: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 13,
  },
  editor: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.foreground,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 11,
  },
  inputRow: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderColor: COLORS.foreground,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 50,
    paddingLeft: 12,
    paddingRight: 5,
  },
  input: {
    color: COLORS.foreground,
    flex: 1,
    fontFamily: "normal-font",
    fontSize: 16,
    paddingVertical: 10,
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    borderRadius: 11,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  editorActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  textButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    padding: 5,
  },
  textButtonLabel: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 13,
  },
  pressed: { opacity: 0.66 },
});
