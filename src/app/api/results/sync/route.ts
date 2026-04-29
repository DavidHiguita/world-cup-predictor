import { NextResponse, type NextRequest } from "next/server";

import { copyResponseCookies } from "@/lib/http/response-cookies";
import { getPendingAccountDeletionRequest } from "@/lib/profile/account-deletion";
import { syncLatestResults } from "@/lib/results/sync";
import { getGroupRankings } from "@/lib/rankings/group-rankings";
import { hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

type GroupRow = {
  id: string;
  group_id: string;
  slug: string;
};

type SyncRequestBody = {
  groupId?: string;
  groupSlug?: string;
};

export async function POST(request: NextRequest) {
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
    return copyResponseCookies(response, NextResponse.json({ status: "auth" }, { status: 401 }));
  }

  const pendingAccountDeletion = await getPendingAccountDeletionRequest(supabase, user.id);

  if (pendingAccountDeletion) {
    return copyResponseCookies(response, NextResponse.json({ status: "auth" }, { status: 401 }));
  }

  const body = (await request.json().catch(() => null)) as SyncRequestBody | null;
  const groupId = body?.groupId ?? "";
  const groupSlug = body?.groupSlug ?? "";

  if (!groupId && !groupSlug) {
    return copyResponseCookies(response, NextResponse.json({ status: "invalid" }, { status: 400 }));
  }

  let group: GroupRow | null = null;

  if (groupId) {
    const { data } = await supabase.from("groups").select("id, group_id, slug").eq("group_id", groupId).maybeSingle();
    group = (data as GroupRow | null) ?? null;
  }

  if (!group && groupSlug) {
    const { data } = await supabase.from("groups").select("id, group_id, slug").eq("slug", groupSlug).maybeSingle();
    group = (data as GroupRow | null) ?? null;
  }

  if (!group) {
    return copyResponseCookies(response, NextResponse.json({ status: "invalid" }, { status: 404 }));
  }

  const { data: membershipData } = await supabase
    .from("group_memberships")
    .select("role")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipData || membershipData.role !== "owner") {
    return copyResponseCookies(response, NextResponse.json({ status: "forbidden" }, { status: 403 }));
  }

  if (!hasSupabaseAdminEnv()) {
    return copyResponseCookies(
      response,
      NextResponse.json(
        {
          status: "unsupported",
          updatedMatchIds: [],
          unchangedMatchIds: [],
          syncedAt: new Date().toISOString(),
        },
        { status: 503 },
      ),
    );
  }

  try {
    const syncData = await syncLatestResults();
    const rankingData = await getGroupRankings(supabase, group.id, user.id);

    return copyResponseCookies(
      response,
      NextResponse.json({
        status: syncData.updatedMatchIds.length > 0 ? "synced" : "unchanged",
        updatedMatchIds: syncData.updatedMatchIds,
        unchangedMatchIds: syncData.unchangedMatchIds,
        syncedAt: syncData.syncedAt,
        rankings: {
          rows: rankingData.rows,
          podium: rankingData.podium,
          resolvedMatches: rankingData.resolvedMatches,
          lastUpdated: rankingData.lastUpdated,
          scoring: rankingData.scoring,
          fetchedAt: new Date().toISOString(),
        },
      }),
    );
  } catch {
    return copyResponseCookies(
      response,
      NextResponse.json(
        {
          status: "error",
          updatedMatchIds: [],
          unchangedMatchIds: [],
          syncedAt: new Date().toISOString(),
        },
        { status: 500 },
      ),
    );
  }
}
