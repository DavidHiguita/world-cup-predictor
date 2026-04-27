import { NextResponse, type NextRequest } from "next/server";

import { createGroupArtifacts, createGroupFormSchema } from "@/lib/groups/create-group";
import { copyResponseCookies } from "@/lib/http/response-cookies";
import { getPendingAccountDeletionRequest } from "@/lib/profile/account-deletion";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

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

  if (user) {
    const pendingAccountDeletion = await getPendingAccountDeletionRequest(supabase, user.id);

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
