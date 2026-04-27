import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getOptionalPublicEnv } from "@/lib/env";
import { getPendingAccountDeletionRequest } from "@/lib/profile/account-deletion";

export async function updateSession(request: NextRequest) {
  const env = getOptionalPublicEnv();

  if (!env) {
    return {
      response: NextResponse.next({ request }),
      hasPendingAccountDeletion: false,
      session: null,
    };
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  let hasPendingAccountDeletion = false;

  if (session?.user?.id) {
    const pendingAccountDeletion = await getPendingAccountDeletionRequest(supabase, session.user.id);

    if (pendingAccountDeletion) {
      hasPendingAccountDeletion = true;
      await supabase.auth.signOut();
    }
  }

  return {
    response,
    hasPendingAccountDeletion,
    session: hasPendingAccountDeletion ? null : session,
  };
}
