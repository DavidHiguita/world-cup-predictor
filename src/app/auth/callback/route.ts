import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_AUTHENTICATED_REDIRECT } from "@/lib/auth/routes";
import { buildSafeRedirectUrl, getSafeRedirectPath } from "@/lib/http/redirects";
import { copyResponseCookies } from "@/lib/http/response-cookies";
import { ACCOUNT_DELETION_PENDING_NOTICE, getPendingAccountDeletionRequest } from "@/lib/profile/account-deletion";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

function buildGoogleErrorUrl(request: NextRequest, locale: string, redirectTo: string, detail?: string) {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("lang", locale);
  url.searchParams.set("error", "google");
  url.searchParams.set("redirectTo", redirectTo);
  if (detail) {
    url.searchParams.set("detail", detail);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = getSafeRedirectPath(requestUrl.searchParams.get("redirectTo"), DEFAULT_AUTHENTICATED_REDIRECT, request.url);
  const locale = requestUrl.searchParams.get("lang") ?? "en";
  const authError = requestUrl.searchParams.get("error");
  const authErrorDescription = requestUrl.searchParams.get("error_description");
  const response = NextResponse.next();

  if (authError) {
    const redirectResponse = NextResponse.redirect(
      buildGoogleErrorUrl(request, locale, redirectTo, authErrorDescription ?? authError),
    );

    return copyResponseCookies(response, redirectResponse);
  }

  if (!code) {
    const redirectResponse = NextResponse.redirect(
      buildGoogleErrorUrl(request, locale, redirectTo, "Missing Google authorization code."),
    );

    return copyResponseCookies(response, redirectResponse);
  }

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

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const redirectResponse = NextResponse.redirect(
      buildGoogleErrorUrl(request, locale, redirectTo, exchangeError.message),
    );

    return copyResponseCookies(response, redirectResponse);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const pendingAccountDeletion = await getPendingAccountDeletionRequest(supabase, user.id);

    if (pendingAccountDeletion) {
      await supabase.auth.signOut();
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("lang", locale);
      signInUrl.searchParams.set("error", ACCOUNT_DELETION_PENDING_NOTICE);
      signInUrl.searchParams.set("authNotice", ACCOUNT_DELETION_PENDING_NOTICE);
      signInUrl.searchParams.set("redirectTo", redirectTo);
      const redirectResponse = NextResponse.redirect(signInUrl);

      return copyResponseCookies(response, redirectResponse);
    }
  }

  const redirectResponse = NextResponse.redirect(buildSafeRedirectUrl(request.url, redirectTo, DEFAULT_AUTHENTICATED_REDIRECT));
  return copyResponseCookies(response, redirectResponse);
}
