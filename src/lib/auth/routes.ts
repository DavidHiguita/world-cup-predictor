export const AUTH_ROUTE = "/sign-in";
export const DEFAULT_AUTHENTICATED_REDIRECT = "/dashboard";

export const protectedRoutePrefixes = [
  "/dashboard",
  "/groups",
  "/create-group",
  "/join-group",
  "/profile",
] as const;

export function isProtectedRoute(pathname: string) {
  return protectedRoutePrefixes.some((routePrefix) => pathname.startsWith(routePrefix));
}

export function isAuthRoute(pathname: string) {
  return pathname === AUTH_ROUTE;
}
