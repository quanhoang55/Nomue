import "react-native-url-polyfill/auto";
// import { createClient, processLock } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// SecureStore has had small per-value limits on some iOS releases. Keeping
// chunks to 500 UTF-16 code units also leaves room for multi-byte characters.
const SECURE_STORE_CHUNK_SIZE = 500;
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be configured",
  );
}

function chunkCountKey(key: string) {
  return `${key}.chunks`;
}

function chunkKey(key: string, index: number) {
  return `${key}.${index}`;
}

async function removeSecureValue(key: string) {
  const storedCount = await SecureStore.getItemAsync(chunkCountKey(key));
  const count = Number.parseInt(storedCount ?? "0", 10);
  const deletes = [
    SecureStore.deleteItemAsync(key),
    SecureStore.deleteItemAsync(chunkCountKey(key)),
  ];
  if (Number.isInteger(count) && count > 0 && count <= 100) {
    for (let index = 0; index < count; index += 1) {
      deletes.push(SecureStore.deleteItemAsync(chunkKey(key, index)));
    }
  }
  await Promise.all(deletes);
}

const secureStoreAdapter = {
  async getItem(key: string) {
    const storedCount = await SecureStore.getItemAsync(chunkCountKey(key));
    if (!storedCount) return SecureStore.getItemAsync(key);

    const count = Number.parseInt(storedCount, 10);
    if (!Number.isInteger(count) || count <= 0 || count > 100) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, index)),
      ),
    );
    return chunks.some((chunk) => chunk === null) ? null : chunks.join("");
  },
  async setItem(key: string, value: string) {
    await removeSecureValue(key);
    const chunks = value.match(
      new RegExp(`.{1,${SECURE_STORE_CHUNK_SIZE}}`, "gs"),
    ) ?? [""];
    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(
          chunkKey(key, index),
          chunk,
          secureStoreOptions,
        ),
      ),
    );
    await SecureStore.setItemAsync(
      chunkCountKey(key),
      String(chunks.length),
      secureStoreOptions,
    );
  },
  removeItem: removeSecureValue,
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    ...(Platform.OS === "web" ? {} : { storage: secureStoreAdapter }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
