import { createClient } from "@supabase/supabase-js";

import { getOptionalServerEnv, getServerEnv } from "@/lib/env";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

let cachedAdminClient: ReturnType<typeof createClient> | null = null;

export function hasSupabaseAdminEnv() {
  return Boolean(getOptionalServerEnv()?.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseAdminClient() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const env = getSupabasePublicEnv();
  const serverEnv = getServerEnv();

  cachedAdminClient = createClient(env.url, serverEnv.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
}
