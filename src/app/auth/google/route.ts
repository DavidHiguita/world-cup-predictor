import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_AUTHENTICATED_REDIRECT } from "@/lib/auth/routes";
import { copyResponseCookies } from "@/lib/http/response-cookies";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const redirectTo = requestUrl.searchParams.get("redirectTo") ?? DEFAULT_AUTHENTICATED_REDIRECT;
  const locale = requestUrl.searchParams.get("lang") ?? "en";
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

  const callbackUrl = new URL("/auth/callback", request.url);
  callbackUrl.searchParams.set("redirectTo", redirectTo);
  callbackUrl.searchParams.set("lang", locale);
  const errorUrl = new URL("/sign-in", request.url);
  errorUrl.searchParams.set("lang", locale);
  errorUrl.searchParams.set("error", "google");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(errorUrl);
  }

  const redirectResponse = NextResponse.redirect(data.url);
  return copyResponseCookies(response, redirectResponse);
}
