import { COLORS } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TOTAL_STEPS = 5;
const dietaryOptions = [
  ["vegetarian", "Vegetarian", "leaf-outline"],
  ["vegan", "Vegan", "flower-outline"],
  ["halal", "Halal", "moon-outline"],
  ["no_pork", "No pork", "remove-circle-outline"],
  ["no_beef", "No beef", "remove-circle-outline"],
  ["no_seafood", "No seafood", "fish-outline"],
] as const;
const tasteLevels = [
  [0, "Not for me"],
  [2, "A little"],
  [4, "Love it"],
  [5, "More, please"],
] as const;
const adventureOptions = [
  [
    0,
    "shield-checkmark-outline",
    "Keep it familiar",
    "Recognizable ingredients and comforting dishes",
  ],
  [
    2,
    "compass-outline",
    "A little curious",
    "Local favorites with a gentle introduction",
  ],
  [
    4,
    "sparkles-outline",
    "Surprise me",
    "Bold flavors and interesting new textures",
  ],
  [
    5,
    "flame-outline",
    "Anything goes",
    "The most adventurous local specialties",
  ],
] as const;
const budgets = [100_000, 200_000, 350_000, 500_000] as const;

type DietaryOption = (typeof dietaryOptions)[number][0];
type AllergyChoice = "none" | "has_allergies" | null;
type IconName = React.ComponentProps<typeof Ionicons>["name"];

function feedback() {
  if (Platform.OS !== "web") void Haptics.selectionAsync();
}

function Check({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.check, selected && styles.checkSelected]}>
      {selected ? (
        <Ionicons name="checkmark" color={COLORS.background} size={16} />
      ) : null}
    </View>
  );
}

function Heading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.heading}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function ChoiceRow({
  description,
  icon,
  label,
  onPress,
  selected,
}: {
  description?: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceRow,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.choiceIcon}>
        <Ionicons name={icon} color={COLORS.foreground} size={24} />
      </View>
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceLabel}>{label}</Text>
        {description ? (
          <Text style={styles.choiceDescription}>{description}</Text>
        ) : null}
      </View>
      <Check selected={selected} />
    </Pressable>
  );
}

