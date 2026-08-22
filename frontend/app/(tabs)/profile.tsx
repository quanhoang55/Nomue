import { COLORS } from "@/constants/colors";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import {
  getMyPreferences,
  type UserPreference,
  type UserPreferenceUpdate,
  updateMyPreferences,
} from "@/services/preference";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type EditablePreference = Required<UserPreferenceUpdate>;

const settingRows = [
  { description: "Name, email and account details", icon: "person-outline" as const, label: "Personal information" },
  { description: "Flavours, restrictions and allergies", icon: "restaurant-outline" as const, label: "Food preferences" },
  { description: "Default area and language", icon: "location-outline" as const, label: "Location & language" },
  { description: "Recommendations and useful reminders", icon: "notifications-outline" as const, label: "Notifications" },
  { description: "Permissions and account controls", icon: "shield-checkmark-outline" as const, label: "Privacy & data" },
  { description: "Questions, feedback and app information", icon: "help-circle-outline" as const, label: "Help & about" },
];

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "N";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function languageLabel(language: string | null | undefined) {
  if (language === "vi") return "Tiếng Việt";
  if (language === "en" || !language) return "English";
  return language.toUpperCase();
}

function budgetLabel(maxPrice: number | null) {
  if (maxPrice === null) return "No limit";
  if (maxPrice < 1_000_000) return `Up to ${Math.round(maxPrice / 1_000)}K ₫`;
  return `Up to ${maxPrice.toLocaleString("vi-VN")} ₫`;
}

function dietLabel(preferences: UserPreference) {
  const diets = [
    preferences.vegan ? "Vegan" : null,
    !preferences.vegan && preferences.vegetarian ? "Vegetarian" : null,
    preferences.halal_preference ? "Halal" : null,
  ].filter(Boolean);
  return diets.length ? diets.join(" · ") : "Not set";
}

function avoidanceLabel(preferences: UserPreference) {
  const avoided = [
    preferences.no_pork ? "Pork" : null,
    preferences.no_beef ? "Beef" : null,
    preferences.no_seafood ? "Seafood" : null,
  ].filter(Boolean);
  return avoided.length ? avoided.join(" · ") : "Nothing set";
}

