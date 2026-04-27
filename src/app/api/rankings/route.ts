import { NextResponse, type NextRequest } from "next/server";

import { getPendingAccountDeletionRequest } from "@/lib/profile/account-deletion";
import { getGroupRankings } from "@/lib/rankings/group-rankings";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

type GroupRow = {
  id: string;
  group_id: string;
  slug: string;
};

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ status: "auth" }, { status: 401 });
  }

  const pendingAccountDeletion = await getPendingAccountDeletionRequest(supabase, user.id);

  if (pendingAccountDeletion) {
    return NextResponse.json({ status: "auth" }, { status: 401 });
  }

  const groupId = request.nextUrl.searchParams.get("groupId") ?? "";
  const groupSlug = request.nextUrl.searchParams.get("groupSlug") ?? "";

  if (!groupId && !groupSlug) {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
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
    return NextResponse.json({ status: "invalid" }, { status: 404 });
  }

  const { data: membershipData } = await supabase
    .from("group_memberships")
    .select("role")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipData) {
    return NextResponse.json({ status: "forbidden" }, { status: 403 });
  }

  try {
    const rankingData = await getGroupRankings(supabase, group.id, user.id);

    return NextResponse.json({
      status: "ok",
      rows: rankingData.rows,
      podium: rankingData.podium,
      resolvedMatches: rankingData.resolvedMatches,
      lastUpdated: rankingData.lastUpdated,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