function DietaryStep({
  selected,
  toggle,
}: {
  selected: DietaryOption[];
  toggle: (id: DietaryOption) => void;
}) {
  return (
    <View style={styles.step}>
      <Heading
        eyebrow="YOUR FOOD, YOUR RULES"
        title="Anything you don’t eat?"
        subtitle="Choose all that apply. We’ll keep these in mind whenever we recommend a dish."
      />
      <View style={styles.grid}>
        {dietaryOptions.map(([id, label, icon]) => {
          const active = selected.includes(id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              key={id}
              onPress={() => toggle(id)}
              style={({ pressed }) => [
                styles.dietCard,
                active && styles.selected,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.smallIcon}>
                <Ionicons name={icon} size={22} />
              </View>
              <Text style={styles.dietLabel}>{label}</Text>
              <Check selected={active} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={20} color="#625b55" />
        <Text style={styles.noteText}>
          No restrictions? Just continue—you can change this later.
        </Text>
      </View>
    </View>
  );
}

function AllergyStep({
  choice,
  details,
  choose,
  setDetails,
}: {
  choice: AllergyChoice;
  details: string;
  choose: (choice: Exclude<AllergyChoice, null>) => void;
  setDetails: (text: string) => void;
}) {
  return (
    <View style={styles.step}>
      <Heading
        eyebrow="A QUICK SAFETY CHECK"
        title="Any food allergies?"
        subtitle="Tell us what to avoid so we can make safer suggestions."
      />
      <View style={styles.stack}>
        <ChoiceRow
          icon="checkmark-circle-outline"
          label="No known food allergies"
          onPress={() => choose("none")}
          selected={choice === "none"}
        />
        <ChoiceRow
          icon="alert-circle-outline"
          label="Yes, I have allergies"
          onPress={() => choose("has_allergies")}
          selected={choice === "has_allergies"}
        />
      </View>
      {choice === "has_allergies" ? (
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>What should we avoid?</Text>
          <TextInput
            accessibilityLabel="Food allergies"
            autoFocus
            multiline
            onChangeText={setDetails}
            placeholder="For example: peanuts, shellfish, sesame…"
            placeholderTextColor="#817972"
            selectionColor={COLORS.red}
            style={styles.textArea}
            textAlignVertical="top"
            value={details}
          />
          <Text style={styles.safetyText}>
            Always confirm ingredients with the restaurant—recipes can vary.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function TasteSelector({
  icon,
  label,
  value,
  change,
}: {
  icon: IconName;
  label: string;
  value: number;
  change: (value: number) => void;
}) {
  return (
    <View style={styles.tasteCard}>
      <View style={styles.tasteHeading}>
        <View style={styles.tasteName}>
          <Ionicons name={icon} size={21} />
          <Text style={styles.tasteLabel}>{label}</Text>
        </View>
        <Text style={styles.tasteValue}>
          {tasteLevels.find(([level]) => level === value)?.[1]}
        </Text>
      </View>
      <View accessibilityRole="radiogroup" style={styles.levelRow}>
        {tasteLevels.map(([level, name]) => {
          const active = level === value;
          return (
            <Pressable
              accessibilityLabel={`${label}: ${name}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              key={level}
              onPress={() => change(level)}
              style={({ pressed }) => [
                styles.level,
                active && styles.levelActive,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.dot, active && styles.dotActive]} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.levelLabels}>
        <Text style={styles.edge}>Less</Text>
        <Text style={styles.edge}>More</Text>
      </View>
    </View>
  );
}

function TasteStep({
  tastes,
  change,
}: {
  tastes: { spice: number; sweet: number; sour: number };
  change: (taste: "spice" | "sweet" | "sour", value: number) => void;
}) {
  return (
    <View style={styles.step}>
      <Heading
        eyebrow="TUNE YOUR TASTE"
        title="Which flavors make you happy?"
        subtitle="There are no wrong answers. Pick what sounds good today."
      />
      <View style={styles.stack}>
        <TasteSelector
          icon="flame-outline"
          label="Spicy"
          value={tastes.spice}
          change={(value) => change("spice", value)}
        />
        <TasteSelector
          icon="ice-cream-outline"
          label="Sweet"
          value={tastes.sweet}
          change={(value) => change("sweet", value)}
        />
        <TasteSelector
          icon="water-outline"
          label="Sour"
          value={tastes.sour}
          change={(value) => change("sour", value)}
        />
      </View>
    </View>
  );
}

function AdventureStep({
  value,
  change,
}: {
  value: number | null;
  change: (value: number) => void;
}) {
  return (
    <View style={styles.step}>
      <Heading
        eyebrow="YOUR COMFORT ZONE"
        title="How adventurous are you?"
        subtitle="We’ll balance must-try local food with what feels right for you."
      />
      <View style={styles.stack}>
        {adventureOptions.map(([level, icon, label, description]) => (
          <ChoiceRow
            description={description}
            icon={icon}
            key={level}
            label={label}
            onPress={() => change(level)}
            selected={value === level}
          />
        ))}
      </View>
    </View>
  );
}

function BudgetStep({
  value,
  change,
}: {
  value: number | "no_limit" | null;
  change: (value: number | "no_limit") => void;
}) {
  return (
    <View style={styles.step}>
      <Heading
        eyebrow="ONE LAST THING"
        title="What feels comfortable for one meal?"
        subtitle="Pick a rough maximum per person. Prices can vary by restaurant."
      />
      <View style={styles.grid}>
        {budgets.map((budget) => {
          const active = value === budget;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              key={budget}
              onPress={() => change(budget)}
              style={({ pressed }) => [
                styles.budgetCard,
                active && styles.budgetActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[styles.budgetAmount, active && styles.budgetTextActive]}
              >
                {budget / 1_000}k ₫
              </Text>
              <Text
                style={[
                  styles.budgetCaption,
                  active && styles.budgetTextActive,
                ]}
              >
                per person
              </Text>
            </Pressable>
          );
        })}
      </View>
      <ChoiceRow
        description="Show me the best matches"
        icon="infinite-outline"
        label="No budget preference"
        onPress={() => change("no_limit")}
        selected={value === "no_limit"}
      />
      <View style={styles.finishNote}>
        <Text style={styles.emoji}>🍜</Text>
        <Text style={styles.finishText}>
          That’s it. Your first recommendations are waiting.
        </Text>
      </View>
    </View>
  );
}

export default function NewUserQuestionsScreen() {
  const { isLogIn } = useAuth();
  const [step, setStep] = useState(0);
  const [dietary, setDietary] = useState<DietaryOption[]>([]);
  const [allergyChoice, setAllergyChoice] = useState<AllergyChoice>(null);
  const [allergyDetails, setAllergyDetails] = useState("");
  const [tastes, setTastes] = useState({ spice: 2, sweet: 2, sour: 2 });
  const [adventure, setAdventure] = useState<number | null>(null);
  const [budget, setBudget] = useState<number | "no_limit" | null>(null);

  const canContinue = useMemo(
    () =>
      step !== 1 ||
      allergyChoice === "none" ||
      (allergyChoice === "has_allergies" && allergyDetails.trim().length > 0),
    [allergyChoice, allergyDetails, step],
  );

  if (!isLogIn) return <Redirect href="/(auth)/sign-in" />;

  function back() {
    feedback();
    if (step === 0) router.back();
    else setStep((current) => current - 1);
  }

  function next() {
    if (!canContinue) return;
    feedback();
    if (step < TOTAL_STEPS - 1) setStep((current) => current + 1);
    else {
      if (Platform.OS !== "web")
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      router.replace("/(tabs)");
    }
  }

  function skip() {
    feedback();
    if (step < TOTAL_STEPS - 1) setStep((current) => current + 1);
    else router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={10}
            onPress={back}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="arrow-back" color={COLORS.foreground} size={24} />
          </Pressable>
          <Text style={styles.brand}>NOMUE</Text>
          <Text style={styles.stepCount}>
            {step + 1} of {TOTAL_STEPS}
          </Text>
        </View>
        <View
          accessibilityLabel={`Step ${step + 1} of ${TOTAL_STEPS}`}
          accessibilityRole="progressbar"
          style={styles.progress}
        >
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <View
              key={index}
              style={[styles.segment, index <= step && styles.segmentActive]}
            />
          ))}
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 ? (
            <DietaryStep
              selected={dietary}
              toggle={(id) => {
                feedback();
                setDietary((items) =>
                  items.includes(id)
                    ? items.filter((item) => item !== id)
                    : [...items, id],
                );
              }}
            />
          ) : null}
          {step === 1 ? (
            <AllergyStep
              choice={allergyChoice}
              details={allergyDetails}
              choose={(choice) => {
                feedback();
                setAllergyChoice(choice);
              }}
              setDetails={setAllergyDetails}
            />
          ) : null}
          {step === 2 ? (
            <TasteStep
              tastes={tastes}
              change={(taste, value) => {
                feedback();
                setTastes((current) => ({ ...current, [taste]: value }));
              }}
            />
          ) : null}
          {step === 3 ? (
            <AdventureStep
              value={adventure}
              change={(value) => {
                feedback();
                setAdventure(value);
              }}
            />
          ) : null}
          {step === 4 ? (
            <BudgetStep
              value={budget}
              change={(value) => {
                feedback();
                setBudget(value);
              }}
            />
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            disabled={!canContinue}
            onPress={next}
            style={({ pressed }) => [
              styles.primaryButton,
              !canContinue && styles.disabled,
              pressed && canContinue && styles.primaryPressed,
            ]}
          >
            <Text style={styles.primaryText}>
              {step === TOTAL_STEPS - 1 ? "Start exploring" : "Continue"}
            </Text>
            <Ionicons
              name={step === TOTAL_STEPS - 1 ? "sparkles" : "arrow-forward"}
              color={COLORS.background}
              size={20}
            />
          </Pressable>
          {step !== 1 ? (
            <Pressable
              hitSlop={8}
              onPress={skip}
              style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </Pressable>
          ) : (
            <Text style={styles.required}>Choose one to continue</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: COLORS.background, flex: 1 },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    alignItems: "center",
    borderColor: "#d9d2cc",
    borderRadius: 99,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  brand: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 25,
    letterSpacing: 0.6,
  },
  stepCount: {
    color: "#6b635d",
    fontFamily: "normal-bold",
    fontSize: 14,
    textAlign: "right",
    width: 42,
  },
  progress: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  segment: { backgroundColor: "#e8e2dc", borderRadius: 99, flex: 1, height: 5 },
  segmentActive: { backgroundColor: COLORS.red },
  content: {
    flexGrow: 1,
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  step: { gap: 24 },
  heading: { gap: 8 },
  eyebrow: {
    color: "#9d443f",
    fontFamily: "normal-bold",
    fontSize: 13,
    letterSpacing: 1.2,
  },
  title: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 43,
    lineHeight: 44,
  },
  subtitle: {
    color: "#625b55",
    fontFamily: "normal-font",
    fontSize: 17,
    lineHeight: 24,
    maxWidth: 520,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dietCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d9d2cc",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "47%",
    flexDirection: "row",
    flexGrow: 1,
    minHeight: 70,
    padding: 12,
  },
  selected: {
    backgroundColor: "#fff0eb",
    borderColor: COLORS.foreground,
    borderWidth: 1.5,
  },
  smallIcon: {
    alignItems: "center",
    backgroundColor: "#f3efeb",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  dietLabel: {
    color: COLORS.foreground,
    flex: 1,
    fontFamily: "normal-bold",
    fontSize: 15,
    marginLeft: 9,
  },
  check: {
    alignItems: "center",
    borderColor: "#aba39c",
    borderRadius: 99,
    borderWidth: 1.5,
    height: 23,
    justifyContent: "center",
    width: 23,
  },
  checkSelected: {
    backgroundColor: COLORS.foreground,
    borderColor: COLORS.foreground,
  },
  note: {
    alignItems: "flex-start",
    backgroundColor: "#f3efeb",
    borderRadius: 14,
    flexDirection: "row",
    gap: 9,
    padding: 13,
  },
  noteText: {
    color: "#625b55",
    flex: 1,
    fontFamily: "normal-font",
    fontSize: 14,
    lineHeight: 20,
  },
  stack: { gap: 11 },
  choiceRow: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#d9d2cc",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 72,
    padding: 14,
  },
  choiceIcon: {
    alignItems: "center",
    backgroundColor: "#f3efeb",
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  choiceCopy: { flex: 1, gap: 2, marginHorizontal: 12 },
  choiceLabel: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 17,
  },
  choiceDescription: {
    color: "#706861",
    fontFamily: "normal-font",
    fontSize: 14,
    lineHeight: 19,
  },
  fieldBlock: { gap: 7 },
  fieldLabel: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 16,
  },
  textArea: {
    backgroundColor: "#fff",
    borderColor: COLORS.foreground,
    borderRadius: 17,
    borderWidth: 1,
    color: COLORS.foreground,
    fontFamily: "normal-font",
    fontSize: 17,
    lineHeight: 23,
    minHeight: 108,
    padding: 15,
  },
  safetyText: {
    color: "#7a3d39",
    fontFamily: "normal-font",
    fontSize: 13,
    lineHeight: 18,
  },
  tasteCard: {
    backgroundColor: "#fff",
    borderColor: "#d9d2cc",
    borderRadius: 18,
    borderWidth: 1,
    gap: 15,
    padding: 16,
  },
  tasteHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tasteName: { alignItems: "center", flexDirection: "row", gap: 8 },
  tasteLabel: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 18,
  },
  tasteValue: { color: "#9d443f", fontFamily: "normal-bold", fontSize: 14 },
  levelRow: { flexDirection: "row", gap: 8 },
  level: {
    alignItems: "center",
    backgroundColor: "#f1ece8",
    borderRadius: 99,
    flex: 1,
    height: 18,
    justifyContent: "center",
  },
  levelActive: { backgroundColor: "#f5b1aa" },
  dot: { borderRadius: 99, height: 8, width: 8 },
  dotActive: { backgroundColor: COLORS.foreground },
  levelLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -9,
  },
  edge: { color: "#817972", fontFamily: "normal-font", fontSize: 12 },
  budgetCard: {
    backgroundColor: "#fff",
    borderColor: "#d9d2cc",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    padding: 18,
  },
  budgetActive: {
    backgroundColor: COLORS.foreground,
    borderColor: COLORS.foreground,
  },
  budgetAmount: {
    color: COLORS.foreground,
    fontFamily: "spec-font",
    fontSize: 29,
  },
  budgetCaption: { color: "#706861", fontFamily: "normal-font", fontSize: 13 },
  budgetTextActive: { color: COLORS.background },
  finishNote: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    padding: 8,
  },
  emoji: { fontSize: 29 },
  finishText: {
    color: "#625b55",
    flex: 1,
    fontFamily: "normal-font",
    fontSize: 15,
    lineHeight: 21,
  },
  footer: {
    backgroundColor: COLORS.background,
    borderTopColor: "#eee8e3",
    borderTopWidth: 1,
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: COLORS.foreground,
    borderRadius: 99,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 22,
  },
  primaryText: {
    color: COLORS.background,
    fontFamily: "normal-bold",
    fontSize: 18,
  },
  disabled: { opacity: 0.35 },
  primaryPressed: { transform: [{ scale: 0.985 }] },
  skip: { alignItems: "center", minHeight: 34, padding: 7 },
  skipText: {
    color: "#625b55",
    fontFamily: "normal-bold",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  required: {
    color: "#7c746e",
    fontFamily: "normal-font",
    fontSize: 13,
    minHeight: 34,
    padding: 7,
    textAlign: "center",
  },
  pressed: { opacity: 0.68 },
});
