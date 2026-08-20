import {
  AuthButton,
  AuthField,
  AuthLink,
  AuthMessage,
  AuthScreen,
  authStyles,
} from "@/components/auth/AuthScreen";
import { useAuth } from "@/providers/AuthProvider";
import { getAuthErrorMessage } from "@/services/auth";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

export default function SignUpScreen() {
  const { signInGoogle, signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createAccount() {
    setError(null);
    if (!displayName.trim() || !email.trim()) {
      setError("Enter your name and email.");
      return;
    }
    if (password.length < 10) {
      setError("Use at least 10 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setPending("email");
    try {
      const result = await signUp(email, password, displayName);
      if (result.needsEmailConfirmation) {
        router.replace({
          pathname: "/(auth)/verify-email",
          params: { email: email.trim().toLowerCase() },
        });
      }
    } catch (signUpError) {
      setError(getAuthErrorMessage(signUpError));
    } finally {
      setPending(null);
    }
  }

  async function continueWithGoogle() {
    setError(null);
    setPending("google");
    try {
      await signInGoogle();
    } catch (googleError) {
      setError(getAuthErrorMessage(googleError));
    } finally {
      setPending(null);
    }
  }

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Start with an account, then we’ll learn what kinds of food you enjoy."
    >
      {error ? <AuthMessage>{error}</AuthMessage> : null}
      <AuthField
        autoCapitalize="words"
        autoComplete="name"
        label="Name"
        onChangeText={setDisplayName}
        placeholder="How should we call you?"
        textContentType="name"
        value={displayName}
      />
      <AuthField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="you@example.com"
        textContentType="emailAddress"
        value={email}
      />
      <AuthField
        autoCapitalize="none"
        autoComplete="new-password"
        label="Password"
        onChangeText={setPassword}
        placeholder="At least 10 characters"
        secureTextEntry
        textContentType="newPassword"
        value={password}
      />
      <AuthField
        autoCapitalize="none"
        autoComplete="new-password"
        label="Confirm password"
        onChangeText={setConfirmPassword}
        placeholder="Enter it again"
        secureTextEntry
        textContentType="newPassword"
        value={confirmPassword}
      />
      <View style={authStyles.actions}>
        <AuthButton
          label="Create account"
          loading={pending === "email"}
          disabled={pending !== null}
          onPress={() => void createAccount()}
        />
        <AuthButton
          label="Continue with Google"
          loading={pending === "google"}
          disabled={pending !== null}
          onPress={() => void continueWithGoogle()}
          variant="secondary"
        />
        {/* <AppleSignInButton disabled={pending !== null} /> */}
      </View>
      <View style={authStyles.centeredRow}>
        <Text style={authStyles.helper}>Already have an account?</Text>
        <AuthLink
          label="Sign in"
          onPress={() => router.replace("/(auth)/sign-in")}
        />
      </View>
    </AuthScreen>
  );
}
