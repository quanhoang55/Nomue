import { supabase } from "@/lib/supabase";
import {
  bootstrapProfile,
  exchangeAuthCode,
  requestPasswordReset,
  resendConfirmation,
  signInWithEmail,
  signInWithGoogle,
  signOutFromSupabase,
  signUpWithEmail,
  updatePassword,
  type SignUpResult,
  type UserProfile,
} from "@/services/auth";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

type AuthStatus = "initializing" | "anonymous" | "authenticated" | "error";

type AuthContextType = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  error: string | null;
  isLogIn: boolean;
  isPasswordRecovery: boolean;
  isRecoveryCodeExchanged: boolean;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  resendEmailConfirmation: (email: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  exchangePasswordRecoveryCode: (code: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  retryProfileBootstrap: () => Promise<void>;
  continueWithoutAccount: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readableAuthError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to initialize authentication securely.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("initializing");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isRecoveryCodeExchanged, setIsRecoveryCodeExchanged] = useState(false);
  const isMounted = useRef(true);
  const recoveryMode = useRef(false);
  const recoveryAuthorizedUserId = useRef<string | null>(null);
  const observedRecoveryEventUserId = useRef<string | null>(null);
  const bootstrappedUserId = useRef<string | null>(null);
  const syncSequence = useRef(0);

  const clearRecoveryState = useCallback(() => {
    recoveryMode.current = false;
    recoveryAuthorizedUserId.current = null;
    observedRecoveryEventUserId.current = null;
    setIsPasswordRecovery(false);
    setIsRecoveryCodeExchanged(false);
  }, []);

  const resetToAnonymous = useCallback(() => {
    syncSequence.current += 1;
    bootstrappedUserId.current = null;
    recoveryMode.current = false;
    recoveryAuthorizedUserId.current = null;
    observedRecoveryEventUserId.current = null;
    setSession(null);
    setProfile(null);
    setError(null);
    setIsPasswordRecovery(false);
    setIsRecoveryCodeExchanged(false);
    setStatus("anonymous");
  }, []);

  const beginPasswordRecovery = useCallback(() => {
    syncSequence.current += 1;
    bootstrappedUserId.current = null;
    recoveryMode.current = true;
    recoveryAuthorizedUserId.current = null;
    observedRecoveryEventUserId.current = null;
    setSession(null);
    setProfile(null);
    setError(null);
    setIsPasswordRecovery(true);
    setIsRecoveryCodeExchanged(false);
    setStatus("anonymous");
  }, []);

  const bootstrapSession = useCallback(
    async (nextSession: Session | null) => {
      if (!nextSession) {
        resetToAnonymous();
        return;
      }

      if (recoveryMode.current) {
        setSession(nextSession);
        setStatus("anonymous");
        return;
      }

      if (bootstrappedUserId.current === nextSession.user.id) {
        setSession(nextSession);
        setError(null);
        setStatus("authenticated");
        return;
      }

      const sequence = ++syncSequence.current;
      setSession(nextSession);
      setError(null);
      setStatus("initializing");
      try {
        const nextProfile = await bootstrapProfile();
        if (isMounted.current && sequence === syncSequence.current) {
          bootstrappedUserId.current = nextSession.user.id;
          setProfile(nextProfile);
          setStatus("authenticated");
        }
      } catch (profileError) {
        if (isMounted.current && sequence === syncSequence.current) {
          bootstrappedUserId.current = null;
          setProfile(null);
          setError(readableAuthError(profileError));
          setStatus("error");
        }
      }
    },
    [resetToAnonymous],
  );

  const initializeAuth = useCallback(async () => {
    try {
      const [sessionResult, initialUrl] = await Promise.all([
        supabase.auth.getSession(),
        Linking.getInitialURL(),
      ]);
      if (!isMounted.current) return;
      if (sessionResult.error) throw sessionResult.error;

      const openedForRecovery =
        initialUrl?.includes("/reset-password") ?? false;
      if (openedForRecovery) {
        beginPasswordRecovery();
        return;
      }
      await bootstrapSession(sessionResult.data.session);
    } catch (initializationError) {
      if (!isMounted.current) return;
      syncSequence.current += 1;
      bootstrappedUserId.current = null;
      recoveryMode.current = false;
      recoveryAuthorizedUserId.current = null;
      observedRecoveryEventUserId.current = null;
      setSession(null);
      setProfile(null);
      setIsPasswordRecovery(false);
      setIsRecoveryCodeExchanged(false);
      setError(readableAuthError(initializationError));
      setStatus("error");
    }
  }, [beginPasswordRecovery, bootstrapSession]);

  const handleAuthEvent = useCallback(
    async (event: AuthChangeEvent, nextSession: Session | null) => {
      switch (event) {
        case "INITIAL_SESSION":
          // initializeAuth owns the initial storage read so it can report
          // SecureStore and deep-link failures without bootstrapping twice.
          return;
        case "SIGNED_IN":
          if (recoveryMode.current) {
            setSession(nextSession);
            setStatus("anonymous");
            return;
          }
          await bootstrapSession(nextSession);
          return;
        case "SIGNED_OUT":
          resetToAnonymous();
          return;
        case "PASSWORD_RECOVERY":
          if (!recoveryMode.current) beginPasswordRecovery();
          setSession(nextSession);
          setStatus("anonymous");
          return;
        case "TOKEN_REFRESHED":
        case "USER_UPDATED":
          if (!nextSession) {
            resetToAnonymous();
            return;
          }
          setSession(nextSession);
          return;
        default:
          if (nextSession) setSession(nextSession);
      }
    },
    [beginPasswordRecovery, bootstrapSession, resetToAnonymous],
  );

  useEffect(() => {
    isMounted.current = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY" && nextSession) {
        observedRecoveryEventUserId.current = nextSession.user.id;
      }
      setTimeout(() => {
        if (isMounted.current) void handleAuthEvent(event, nextSession);
      }, 0);
    });

    const initializationTimer = setTimeout(() => {
      if (isMounted.current) void initializeAuth();
    }, 0);

    return () => {
      isMounted.current = false;
      clearTimeout(initializationTimer);
      subscription.unsubscribe();
    };
  }, [handleAuthEvent, initializeAuth]);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url.includes("/reset-password")) beginPasswordRecovery();
    });
    return () => subscription.remove();
  }, [beginPasswordRecovery]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => subscription.remove();
  }, []);

  const exchangePasswordRecoveryCode = useCallback(
    async (code: string) => {
      beginPasswordRecovery();
      const recoveredSession = await exchangeAuthCode(code);
      if (observedRecoveryEventUserId.current !== recoveredSession.user.id) {
        throw new Error("This link is not a password recovery link.");
      }
      if (!recoveryMode.current) {
        throw new Error("Password recovery was interrupted.");
      }
      recoveryAuthorizedUserId.current = recoveredSession.user.id;
      setSession(recoveredSession);
      setIsRecoveryCodeExchanged(true);
      setStatus("anonymous");
    },
    [beginPasswordRecovery],
  );

  const retryProfileBootstrap = useCallback(async () => {
    setError(null);
    setStatus("initializing");
    await initializeAuth();
  }, [initializeAuth]);

  const signOut = useCallback(async () => {
    await signOutFromSupabase();
    resetToAnonymous();
  }, [resetToAnonymous]);

  const changePassword = useCallback(
    async (password: string) => {
      const authorizedUserId = recoveryAuthorizedUserId.current;
      if (
        !recoveryMode.current ||
        !isRecoveryCodeExchanged ||
        !authorizedUserId
      ) {
        throw new Error("Exchange a valid recovery link before updating password.");
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session || data.session.user.id !== authorizedUserId) {
        throw new Error("The recovery session does not match this account.");
      }

      await updatePassword(password);
      const { data: updatedSessionData, error: updatedSessionError } =
        await supabase.auth.getSession();
      if (updatedSessionError) throw updatedSessionError;
      const updatedSession = updatedSessionData.session;
      if (!updatedSession || updatedSession.user.id !== authorizedUserId) {
        throw new Error("The updated session does not match this account.");
      }

      clearRecoveryState();
      bootstrappedUserId.current = null;
      await bootstrapSession(updatedSession);
    },
    [bootstrapSession, clearRecoveryState, isRecoveryCodeExchanged],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      error,
      isLogIn: status === "authenticated" && !isPasswordRecovery,
      isPasswordRecovery,
      isRecoveryCodeExchanged,
      signUp: signUpWithEmail,
      signIn: signInWithEmail,
      signInGoogle: signInWithGoogle,
      resendEmailConfirmation: resendConfirmation,
      sendPasswordReset: requestPasswordReset,
      exchangePasswordRecoveryCode,
      changePassword,
      retryProfileBootstrap,
      continueWithoutAccount: resetToAnonymous,
      signOut,
    }),
    [
      changePassword,
      error,
      exchangePasswordRecoveryCode,
      isPasswordRecovery,
      isRecoveryCodeExchanged,
      profile,
      resetToAnonymous,
      retryProfileBootstrap,
      session,
      signOut,
      status,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
