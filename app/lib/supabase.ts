import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

function requirePublicEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} が設定されていません。`);
  }

  return value;
}

function getSupabaseConfig() {
  return {
    url: requirePublicEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    anonKey: requirePublicEnv(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ),
  };
}

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const { url, anonKey } = getSupabaseConfig();
  supabaseClient = createClient(url, anonKey);
  return supabaseClient;
}

export async function testSupabaseConnection() {
  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(new URL("/rest/v1/", url), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabaseへの接続に失敗しました。(${response.status})`);
  }

  return true;
}
