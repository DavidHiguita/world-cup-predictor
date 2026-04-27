import { getOptionalPublicEnv, getPublicEnv } from "@/lib/env";

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const env = getPublicEnv();

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function hasSupabasePublicEnv() {
  return Boolean(getOptionalPublicEnv());
}
