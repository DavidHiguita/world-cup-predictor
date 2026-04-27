import { NextResponse, type NextRequest } from "next/server";

import { createGroupArtifacts, createGroupFormSchema } from "@/lib/groups/create-group";
import { copyResponseCookies } from "@/lib/http/response-cookies";
import { getPendingAccountDeletionRequest } from "@/lib/profile/account-deletion";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

 function logCreateGroupDebug(stage: string, details: Record<string, unknown>) {
  console.log("[create-group]", JSON.stringify({ stage, ...details }));
 }

type CreateGroupRpcResult = {
  id: string;
  slug: string;
  group_id: string;
  share_code: string;
  name: string;
  deadline: string;
  max_players: number;
};

function buildReviewHref(requestUrl: URL, formData: FormData, error: string) {
  const params = new URLSearchParams();
  const lang = String(formData.get("lang") ?? "en");

  params.set("lang", lang);
  params.set("step", "review");
  params.set("name", String(formData.get("name") ?? ""));
  params.set("rules", String(formData.get("rules") ?? ""));
  params.set("deadline", String(formData.get("deadline") ?? ""));
  params.set("maxPlayers", String(formData.get("maxPlayers") ?? "24"));
  params.set("error", error);

  return new URL(`/create-group?${params.toString()}`, requestUrl);
}

function seeOther(url: string | URL) {
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const response = NextResponse.next();
  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name);
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

  logCreateGroupDebug("request", {
    host: request.headers.get("host"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    cookieNames,
    supabaseCookieNames: cookieNames.filter((name) => name.startsWith("sb-")),
  });

  const {
    error: userError,
    data: { user },
  } = await supabase.auth.getUser();

  logCreateGroupDebug("auth", {
    hasUser: Boolean(user),
    userId: user?.id ?? null,
    userError: userError?.message ?? null,
  });

  if (user) {
    const pendingAccountDeletion = await getPendingAccountDeletionRequest(supabase, user.id);

    logCreateGroupDebug("pending-deletion", {
      hasPendingAccountDeletion: Boolean(pendingAccountDeletion),
      userId: user.id,
    });

    if (pendingAccountDeletion) {
      return copyResponseCookies(response, seeOther(buildReviewHref(requestUrl, formData, "auth")));
    }
  }

  const parsed = createGroupFormSchema.safeParse({
    name: formData.get("name"),
    rules: formData.get("rules"),
    deadline: formData.get("deadline"),
    maxPlayers: formData.get("maxPlayers"),
    scoringMode: formData.get("scoringMode") ?? "winner_only",
  });

  if (!parsed.success) {
    return copyResponseCookies(response, seeOther(buildReviewHref(requestUrl, formData, "invalid")));
  }

  const values = parsed.data;
  const artifacts = createGroupArtifacts(values);

  const { data, error } = await supabase.rpc("create_group_with_owner", {
    group_slug: artifacts.slug,
    group_identifier: artifacts.groupId,
    group_share_code: artifacts.shareCode,
    group_name: values.name,
    group_rules: values.rules,
    group_deadline: values.deadline,
    group_max_players: values.maxPlayers,
    group_scoring_mode: values.scoringMode,
  });

  logCreateGroupDebug("rpc", {
    hasData: Boolean(data),
    error: error?.message ?? null,
    code: error?.code ?? null,
    slug: artifacts.slug,
  });

  if (error || !data) {
    const message = error?.message ?? "";
    const code = message === "GROUP_DUPLICATE" ? "duplicate" : message === "AUTH_REQUIRED" ? "auth" : "generic";

    return copyResponseCookies(response, seeOther(buildReviewHref(requestUrl, formData, code)));
  }

  const group = data as CreateGroupRpcResult;
  const lang = String(formData.get("lang") ?? "en");
  const createdParams = new URLSearchParams();

  createdParams.set("lang", lang);
  createdParams.set("created", "1");
  createdParams.set("groupId", group.group_id);
  createdParams.set("shareCode", group.share_code);
  createdParams.set("name", group.name);
  createdParams.set("deadline", group.deadline);
  createdParams.set("maxPlayers", String(group.max_players));

  return copyResponseCookies(response, seeOther(new URL(`/groups/${group.slug}?${createdParams.toString()}`, requestUrl)));
}
