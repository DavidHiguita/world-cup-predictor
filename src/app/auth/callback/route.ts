import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_AUTHENTICATED_REDIRECT } from "@/lib/auth/routes";
import { copyResponseCookies } from "@/lib/http/response-cookies";
import { ACCOUNT_DELETION_PENDING_NOTICE, getPendingAccountDeletionRequest } from "@/lib/profile/account-deletion";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = requestUrl.searchParams.get("redirectTo") ?? DEFAULT_AUTHENTICATED_REDIRECT;
  const response = NextResponse.next();

  if (code) {
    const supabase = createSupabaseRouteHandlerClient({
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    });

    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const pendingAccountDeletion = await getPendingAccountDeletionRequest(supabase, user.id);

      if (pendingAccountDeletion) {
        await supabase.auth.signOut();
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("lang", requestUrl.searchParams.get("lang") ?? "en");
        signInUrl.searchParams.set("error", ACCOUNT_DELETION_PENDING_NOTICE);
        signInUrl.searchParams.set("authNotice", ACCOUNT_DELETION_PENDING_NOTICE);
        signInUrl.searchParams.set("redirectTo", redirectTo);
        const redirectResponse = NextResponse.redirect(signInUrl);

        return copyResponseCookies(response, redirectResponse);
      }
    }
  }

  const redirectResponse = NextResponse.redirect(new URL(redirectTo, request.url));
  return copyResponseCookies(response, redirectResponse);
}
