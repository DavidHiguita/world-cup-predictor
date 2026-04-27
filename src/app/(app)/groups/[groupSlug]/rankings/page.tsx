import Link from "next/link";
import { redirect } from "next/navigation";

import { RankingsBoard } from "@/components/rankings/rankings-board";
import { getGroupRankings, type GroupRankingRow } from "@/lib/rankings/group-rankings";
import { getCommonMessages, resolveLocale } from "@/lib/i18n";
import { hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RankingsPageProps = {
  params: Promise<{
    groupSlug: string;
  }>;
  searchParams?: Promise<{
    groupId?: string;
    lang?: string;
  }>;
};

type GroupRow = {
  id: string;
  group_id: string;
  name: string;
  slug: string;
};

type RankingsSnapshot = {
  rows: GroupRankingRow[];
  podium: GroupRankingRow[];
  resolvedMatches: number;
  lastUpdated: string | null;
  fetchedAt: string;
};

export default async function GroupRankingsPage({ params, searchParams }: RankingsPageProps) {
  const routeParams = await params;
  const query = await searchParams;
  const locale = resolveLocale(query?.lang);
  const messages = getCommonMessages(locale);
  const copy = messages.rankings;
  const backParams = new URLSearchParams();
  backParams.set("lang", locale);
  if (query?.groupId) {
    backParams.set("groupId", query.groupId);
  }
  const backHref = `/groups/${routeParams.groupSlug}?${backParams.toString()}`;
  const predictionsHref = `/groups/${routeParams.groupSlug}/predictions?${backParams.toString()}`;

  let group: GroupRow | null = null;
  let unavailableInRealMode = false;
  let isOwner = false;
  let initialData: RankingsSnapshot = {
    rows: [],
    podium: [],
    resolvedMatches: 0,
    lastUpdated: null,
    fetchedAt: new Date().toISOString(),
  };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?lang=${locale}&redirectTo=${encodeURIComponent(`/groups/${routeParams.groupSlug}/rankings?lang=${locale}`)}`);
  }

  let groupData: GroupRow | null = null;

  if (query?.groupId) {
    const { data } = await supabase.from("groups").select("id, group_id, name, slug").eq("group_id", query.groupId).maybeSingle();
    groupData = (data as GroupRow | null) ?? null;
  }

  if (!groupData) {
    const { data } = await supabase.from("groups").select("id, group_id, name, slug").eq("slug", routeParams.groupSlug).maybeSingle();
    groupData = (data as GroupRow | null) ?? null;
  }

  group = groupData;

  if (group) {
    const { data: membershipData } = await supabase
      .from("group_memberships")
      .select("role")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membershipData) {
      unavailableInRealMode = true;
    } else {
      isOwner = membershipData.role === "owner";

      try {
        const rankingData = await getGroupRankings(supabase, group.id, user.id);
        initialData = {
          rows: rankingData.rows,
          podium: rankingData.podium,
          resolvedMatches: rankingData.resolvedMatches,
          lastUpdated: rankingData.lastUpdated,
          fetchedAt: new Date().toISOString(),
        };
      } catch {
        unavailableInRealMode = true;
      }
    }
  } else {
    unavailableInRealMode = true;
  }

  const groupName = group?.name ?? routeParams.groupSlug;

  return (
    <section className="page-grid">
      <div>
        <p className="section-label">{copy.sectionLabel}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{groupName}</h1>
        <p className="muted-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">{copy.description}</p>
      </div>

      {unavailableInRealMode ? (
        <article className="rounded-[1.75rem] border border-rose-400/20 bg-rose-400/10 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.unavailableTitle}</h2>
          <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">{copy.unavailableDescription}</p>
        </article>
      ) : (
        <RankingsBoard
          canSyncResults={hasSupabaseAdminEnv()}
          copy={copy}
          groupId={group?.group_id ?? query?.groupId ?? ""}
          groupSlug={routeParams.groupSlug}
          initialData={initialData}
          isOwner={isOwner}
          locale={locale}
        />
      )}

      <div className="flex flex-wrap gap-4">
        <Link className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" href={backHref}>
          {copy.backToGroup}
        </Link>
        <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={predictionsHref}>
          {copy.openPredictions}
        </Link>
      </div>
    </section>
  );
}
