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
import { View } from "react-native";

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (resetError) {
      setError(getAuthErrorMessage(resetError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      title="Reset your password"
      subtitle="We’ll email you a secure link to choose a new password."
    >
      {error ? <AuthMessage>{error}</AuthMessage> : null}
      {sent ? (
        <AuthMessage tone="success">
          If an account exists for that email, a recovery link is on its way.
        </AuthMessage>
      ) : null}
      <AuthField
        autoCapitalize="none"
        autoComplete="email"
        editable={!sent}
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="you@example.com"
        textContentType="emailAddress"
        value={email}
      />
      <View style={authStyles.actions}>
        <AuthButton
          label={sent ? "Email sent" : "Send recovery link"}
          loading={loading}
          disabled={sent}
          onPress={() => void sendLink()}
        />
        <AuthButton
          label="Back to sign in"
          onPress={() => router.replace("/(auth)/sign-in")}
          variant="secondary"
        />
      </View>
      {sent ? (
        <View style={authStyles.centeredRow}>
          <AuthLink
            label="Use another email"
            onPress={() => setSent(false)}
          />
        </View>
      ) : null}
    </AuthScreen>
  );
}
