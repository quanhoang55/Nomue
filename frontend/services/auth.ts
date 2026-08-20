import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export type UserProfile = {
  id: string;
  username: string | null;
  email: string | null;
  display_name: string;
  country_code: string | null;
  preferred_language: string;
  status: string;
};

export type SignUpResult = {
  needsEmailConfirmation: boolean;
};

export class AuthCancelledError extends Error {
  constructor() {
    super("Authentication was cancelled");
    this.name = "AuthCancelledError";
  }
}

export function createAuthRedirectUrl(path = "callback") {
  return Linking.createURL(path, { scheme: "nomue" });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: createAuthRedirectUrl(),
      data: { display_name: displayName.trim() },
    },
  });
  if (error) throw error;
  return { needsEmailConfirmation: data.session === null };
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: createAuthRedirectUrl() },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: createAuthRedirectUrl("reset-password") },
  );
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function exchangeAuthCode(code: string): Promise<Session> {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return data.session;
}

export async function exchangeAuthCodeFromUrl(url: string): Promise<Session> {
  const parsed = Linking.parse(url);
  const code = parsed.queryParams?.code;
  const errorDescription = parsed.queryParams?.error_description;

  if (typeof errorDescription === "string") {
    throw new Error(errorDescription);
  }
  if (typeof code !== "string" || !code) {
    throw new Error("The authentication callback is missing its code");
  }

  return exchangeAuthCode(code);
}

export async function signInWithGoogle() {
  const redirectTo = createAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Google sign-in could not be started");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    throw new AuthCancelledError();
  }
  await exchangeAuthCodeFromUrl(result.url);
}

export function bootstrapProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/bootstrap", {
    method: "POST",
    auth: "required",
  });
}

export async function signOutFromSupabase() {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthCancelledError) {
    return "Sign-in was cancelled.";
  }
  if (!(error instanceof Error)) {
    return "Authentication is temporarily unavailable.";
  }

  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirm your email before signing in.";
  }
  if (message.includes("password")) {
    return error.message;
  }
  if (message.includes("rate") || message.includes("too many")) {
    return "Too many attempts. Please wait and try again.";
  }
  return error.message || "Authentication is temporarily unavailable.";
}
