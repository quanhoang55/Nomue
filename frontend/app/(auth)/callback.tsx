import {
  AuthButton,
  AuthMessage,
  AuthScreen,
  authStyles,
} from "@/components/auth/AuthScreen";
import { exchangeAuthCode, getAuthErrorMessage } from "@/services/auth";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string | string[];
    error_description?: string | string[];
  }>();
  const attempted = useRef(false);
  const callbackError = first(params.error_description);
  const code = first(params.code);
  const parameterError = callbackError
    ? callbackError
    : !code
      ? "This sign-in link is incomplete or has expired."
      : null;
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const error = parameterError ?? exchangeError;

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!code || parameterError) return;

    void exchangeAuthCode(code).catch((exchangeError) => {
      setExchangeError(getAuthErrorMessage(exchangeError));
    });
  }, [code, parameterError]);

  return (
    <AuthScreen
      title={error ? "Unable to sign in" : "Finishing sign in"}
      subtitle={error ? undefined : "Securely connecting your Nomue account…"}
    >
      {error ? (
        <>
          <AuthMessage>{error}</AuthMessage>
          <View style={authStyles.actions}>
            <AuthButton
              label="Back to sign in"
              onPress={() => router.replace("/(auth)/sign-in")}
            />
          </View>
        </>
      ) : (
        <ActivityIndicator size="large" />
      )}
    </AuthScreen>
  );
}
