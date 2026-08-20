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

export default function SignInScreen() {
  const { signIn, signInGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(method: "email" | "google") {
    setError(null);
    setPending(method);
    try {
      if (method === "google") {
        await signInGoogle();
      } else {
        if (!email.trim() || !password) {
          throw new Error("Enter your email and password.");
        }
        await signIn(email, password);
      }
    } catch (signInError) {
      setError(getAuthErrorMessage(signInError));
    } finally {
      setPending(null);
    }
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to keep your saved tastes and recommendations with you."
    >
      {error ? <AuthMessage>{error}</AuthMessage> : null}
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
        autoComplete="current-password"
        label="Password"
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        textContentType="password"
        value={password}
      />
      <View style={authStyles.linkRow}>
        <View />
        <AuthLink
          label="Forgot password?"
          onPress={() => router.push("/(auth)/forgot-password")}
        />
      </View>
      <View style={authStyles.actions}>
        <AuthButton
          label="Sign in"
          loading={pending === "email"}
          disabled={pending !== null}
          onPress={() => void run("email")}
        />
        <AuthButton
          label="Continue with Google"
          loading={pending === "google"}
          disabled={pending !== null}
          onPress={() => void run("google")}
          variant="secondary"
        />
        {/* Apple sign-in is intentionally disabled until the Apple Developer
            Program and Supabase Apple provider are configured. */}
        {/* <AppleSignInButton disabled={pending !== null} /> */}
      </View>
      <View style={authStyles.centeredRow}>
        <Text style={authStyles.helper}>New to Nomue?</Text>
        <AuthLink
          label="Create an account"
          onPress={() => router.replace("/(auth)/sign-up")}
        />
      </View>
    </AuthScreen>
  );
}
