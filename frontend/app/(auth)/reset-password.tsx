import {
  AuthButton,
  AuthField,
  AuthMessage,
  AuthScreen,
  authStyles,
} from "@/components/auth/AuthScreen";
import { useAuth } from "@/providers/AuthProvider";
import { getAuthErrorMessage } from "@/services/auth";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    error_description?: string | string[];
  }>();
  const {
    changePassword,
    exchangePasswordRecoveryCode,
    isRecoveryCodeExchanged,
  } = useAuth();
  const attemptedCode = useRef<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const callbackError = first(params.error_description);
  const code = first(params.code);
  const parameterError = callbackError
    ? callbackError
    : !code && !isRecoveryCodeExchanged
      ? "This recovery link is incomplete or has expired."
      : null;
  const linkReady = isRecoveryCodeExchanged;
  const error = parameterError ?? actionError;

  useEffect(() => {
    if (!code || parameterError || linkReady || attemptedCode.current === code) {
      return;
    }
    attemptedCode.current = code;

    void exchangePasswordRecoveryCode(code).catch((exchangeError) => {
      setActionError(getAuthErrorMessage(exchangeError));
    });
  }, [code, exchangePasswordRecoveryCode, linkReady, parameterError]);

  async function savePassword() {
    setActionError(null);
    if (password.length < 10) {
      setActionError("Use at least 10 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setActionError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(password);
    } catch (passwordError) {
      setActionError(getAuthErrorMessage(passwordError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      title="Choose a new password"
      subtitle="Your recovery link is single-use. Set a strong password you don’t use elsewhere."
    >
      {error ? <AuthMessage>{error}</AuthMessage> : null}
      {!linkReady && !error ? <ActivityIndicator size="large" /> : null}
      {linkReady ? (
        <>
          <AuthField
            autoCapitalize="none"
            autoComplete="new-password"
            label="New password"
            onChangeText={setPassword}
            placeholder="At least 10 characters"
            secureTextEntry
            textContentType="newPassword"
            value={password}
          />
          <AuthField
            autoCapitalize="none"
            autoComplete="new-password"
            label="Confirm new password"
            onChangeText={setConfirmPassword}
            placeholder="Enter it again"
            secureTextEntry
            textContentType="newPassword"
            value={confirmPassword}
          />
          <View style={authStyles.actions}>
            <AuthButton
              label="Update password"
              loading={loading}
              onPress={() => void savePassword()}
            />
          </View>
        </>
      ) : null}
      {error && !linkReady ? (
        <View style={authStyles.actions}>
          <AuthButton
            label="Request another link"
            onPress={() => router.replace("/(auth)/forgot-password")}
            variant="secondary"
          />
        </View>
      ) : null}
    </AuthScreen>
  );
}
