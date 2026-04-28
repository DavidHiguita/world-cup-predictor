import { NextResponse } from "next/server";

function normalizeInternalPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const normalizedUrl = new URL(value, "http://localhost");
    return `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`;
  } catch {
    return null;
  }
}

export function getSafeRedirectPath(candidate: string | null | undefined, fallbackPath: string, requestUrl?: string | URL) {
  const request = requestUrl ? (typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl) : null;
  const fallback = normalizeInternalPath(fallbackPath) ?? "/";

  if (!candidate) {
    return fallback;
  }

  const trimmed = candidate.trim();
  const normalizedCandidate = normalizeInternalPath(trimmed);

  if (normalizedCandidate) {
    return normalizedCandidate;
  }

  try {
    const targetUrl = new URL(trimmed);

    if (request && targetUrl.origin === request.origin) {
      return normalizeInternalPath(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`) ?? fallback;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function buildSafeRedirectUrl(requestUrl: string | URL, candidate: string | null | undefined, fallbackPath: string) {
  return new URL(getSafeRedirectPath(candidate, fallbackPath, requestUrl), requestUrl);
}

export function seeOther(url: string | URL) {
  return NextResponse.redirect(url, { status: 303 });
}
