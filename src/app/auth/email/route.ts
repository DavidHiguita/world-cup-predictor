import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_AUTHENTICATED_REDIRECT } from "@/lib/auth/routes";
import { buildSafeRedirectUrl, getSafeRedirectPath, seeOther } from "@/lib/http/redirects";
import { copyResponseCookies } from "@/lib/http/response-cookies";
import { ACCOUNT_DELETION_PENDING_NOTICE, getPendingAccountDeletionRequest } from "@/lib/profile/account-deletion";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

function buildErrorUrl(request: NextRequest, lang: string, code: string, redirectTo: string, detail?: string) {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("lang", lang);
  url.searchParams.set("error", code);
  url.searchParams.set("redirectTo", redirectTo);
  if (detail) {
    url.searchParams.set("detail", detail);
  }
  return url;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const mode = formData.get("mode");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const lang = String(formData.get("lang") ?? "en");
  const redirectTo = getSafeRedirectPath(String(formData.get("redirectTo") ?? DEFAULT_AUTHENTICATED_REDIRECT), DEFAULT_AUTHENTICATED_REDIRECT, request.url);
  const response = NextResponse.next();
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

  if (!email || !password) {
    return seeOther(buildErrorUrl(request, lang, "credentials", redirectTo));
  }

  if (mode === "sign-up") {
    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set("redirectTo", redirectTo);
    callbackUrl.searchParams.set("lang", lang);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      return seeOther(buildErrorUrl(request, lang, "signup", redirectTo, error.message));
    }

    const redirectUrl = buildSafeRedirectUrl(request.url, redirectTo, DEFAULT_AUTHENTICATED_REDIRECT);
    redirectUrl.searchParams.set("authNotice", "check-email");
    return seeOther(redirectUrl);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return seeOther(buildErrorUrl(request, lang, "signin", redirectTo, error.message));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const pendingAccountDeletion = await getPendingAccountDeletionRequest(supabase, user.id);

    if (pendingAccountDeletion) {
      await supabase.auth.signOut();
      const redirectUrl = new URL("/sign-in", request.url);
      redirectUrl.searchParams.set("lang", lang);
      redirectUrl.searchParams.set("error", ACCOUNT_DELETION_PENDING_NOTICE);
      redirectUrl.searchParams.set("authNotice", ACCOUNT_DELETION_PENDING_NOTICE);
      redirectUrl.searchParams.set("redirectTo", redirectTo);
      const redirectResponse = seeOther(redirectUrl);

      return copyResponseCookies(response, redirectResponse);
    }
  }

  const redirectResponse = seeOther(buildSafeRedirectUrl(request.url, redirectTo, DEFAULT_AUTHENTICATED_REDIRECT));
  return copyResponseCookies(response, redirectResponse);
}
