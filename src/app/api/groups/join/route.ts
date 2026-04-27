import { NextResponse, type NextRequest } from "next/server";

import { getPendingAccountDeletionRequest } from "@/lib/profile/account-deletion";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

type GroupRow = {
  slug: string;
  group_id: string;
};

function buildReturnUrl(request: NextRequest, returnTo: string, params: Record<string, string>) {
  const url = new URL(returnTo || "/join-group", request.url);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  return url;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const lang = String(formData.get("lang") ?? "en");
  const mode = formData.get("joinMode") === "shareCode" ? "shareCode" : "groupId";
  const groupId = String(formData.get("groupId") ?? "").trim();
  const shareCode = String(formData.get("shareCode") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? (mode === "shareCode" ? `/invite/${shareCode}` : "/join-group"));
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
    signInUrl.searchParams.set("redirectTo", returnTo);
    return NextResponse.redirect(signInUrl);
  }

  const pendingAccountDeletion = await getPendingAccountDeletionRequest(supabase, user.id);

  if (pendingAccountDeletion) {
    return NextResponse.redirect(
      buildReturnUrl(request, returnTo, {
        lang,
        status: "auth",
        ...(mode === "groupId" ? { groupId } : {}),
      }),
    );
  }

  const rpcName = mode === "shareCode" ? "join_group_with_share_code" : "join_group_with_identifier";
  const rpcArgName = mode === "shareCode" ? "target_group_share_code" : "target_group_identifier";
  const rpcValue = mode === "shareCode" ? shareCode : groupId;

  if (!rpcValue) {
    return NextResponse.redirect(
      buildReturnUrl(request, returnTo, {
        lang,
        status: "invalid",
        ...(mode === "groupId" ? { groupId } : {}),
      }),
    );
  }

  const { data, error } = await supabase.rpc(rpcName, {
    [rpcArgName]: rpcValue,
  });

  if (error || !data) {
    const message = error?.message ?? "";
    const status =
      message === "GROUP_ALREADY_JOINED"
        ? "duplicate"
        : message === "GROUP_FULL"
          ? "full"
          : message === "AUTH_REQUIRED"
            ? "auth"
            : message === "GROUP_NOT_FOUND"
              ? "invalid"
              : "error";

    return NextResponse.redirect(
      buildReturnUrl(request, returnTo, {
        lang,
        status,
        ...(mode === "groupId" ? { groupId } : {}),
      }),
    );
  }

  const group = data as GroupRow;
  const redirectUrl = new URL(`/groups/${group.slug}`, request.url);
  redirectUrl.searchParams.set("lang", lang);
  redirectUrl.searchParams.set("groupId", group.group_id);

  return NextResponse.redirect(redirectUrl);
}
