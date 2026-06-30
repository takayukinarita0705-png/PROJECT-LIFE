import { createClient } from "@supabase/supabase-js";

function requirePublicEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} が設定されていません。`);
  }

  return value;
}

const supabaseUrl = requirePublicEnv(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);
const supabaseAnonKey = requirePublicEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function testSupabaseConnection() {
  const response = await fetch(new URL("/rest/v1/", supabaseUrl), {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabaseへの接続に失敗しました。(${response.status})`);
  }

  return true;
}
