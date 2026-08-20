import {
  AuthButton,
  AuthLink,
  AuthMessage,
  AuthScreen,
  authStyles,
} from "@/components/auth/AuthScreen";
import { useAuth } from "@/providers/AuthProvider";
import { getAuthErrorMessage } from "@/services/auth";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const { resendEmailConfirmation } = useAuth();
  const email = first(params.email) ?? "your email address";
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  async function resend() {
    if (email === "your email address") {
      setError("Return to sign up and enter your email again.");
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await resendEmailConfirmation(email);
      setSecondsRemaining(60);
      setMessage("A new confirmation email was sent.");
    } catch (resendError) {
      setError(getAuthErrorMessage(resendError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      title="Check your email"
      subtitle={`We sent a confirmation link to ${email}. Open it on this device to finish creating your account.`}
    >
      {error ? <AuthMessage>{error}</AuthMessage> : null}
      {message ? <AuthMessage tone="success">{message}</AuthMessage> : null}
      <View style={authStyles.actions}>
        <AuthButton
          label={
            secondsRemaining > 0
              ? `Resend in ${secondsRemaining}s`
              : "Resend confirmation email"
          }
          loading={loading}
          disabled={secondsRemaining > 0}
          onPress={() => void resend()}
          variant="secondary"
        />
        <AuthButton
          label="I’ve confirmed my email"
          onPress={() => router.replace("/(auth)/sign-in")}
        />
      </View>
      <View style={authStyles.centeredRow}>
        <Text style={authStyles.helper}>Wrong email?</Text>
        <AuthLink
          label="Create account again"
          onPress={() => router.replace("/(auth)/sign-up")}
        />
      </View>
    </AuthScreen>
  );
}
