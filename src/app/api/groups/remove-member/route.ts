import { NextResponse, type NextRequest } from "next/server";

import { seeOther } from "@/lib/http/redirects";
import { copyResponseCookies } from "@/lib/http/response-cookies";
import { getPendingAccountDeletionRequest } from "@/lib/profile/account-deletion";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

function buildReturnUrl(requestUrl: URL, groupSlug: string, formData: FormData, status: string) {
  if (!groupSlug) {
    const fallback = new URL("/groups", requestUrl);
    fallback.searchParams.set("lang", String(formData.get("lang") ?? "en"));
    fallback.searchParams.set("management", status);
    return fallback;
  }

  const params = new URLSearchParams();
  const lang = String(formData.get("lang") ?? "en");
  const groupId = String(formData.get("groupId") ?? "");

  params.set("lang", lang);
  params.set("management", status);

  if (groupId) {
    params.set("groupId", groupId);
  }

  return new URL(`/groups/${groupSlug}?${params.toString()}`, requestUrl);
}

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const groupSlug = String(formData.get("groupSlug") ?? "").trim();
  const groupUuid = String(formData.get("groupUuid") ?? "").trim();
  const targetUserId = String(formData.get("targetUserId") ?? "").trim();
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

  if (!user || !groupSlug || !groupUuid || !targetUserId) {
    return copyResponseCookies(response, seeOther(buildReturnUrl(requestUrl, groupSlug, formData, !user ? "forbidden" : "error")));
  }

  const pendingAccountDeletion = await getPendingAccountDeletionRequest(supabase, user.id);

  if (pendingAccountDeletion) {
    return copyResponseCookies(response, seeOther(buildReturnUrl(requestUrl, groupSlug, formData, "forbidden")));
  }

  const { error } = await supabase.rpc("remove_group_member", {
    target_group_uuid: groupUuid,
    target_user_uuid: targetUserId,
  });

  if (error) {
    const status =
      error.message === "OWNER_MEMBER_PROTECTED"
        ? "protected"
        : error.message === "MEMBER_NOT_FOUND"
          ? "missing"
          : error.message === "GROUP_ACCESS_DENIED" || error.message === "AUTH_REQUIRED"
            ? "forbidden"
            : "error";

    return copyResponseCookies(response, seeOther(buildReturnUrl(requestUrl, groupSlug, formData, status)));
  }

  return copyResponseCookies(response, seeOther(buildReturnUrl(requestUrl, groupSlug, formData, "removed")));
}