function SectionHeading({ action, eyebrow, onPress, title }: {
  action?: string;
  eyebrow: string;
  onPress?: () => void;
  title: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action && onPress ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TasteLevel({ color, icon, label, value }: {
  color: string;
  icon: IconName;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.tasteItem}>
      <View style={[styles.tasteIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} color={COLORS.foreground} size={18} />
      </View>
      <View style={styles.tasteCopy}>
        <View style={styles.tasteMeta}>
          <Text style={styles.tasteLabel}>{label}</Text>
          <Text style={styles.tasteScore}>{value}/5</Text>
        </View>
        <View accessibilityLabel={`${label} preference ${value} out of 5`} accessibilityRole="progressbar" style={styles.meter}>
          {Array.from({ length: 5 }, (_, index) => (
            <View key={index} style={[styles.meterSegment, index < value && { backgroundColor: color }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

function PreferenceCard({ color, icon, label, value }: {
  color: string;
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.preferenceCard, { backgroundColor: color }]}>
      <Ionicons name={icon} color={COLORS.foreground} size={21} />
      <Text style={styles.preferenceLabel}>{label}</Text>
      <Text style={styles.preferenceValue}>{value}</Text>
    </View>
  );
}

function SettingRow({ description, icon, label, onPress }: {
  description: string;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && styles.rowPressed]}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} color={COLORS.foreground} size={21} />
      </View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" color="#746c65" size={19} />
    </Pressable>
  );
}

function PreferenceToggle({ label, onChange, value }: {
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.toggleRow,
        value && styles.toggleRowActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, value && styles.toggleTrackActive]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
      </View>
    </Pressable>
  );
}

function LevelEditor({ color, label, onChange, value }: {
  color: string;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <View style={styles.levelEditor}>
      <View style={styles.levelEditorHeader}>
        <Text style={styles.levelEditorLabel}>{label}</Text>
        <Text style={styles.levelEditorValue}>{value}/5</Text>
      </View>
      <View style={styles.levelOptions}>
        {Array.from({ length: 6 }, (_, level) => {
          const selected = level === value;
          return (
            <Pressable
              accessibilityLabel={`${label} ${level} out of 5`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={level}
              onPress={() => onChange(level)}
              style={({ pressed }) => [
                styles.levelOption,
                selected && { backgroundColor: color, borderColor: COLORS.foreground },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.levelOptionText, selected && styles.levelOptionTextActive]}>{level}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PreferenceEditor({ draft, error, onCancel, onChange, onSave, saving, visible }: {
  draft: EditablePreference | null;
  error: string | null;
  onCancel: () => void;
  onChange: (update: Partial<EditablePreference>) => void;
  onSave: () => void;
  saving: boolean;
  visible: boolean;
}) {
  if (!draft) return null;

  return (
    <Modal animationType="slide" onRequestClose={onCancel} presentationStyle="pageSheet" visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.editorPage}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.editorSafeArea}>
          <View style={styles.editorHeader}>
            <Pressable accessibilityRole="button" disabled={saving} hitSlop={8} onPress={onCancel} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={styles.editorCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.editorHeaderTitle}>FOOD PROFILE</Text>
            <Pressable accessibilityRole="button" disabled={saving} hitSlop={8} onPress={onSave} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={[styles.editorSave, saving && styles.dimmed]}>{saving ? "Saving…" : "Save"}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View>
              <Text style={styles.editorEyebrow}>MAKE NOMUE YOURS</Text>
              <Text style={styles.editorTitle}>How do you like to eat?</Text>
              <Text style={styles.editorIntro}>Tune your recommendations. You can change these whenever your tastes do.</Text>
            </View>

            <View style={styles.editorGroup}>
              <Text style={styles.editorGroupTitle}>FLAVOUR LEVELS</Text>
              <View style={styles.levelList}>
                <LevelEditor color={COLORS.red} label="Spicy" onChange={(value) => onChange({ spice_preference: value })} value={draft.spice_preference} />
                <LevelEditor color={COLORS.yellow} label="Sweet" onChange={(value) => onChange({ sweetness_preference: value })} value={draft.sweetness_preference} />
                <LevelEditor color={COLORS.green} label="Sour" onChange={(value) => onChange({ sourness_preference: value })} value={draft.sourness_preference} />
                <LevelEditor color={COLORS.purple} label="Adventure" onChange={(value) => onChange({ adventurous_preference: value })} value={draft.adventurous_preference} />
              </View>
            </View>

            <View style={styles.editorGroup}>
              <Text style={styles.editorGroupTitle}>DIET</Text>
              <View style={styles.toggleList}>
                <PreferenceToggle label="Vegetarian" onChange={(value) => onChange({ vegetarian: value })} value={draft.vegetarian} />
                <PreferenceToggle label="Vegan" onChange={(value) => onChange({ vegan: value })} value={draft.vegan} />
                <PreferenceToggle label="Halal preference" onChange={(value) => onChange({ halal_preference: value })} value={draft.halal_preference} />
              </View>
            </View>

            <View style={styles.editorGroup}>
              <Text style={styles.editorGroupTitle}>FOODS TO AVOID</Text>
              <View style={styles.toggleList}>
                <PreferenceToggle label="Pork" onChange={(value) => onChange({ no_pork: value })} value={draft.no_pork} />
                <PreferenceToggle label="Beef" onChange={(value) => onChange({ no_beef: value })} value={draft.no_beef} />
                <PreferenceToggle label="Seafood" onChange={(value) => onChange({ no_seafood: value })} value={draft.no_seafood} />
              </View>
            </View>

            <View style={styles.editorGroup}>
              <Text style={styles.editorGroupTitle}>ALLERGIES</Text>
              <TextInput
                accessibilityLabel="Allergies"
                editable={!saving}
                multiline
                onChangeText={(value) => onChange({ allergy_preference: value })}
                placeholder="For example: peanuts, shellfish"
                placeholderTextColor="#8a817a"
                style={styles.allergyInput}
                textAlignVertical="top"
                value={draft.allergy_preference ?? ""}
              />
            </View>

            <View style={styles.budgetNotice}>
              <Ionicons color={COLORS.foreground} name="wallet-outline" size={20} />
              <View style={styles.budgetNoticeCopy}>
                <Text style={styles.budgetNoticeTitle}>Meal budget</Text>
                <Text style={styles.budgetNoticeText}>Budget editing will be available after max_price is added to your preference table.</Text>
              </View>
            </View>

            {error ? <Text style={styles.editorError}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onSave}
              style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.dimmed]}
            >
              {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.saveButtonText}>Save food profile</Text>}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function preferenceDraft(preferences: UserPreference): EditablePreference {
  return {
    adventurous_preference: preferences.adventurous_preference,
    allergy_preference: preferences.allergy_preference,
    halal_preference: preferences.halal_preference,
    no_beef: preferences.no_beef,
    no_pork: preferences.no_pork,
    no_seafood: preferences.no_seafood,
    sourness_preference: preferences.sourness_preference,
    spice_preference: preferences.spice_preference,
    sweetness_preference: preferences.sweetness_preference,
    vegan: preferences.vegan,
    vegetarian: preferences.vegetarian,
  };
}

export default function Profile() {
  const { isLogIn, profile, signOut, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [preferenceStatus, setPreferenceStatus] = useState<
    "loading" | "ready" | "missing" | "error"
  >("loading");
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [preferenceRequestKey, setPreferenceRequestKey] = useState(0);
  const [editorVisible, setEditorVisible] = useState(false);
  const [preferenceDraftState, setPreferenceDraftState] = useState<EditablePreference | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savePreferenceError, setSavePreferenceError] = useState<string | null>(null);
  const displayName = profile?.display_name?.trim() || "Nomue traveler";
  const email = user?.email ?? profile?.email ?? "Email unavailable";
  const memberInitials = useMemo(() => initials(displayName), [displayName]);
  const tasteLevels = useMemo(
    () =>
      preferences
        ? [
            { color: COLORS.red, icon: "flame-outline" as const, label: "Spicy", value: preferences.spice_preference },
            { color: COLORS.yellow, icon: "ice-cream-outline" as const, label: "Sweet", value: preferences.sweetness_preference },
            { color: COLORS.green, icon: "water-outline" as const, label: "Sour", value: preferences.sourness_preference },
            { color: COLORS.purple, icon: "compass-outline" as const, label: "Adventure", value: preferences.adventurous_preference },
          ]
        : [],
    [preferences],
  );
  const foodProfileLabel = {
    error: "Unavailable",
    loading: "Loading",
    missing: "Not set",
    ready: "Synced",
  }[preferenceStatus];

  useEffect(() => {
    if (!isLogIn) return;

    let active = true;

    void getMyPreferences()
      .then((response) => {
        if (!active) return;
        setPreferences(response);
        setPreferenceStatus("ready");
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setPreferences(null);
        if (requestError instanceof ApiError && requestError.status === 404) {
          setPreferenceStatus("missing");
          return;
        }
        setPreferenceError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your food preferences.",
        );
        setPreferenceStatus("error");
      });

    return () => {
      active = false;
    };
  }, [isLogIn, preferenceRequestKey, user?.id]);

  if (!isLogIn) return <Redirect href="/(auth)/sign-in" />;

  function previewAction(label: string) {
    setError(null);
    setMessage(`${label} editing is not connected yet.`);
  }

  function openPreferenceEditor() {
    if (!preferences || preferenceStatus !== "ready") return;
    setMessage(null);
    setError(null);
    setSavePreferenceError(null);
    setPreferenceDraftState(preferenceDraft(preferences));
    setEditorVisible(true);
  }

  function closePreferenceEditor() {
    if (savingPreferences) return;
    setEditorVisible(false);
    setSavePreferenceError(null);
  }

  async function handleSavePreferences() {
    if (!preferenceDraftState || savingPreferences) return;
    setSavingPreferences(true);
    setSavePreferenceError(null);

    try {
      const updated = await updateMyPreferences({
        ...preferenceDraftState,
        allergy_preference: preferenceDraftState.allergy_preference?.trim() || null,
      });
      setPreferences(updated);
      setPreferenceStatus("ready");
      setEditorVisible(false);
      setPreferenceDraftState(preferenceDraft(updated));
      setMessage("Your food preferences have been updated.");
    } catch (requestError) {
      setSavePreferenceError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save your food preferences.",
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await signOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Unable to sign out right now.");
      setLoading(false);
    }
  }

  return (
    <View style={styles.page}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.kicker}>YOUR NOMUE</Text>
              <Text style={styles.heading}>PROFILE</Text>
            </View>
            <View style={styles.settingsMark}>
              <Ionicons name="settings-outline" color={COLORS.foreground} size={23} />
            </View>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.profileShapeLarge} />
            <View style={styles.profileShapeSmall} />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{memberInitials}</Text>
            </View>
            <View style={styles.profileCopy}>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{profile?.status === "active" ? "ACTIVE EXPLORER" : "FOOD EXPLORER"}</Text>
              </View>
              <Text numberOfLines={2} style={styles.profileName}>{displayName}</Text>
              <Text numberOfLines={1} style={styles.email}>{email}</Text>
            </View>
            <View style={styles.profileFooter}>
              <View>
                <Text style={styles.profileMetaLabel}>LANGUAGE</Text>
                <Text style={styles.profileMetaValue}>{languageLabel(profile?.preferred_language)}</Text>
              </View>
              <View style={styles.profileDivider} />
              <View>
                <Text style={styles.profileMetaLabel}>FOOD PROFILE</Text>
                <Text style={styles.profileMetaValue}>{foodProfileLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeading action={preferenceStatus === "ready" ? "Edit" : undefined} eyebrow="YOUR FLAVOUR DNA" onPress={openPreferenceEditor} title="How you like to eat" />
            {preferenceStatus === "ready" ? (
              <>
                <View style={styles.previewNote}>
                  <Ionicons name="checkmark-circle" color={COLORS.green} size={17} />
                  <Text style={styles.previewNoteText}>Loaded from your saved Nomue food profile.</Text>
                </View>
                <View style={styles.tastePanel}>
                  {tasteLevels.map((taste) => <TasteLevel key={taste.label} {...taste} />)}
                </View>
              </>
            ) : null}
            {preferenceStatus === "loading" ? (
              <View style={styles.preferenceState}>
                <ActivityIndicator color={COLORS.red} />
                <Text style={styles.preferenceStateTitle}>Loading your flavour profile</Text>
              </View>
            ) : null}
            {preferenceStatus === "missing" ? (
              <View style={styles.preferenceState}>
                <Ionicons name="restaurant-outline" color={COLORS.foreground} size={25} />
                <Text style={styles.preferenceStateTitle}>No food profile yet</Text>
                <Text style={styles.preferenceStateBody}>Your preferences will appear here after they are saved.</Text>
              </View>
            ) : null}
            {preferenceStatus === "error" ? (
              <View style={styles.preferenceState}>
                <Ionicons name="cloud-offline-outline" color={COLORS.foreground} size={25} />
                <Text style={styles.preferenceStateTitle}>Couldn’t load your preferences</Text>
                <Text style={styles.preferenceStateBody}>{preferenceError}</Text>
                <Pressable accessibilityRole="button" onPress={() => {
                  setPreferenceStatus("loading");
                  setPreferenceError(null);
                  setPreferenceRequestKey((value) => value + 1);
                }} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {preferences && preferenceStatus === "ready" ? (
            <View style={styles.section}>
              <SectionHeading eyebrow="THE IMPORTANT BITS" title="Your dining compass" />
              <View style={styles.preferenceGrid}>
                <PreferenceCard color="#f8dfd4" icon="wallet-outline" label="MEAL BUDGET" value={budgetLabel(preferences.max_price)} />
                <PreferenceCard color="#dff1e5" icon="leaf-outline" label="DIET" value={dietLabel(preferences)} />
                <PreferenceCard color="#f6e9b7" icon="remove-circle-outline" label="AVOID" value={avoidanceLabel(preferences)} />
                <PreferenceCard color="#e8dcf7" icon="alert-circle-outline" label="ALLERGIES" value={preferences.allergy_preference || "Not provided"} />
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeading eyebrow="SETTINGS" title="Make Nomue yours" />
            <View style={styles.settingsList}>
              {settingRows.map((item) => (
                <SettingRow
                  key={item.label}
                  {...item}
                  onPress={item.label === "Food preferences" ? openPreferenceEditor : () => previewAction(item.label)}
                />
              ))}
            </View>
          </View>

          {message ? (
            <View style={styles.messageBox}>
              <Ionicons name="information-circle-outline" color={COLORS.foreground} size={19} />
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable accessibilityRole="button" disabled={loading} onPress={() => void handleSignOut()} style={({ pressed }) => [styles.signOutButton, (loading || pressed) && styles.dimmed]}>
            {loading ? <ActivityIndicator color={COLORS.foreground} /> : (
              <>
                <Ionicons name="log-out-outline" color={COLORS.foreground} size={20} />
                <Text style={styles.signOutText}>Sign out</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.version}>NOMUE · MADE FOR CURIOUS EATERS</Text>
        </ScrollView>
      </SafeAreaView>
      <PreferenceEditor
        draft={preferenceDraftState}
        error={savePreferenceError}
        onCancel={closePreferenceEditor}
        onChange={(update) => setPreferenceDraftState((current) => current ? { ...current, ...update } : current)}
        onSave={() => void handleSavePreferences()}
        saving={savingPreferences}
        visible={editorVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: COLORS.background, flex: 1 },
  safeArea: { flex: 1 },
  content: { gap: 34, paddingBottom: 130, paddingHorizontal: 20, paddingTop: 12 },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kicker: { color: "#766e67", fontFamily: "normal-bold", fontSize: 12, letterSpacing: 1.5 },
  heading: { color: COLORS.foreground, fontFamily: "spec-font", fontSize: 52, lineHeight: 54 },
  settingsMark: { alignItems: "center", backgroundColor: COLORS.yellow, borderColor: COLORS.foreground, borderRadius: 99, borderWidth: 1, height: 46, justifyContent: "center", transform: [{ rotate: "7deg" }], width: 46 },
  profileCard: { backgroundColor: COLORS.foreground, borderRadius: 30, minHeight: 330, overflow: "hidden", padding: 22 },
  profileShapeLarge: { backgroundColor: COLORS.red, borderRadius: 999, height: 190, position: "absolute", right: -45, top: -65, transform: [{ rotate: "-15deg" }], width: 190 },
  profileShapeSmall: { backgroundColor: COLORS.purple, borderRadius: 30, bottom: 48, height: 92, position: "absolute", right: 16, transform: [{ rotate: "24deg" }], width: 62 },
  avatar: { alignItems: "center", backgroundColor: COLORS.yellow, borderColor: COLORS.background, borderRadius: 22, borderWidth: 2, height: 72, justifyContent: "center", transform: [{ rotate: "-4deg" }], width: 72 },
  avatarText: { color: COLORS.foreground, fontFamily: "spec-font", fontSize: 34 },
  profileCopy: { gap: 6, marginTop: 23, maxWidth: "78%" },
  statusPill: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.13)", borderRadius: 99, flexDirection: "row", gap: 7, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { backgroundColor: COLORS.green, borderRadius: 99, height: 7, width: 7 },
  statusText: { color: COLORS.background, fontFamily: "normal-bold", fontSize: 10, letterSpacing: 1 },
  profileName: { color: COLORS.background, fontFamily: "spec-font", fontSize: 38, lineHeight: 39 },
  email: { color: "#cfc7c0", fontFamily: "normal-font", fontSize: 14 },
  profileFooter: { alignItems: "center", borderTopColor: "#3d3b39", borderTopWidth: 1, bottom: 20, flexDirection: "row", gap: 20, left: 22, paddingTop: 15, position: "absolute", right: 22 },
  profileMetaLabel: { color: "#928b85", fontFamily: "normal-bold", fontSize: 9, letterSpacing: 1.2 },
  profileMetaValue: { color: COLORS.background, fontFamily: "normal-bold", fontSize: 14, marginTop: 3 },
  profileDivider: { backgroundColor: "#3d3b39", height: 30, width: 1 },
  section: { gap: 15 },
  sectionHeading: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  sectionHeadingCopy: { flex: 1, gap: 3 },
  eyebrow: { color: "#8e443f", fontFamily: "normal-bold", fontSize: 11, letterSpacing: 1.3 },
  sectionTitle: { color: COLORS.foreground, fontFamily: "spec-font", fontSize: 31, lineHeight: 33 },
  sectionAction: { color: COLORS.foreground, fontFamily: "normal-bold", fontSize: 14, textDecorationLine: "underline" },
  previewNote: { alignItems: "center", backgroundColor: "#f1eae4", borderRadius: 14, flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  previewNoteText: { color: "#625b55", flex: 1, fontFamily: "normal-font", fontSize: 12, lineHeight: 17 },
  preferenceState: { alignItems: "center", backgroundColor: "#fff", borderColor: "#ddd5cf", borderRadius: 24, borderWidth: 1, gap: 8, minHeight: 150, justifyContent: "center", padding: 22 },
  preferenceStateTitle: { color: COLORS.foreground, fontFamily: "normal-bold", fontSize: 16, textAlign: "center" },
  preferenceStateBody: { color: "#736b64", fontFamily: "normal-font", fontSize: 13, lineHeight: 19, textAlign: "center" },
  retryButton: { backgroundColor: COLORS.yellow, borderColor: COLORS.foreground, borderRadius: 99, borderWidth: 1, marginTop: 5, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: COLORS.foreground, fontFamily: "normal-bold", fontSize: 13 },
  tastePanel: { backgroundColor: "#fff", borderColor: "#ddd5cf", borderRadius: 24, borderWidth: 1, gap: 18, padding: 18 },
  tasteItem: { alignItems: "center", flexDirection: "row", gap: 13 },
  tasteIcon: { alignItems: "center", borderRadius: 13, height: 40, justifyContent: "center", transform: [{ rotate: "-3deg" }], width: 40 },
  tasteCopy: { flex: 1, gap: 7 },
  tasteMeta: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  tasteLabel: { color: COLORS.foreground, fontFamily: "normal-bold", fontSize: 15 },
  tasteScore: { color: "#6d655f", fontFamily: "normal-bold", fontSize: 12 },
  meter: { flexDirection: "row", gap: 5 },
  meterSegment: { backgroundColor: "#e8e1dc", borderRadius: 99, flex: 1, height: 7 },
  preferenceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  preferenceCard: { borderColor: COLORS.foreground, borderRadius: 20, borderWidth: 1, flexBasis: "47%", flexGrow: 1, minHeight: 128, padding: 15 },
  preferenceLabel: { color: "#625b55", fontFamily: "normal-bold", fontSize: 9, letterSpacing: 1, marginTop: 17 },
  preferenceValue: { color: COLORS.foreground, fontFamily: "spec-font", fontSize: 23, lineHeight: 25, marginTop: 3 },
  settingsList: { backgroundColor: "#fff", borderColor: "#ddd5cf", borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  settingRow: { alignItems: "center", borderBottomColor: "#ebe5e0", borderBottomWidth: 1, flexDirection: "row", minHeight: 77, paddingHorizontal: 14, paddingVertical: 12 },
  rowPressed: { backgroundColor: "#f5efea" },
  settingIcon: { alignItems: "center", backgroundColor: "#f1eae4", borderRadius: 13, height: 43, justifyContent: "center", width: 43 },
  settingCopy: { flex: 1, gap: 2, marginHorizontal: 12 },
  settingLabel: { color: COLORS.foreground, fontFamily: "normal-bold", fontSize: 16 },
  settingDescription: { color: "#736b64", fontFamily: "normal-font", fontSize: 12, lineHeight: 17 },
  messageBox: { alignItems: "flex-start", backgroundColor: "#e8dcf7", borderColor: COLORS.foreground, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 9, padding: 13 },
  messageText: { color: COLORS.foreground, flex: 1, fontFamily: "normal-font", fontSize: 13, lineHeight: 18 },
  error: { color: "#a62530", fontFamily: "normal-font", textAlign: "center" },
  signOutButton: { alignItems: "center", borderColor: COLORS.foreground, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 54 },
  signOutText: { color: COLORS.foreground, fontFamily: "normal-bold", fontSize: 16 },
  dimmed: { opacity: 0.55 },
  pressed: { opacity: 0.6 },
  version: { color: "#8a817a", fontFamily: "normal-bold", fontSize: 10, letterSpacing: 1.1, textAlign: "center" },
  editorPage: { backgroundColor: COLORS.background, flex: 1 },
  editorSafeArea: { flex: 1 },
  editorHeader: { alignItems: "center", borderBottomColor: "#ddd5cf", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 58, paddingHorizontal: 20 },
  editorCancel: { color: "#625b55", fontFamily: "normal-bold", fontSize: 14 },
  editorHeaderTitle: { color: COLORS.foreground, fontFamily: "normal-bold", fontSize: 12, letterSpacing: 1.3 },
  editorSave: { color: "#8e443f", fontFamily: "normal-bold", fontSize: 14 },
  editorContent: { gap: 28, paddingBottom: 44, paddingHorizontal: 20, paddingTop: 25 },
  editorEyebrow: { color: "#8e443f", fontFamily: "normal-bold", fontSize: 11, letterSpacing: 1.3 },
  editorTitle: { color: COLORS.foreground, fontFamily: "spec-font", fontSize: 43, lineHeight: 45, marginTop: 4 },
  editorIntro: { color: "#625b55", fontFamily: "normal-font", fontSize: 14, lineHeight: 20, marginTop: 8, maxWidth: 330 },
  editorGroup: { gap: 11 },
  editorGroupTitle: { color: "#766e67", fontFamily: "normal-bold", fontSize: 10, letterSpacing: 1.3 },
  levelList: { backgroundColor: "#fff", borderColor: "#ddd5cf", borderRadius: 24, borderWidth: 1, gap: 21, padding: 17 },
  levelEditor: { gap: 9 },
  levelEditorHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  levelEditorLabel: { color: COLORS.foreground, fontFamily: "normal-bold", fontSize: 15 },
  levelEditorValue: { color: "#6d655f", fontFamily: "normal-bold", fontSize: 12 },
  levelOptions: { flexDirection: "row", gap: 7 },
  levelOption: { alignItems: "center", backgroundColor: "#f1eae4", borderColor: "transparent", borderRadius: 12, borderWidth: 1, flex: 1, height: 40, justifyContent: "center" },
  levelOptionText: { color: "#6d655f", fontFamily: "normal-bold", fontSize: 13 },
  levelOptionTextActive: { color: COLORS.foreground },
  toggleList: { backgroundColor: "#fff", borderColor: "#ddd5cf", borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  toggleRow: { alignItems: "center", borderBottomColor: "#ebe5e0", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 59, paddingHorizontal: 16 },
  toggleRowActive: { backgroundColor: "#faf7f4" },
  toggleLabel: { color: COLORS.foreground, fontFamily: "normal-bold", fontSize: 15 },
  toggleTrack: { backgroundColor: "#d8d0ca", borderRadius: 99, height: 28, padding: 3, width: 48 },
  toggleTrackActive: { backgroundColor: COLORS.green },
  toggleThumb: { backgroundColor: "#fff", borderRadius: 99, height: 22, width: 22 },
  toggleThumbActive: { transform: [{ translateX: 20 }] },
  allergyInput: { backgroundColor: "#fff", borderColor: "#ddd5cf", borderRadius: 20, borderWidth: 1, color: COLORS.foreground, fontFamily: "normal-font", fontSize: 15, lineHeight: 21, minHeight: 112, padding: 15 },
  budgetNotice: { alignItems: "flex-start", backgroundColor: "#f6e9b7", borderColor: COLORS.foreground, borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 11, padding: 15 },
  budgetNoticeCopy: { flex: 1, gap: 3 },
  budgetNoticeTitle: { color: COLORS.foreground, fontFamily: "normal-bold", fontSize: 14 },
  budgetNoticeText: { color: "#625b55", fontFamily: "normal-font", fontSize: 12, lineHeight: 17 },
  editorError: { color: "#a62530", fontFamily: "normal-font", fontSize: 13, textAlign: "center" },
  saveButton: { alignItems: "center", backgroundColor: COLORS.foreground, borderRadius: 99, justifyContent: "center", minHeight: 56 },
  saveButtonText: { color: COLORS.background, fontFamily: "normal-bold", fontSize: 16 },
});
