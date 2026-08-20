import { COLORS } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { Redirect } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  const { isLogIn, profile, signOut, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLogIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  async function handleSignOut() {
    setLoading(true);
    setError(null);
    try {
      await signOut();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error
          ? signOutError.message
          : "Unable to sign out right now.",
      );
      setLoading(false);
    }
  }

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.heading}>Profile</Text>
          <View style={styles.profileCard}>
            <Text style={styles.name}>{profile?.display_name ?? "Traveler"}</Text>
            <Text style={styles.email}>{user?.email ?? profile?.email}</Text>
            <Text style={styles.meta}>
              Language: {profile?.preferred_language ?? "en"}
            </Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={() => void handleSignOut()}
            style={({ pressed }) => [
              styles.signOutButton,
              (loading || pressed) && styles.dimmed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.foreground} />
            ) : (
              <Text style={styles.signOutText}>Sign out</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.background, flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 18 },
  heading: {
    color: COLORS.foreground,
    fontFamily: "spec-36",
    fontSize: 56,
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: "#fff",
    borderColor: COLORS.foreground,
    borderRadius: 18,
    borderWidth: 1,
    gap: 7,
    padding: 20,
  },
  name: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 24,
  },
  email: {
    color: COLORS.foreground,
    fontFamily: "normal-font",
    fontSize: 17,
  },
  meta: {
    color: "#59534f",
    fontFamily: "normal-font",
    fontSize: 15,
  },
  error: {
    color: "#a62530",
    fontFamily: "normal-font",
    marginTop: 14,
    textAlign: "center",
  },
  signOutButton: {
    alignItems: "center",
    borderColor: COLORS.foreground,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 22,
    minHeight: 52,
    justifyContent: "center",
  },
  signOutText: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 18,
  },
  dimmed: { opacity: 0.55 },
});
