import { COLORS } from "@/constants/colors";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AuthScreen({ title, subtitle, children }: AuthScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.brand}>NOMUE</Text>
          <View style={styles.headingBlock}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type AuthFieldProps = TextInputProps & {
  label: string;
};

export function AuthField({ label, ...props }: AuthFieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#77716d"
        selectionColor={COLORS.red}
        style={styles.input}
      />
    </View>
  );
}

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

export function AuthButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: AuthButtonProps) {
  const blocked = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" ? styles.secondaryButton : styles.primaryButton,
        blocked && styles.disabled,
        pressed && !blocked && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" ? COLORS.background : COLORS.foreground}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" && styles.secondaryButtonText,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function AuthMessage({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success" | "neutral";
}) {
  return (
    <View
      style={[
        styles.message,
        tone === "error" && styles.errorMessage,
        tone === "success" && styles.successMessage,
      ]}
    >
      <Text style={styles.messageText}>{children}</Text>
    </View>
  );
}

export function AuthLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

export const authStyles = StyleSheet.create({
  actions: { gap: 12, marginTop: 8 },
  centeredRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 22,
  },
  helper: {
    color: "#59534f",
    fontFamily: "normal-font",
    fontSize: 15,
    lineHeight: 21,
  },
  linkRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: COLORS.background, flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  brand: {
    color: COLORS.foreground,
    fontFamily: "spec-36",
    fontSize: 58,
    letterSpacing: 1,
    marginBottom: 26,
  },
  headingBlock: { gap: 8, marginBottom: 26 },
  title: {
    color: COLORS.foreground,
    fontFamily: "spec-36",
    fontSize: 42,
    lineHeight: 44,
  },
  subtitle: {
    color: "#59534f",
    fontFamily: "normal-font",
    fontSize: 17,
    lineHeight: 24,
  },
  fieldBlock: { gap: 7, marginBottom: 16 },
  label: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderColor: COLORS.foreground,
    borderRadius: 16,
    borderWidth: 1,
    color: COLORS.foreground,
    fontFamily: "normal-font",
    fontSize: 17,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  button: {
    alignItems: "center",
    borderColor: COLORS.foreground,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 20,
  },
  primaryButton: { backgroundColor: COLORS.foreground },
  secondaryButton: { backgroundColor: COLORS.background },
  buttonText: {
    color: COLORS.background,
    fontFamily: "normal-bold",
    fontSize: 18,
  },
  secondaryButtonText: { color: COLORS.foreground },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.72 },
  message: {
    backgroundColor: "#f1eeeb",
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
  },
  errorMessage: { backgroundColor: "#ffe8e9" },
  successMessage: { backgroundColor: "#e5f7ed" },
  messageText: {
    color: COLORS.foreground,
    fontFamily: "normal-font",
    fontSize: 15,
    lineHeight: 21,
  },
  link: {
    color: COLORS.foreground,
    fontFamily: "normal-bold",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
