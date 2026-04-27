import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_ROUTE,
  DEFAULT_AUTHENTICATED_REDIRECT,
  isAuthRoute,
  isProtectedRoute,
} from "@/lib/auth/routes";
import { copyResponseCookies } from "@/lib/http/response-cookies";
import { ACCOUNT_DELETION_PENDING_NOTICE } from "@/lib/profile/account-deletion";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { response, hasPendingAccountDeletion, session } = await updateSession(request);

  if (hasPendingAccountDeletion) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = AUTH_ROUTE;
    redirectUrl.search = "";
    redirectUrl.searchParams.set("error", ACCOUNT_DELETION_PENDING_NOTICE);
    redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    const redirectResponse = NextResponse.redirect(redirectUrl);

    return copyResponseCookies(response, redirectResponse);
  }

  if (isProtectedRoute(pathname) && !session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = AUTH_ROUTE;
    redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    const redirectResponse = NextResponse.redirect(redirectUrl);

    return copyResponseCookies(response, redirectResponse);
  }

  if (isAuthRoute(pathname) && session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = DEFAULT_AUTHENTICATED_REDIRECT;
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);

    return copyResponseCookies(response, redirectResponse);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/groups/:path*", "/create-group/:path*", "/join-group/:path*", "/profile/:path*", "/sign-in"],
};
