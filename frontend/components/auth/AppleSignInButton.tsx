// Apple authentication is intentionally disabled until the Apple Developer
// Program membership, Sign in with Apple capability, and Supabase Apple
// provider are configured. Uncomment this file and its usages after installing
// `expo-apple-authentication` and completing that configuration.

// import { supabase } from "@/lib/supabase";
// import * as AppleAuthentication from "expo-apple-authentication";
// import * as Crypto from "expo-crypto";

// export async function signInWithApple() {
//   const rawNonce = Crypto.randomUUID();
//   const hashedNonce = await Crypto.digestStringAsync(
//     Crypto.CryptoDigestAlgorithm.SHA256,
//     rawNonce,
//   );
//   const credential = await AppleAuthentication.signInAsync({
//     requestedScopes: [
//       AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
//       AppleAuthentication.AppleAuthenticationScope.EMAIL,
//     ],
//     nonce: hashedNonce,
//   });
//   if (!credential.identityToken) {
//     throw new Error("Apple sign-in did not return an identity token");
//   }
//   const { error } = await supabase.auth.signInWithIdToken({
//     provider: "apple",
//     token: credential.identityToken,
//     nonce: rawNonce,
//   });
//   if (error) throw error;
// }

export {};
