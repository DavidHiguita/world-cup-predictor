import { NextResponse, type NextRequest } from "next/server";

import { copyResponseCookies } from "@/lib/http/response-cookies";
import { ACCOUNT_DELETION_PENDING_NOTICE } from "@/lib/profile/account-deletion";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const lang = String(formData.get("lang") ?? "en");
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("lang", lang);
    signInUrl.searchParams.set("redirectTo", `/profile?lang=${lang}&delete=confirm`);
    return NextResponse.redirect(signInUrl);
  }

  const { error } = await supabase.rpc("request_account_deletion");

  if (error) {
    const redirectUrl = new URL("/profile", request.url);
    redirectUrl.searchParams.set("lang", lang);
    redirectUrl.searchParams.set("delete", "error");
    return NextResponse.redirect(redirectUrl);
  }

  await supabase.auth.signOut();
  const redirectUrl = new URL("/sign-in", request.url);
  redirectUrl.searchParams.set("lang", lang);
  redirectUrl.searchParams.set("error", ACCOUNT_DELETION_PENDING_NOTICE);
  redirectUrl.searchParams.set("authNotice", ACCOUNT_DELETION_PENDING_NOTICE);
  redirectUrl.searchParams.set("redirectTo", "/sign-in");
  const redirectResponse = NextResponse.redirect(redirectUrl);

  return copyResponseCookies(response, redirectResponse);
}
