import Link from "next/link";
import { redirect } from "next/navigation";

import { PredictionsBoard } from "@/components/predictions/predictions-board";
import { formatFixtureKickoff, getFixtureStatus, type PredictionFixture } from "@/lib/predictions/fixtures";
import { getCommonMessages, resolveLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PredictionsPageProps = {
  params: Promise<{
    groupSlug: string;
  }>;
  searchParams?: Promise<{
    groupId?: string;
    lang?: string;
    status?: string;
  }>;
};

type GroupRow = {
  id: string;
  group_id: string;
  name: string;
  slug: string;
  deadline: string;
};

type MatchRow = {
  id: string;
  stage: string;
  kickoff_at: string;
  home_team_code: string;
  home_team_name: string;
  home_team_flag: string;
  away_team_code: string;
  away_team_name: string;
  away_team_flag: string;
  venue: string;
};

type PredictionRow = {
  match_id: string;
  predicted_winner_code: string;
};

function mapMatchRow(match: MatchRow, predictionsByMatchId: Map<string, string>): PredictionFixture {
  return {
    id: match.id,
    stage: match.stage,
    kickoffAt: match.kickoff_at,
    homeTeamCode: match.home_team_code,
    homeTeamName: match.home_team_name,
    homeTeamFlag: match.home_team_flag,
    awayTeamCode: match.away_team_code,
    awayTeamName: match.away_team_name,
    awayTeamFlag: match.away_team_flag,
    venue: match.venue,
    predictedWinnerCode: predictionsByMatchId.get(match.id) ?? null,
  };
}

export default async function GroupPredictionsPage({ params, searchParams }: PredictionsPageProps) {
  const routeParams = await params;
  const query = await searchParams;
  const locale = resolveLocale(query?.lang);
  const messages = getCommonMessages(locale);
  const copy = messages.predictions;
  const backParams = new URLSearchParams();
  backParams.set("lang", locale);
  if (query?.groupId) {
    backParams.set("groupId", query.groupId);
  }
  const backHref = `/groups/${routeParams.groupSlug}?${backParams.toString()}`;
  const notice =
    query?.status === "saved"
      ? copy.notices.saved
      : query?.status === "partial"
        ? copy.notices.partial
      : query?.status === "closed"
        ? copy.notices.closed
        : query?.status === "invalid"
          ? copy.notices.invalid
          : query?.status === "error"
            ? copy.notices.error
            : null;

  let group: GroupRow | null = null;
  let fixtures: PredictionFixture[] = [];
  let unavailableInRealMode = false;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?lang=${locale}&redirectTo=${encodeURIComponent(`/groups/${routeParams.groupSlug}/predictions?lang=${locale}`)}`);
  }

  let groupData: GroupRow | null = null;

  if (query?.groupId) {
    const { data } = await supabase.from("groups").select("id, group_id, name, slug, deadline").eq("group_id", query.groupId).maybeSingle();
    groupData = (data as GroupRow | null) ?? null;
  }

  if (!groupData) {
    const { data } = await supabase.from("groups").select("id, group_id, name, slug, deadline").eq("slug", routeParams.groupSlug).maybeSingle();
    groupData = (data as GroupRow | null) ?? null;
  }

  group = groupData;

  if (group) {
    const [{ data: matchesData }, { data: predictionsData }] = await Promise.all([
      supabase.from("matches").select("id, stage, kickoff_at, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, venue").order("kickoff_at", { ascending: true }),
      supabase.from("predictions").select("match_id, predicted_winner_code").eq("group_id", group.id).eq("user_id", user.id),
    ]);

    const predictionsByMatchId = new Map(
      ((predictionsData as PredictionRow[] | null) ?? []).map((prediction) => [prediction.match_id, prediction.predicted_winner_code]),
    );

    if ((matchesData as MatchRow[] | null)?.length) {
      fixtures = (matchesData as MatchRow[]).map((match) => mapMatchRow(match, predictionsByMatchId));
    }
  } else {
    unavailableInRealMode = true;
  }

  const groupName = group?.name ?? routeParams.groupSlug;
  const groupDeadline = group?.deadline ?? new Date().toISOString();
  const openCount = fixtures.filter((fixture) => getFixtureStatus(fixture.kickoffAt, groupDeadline) === "open").length;
  const savedCount = fixtures.filter((fixture) => fixture.predictedWinnerCode).length;

  return (
    <section className="page-grid">
      <div>
        <p className="section-label">{copy.sectionLabel}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{groupName}</h1>
        <p className="muted-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">{copy.description}</p>
      </div>

      {notice ? (
        <article className={`rounded-[1.75rem] p-5 ${query?.status === "saved" ? "border border-emerald-400/20 bg-emerald-400/10" : "border border-rose-400/20 bg-rose-400/10"}`}>
          <p className="text-sm font-medium text-white">{notice}</p>
        </article>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.summaryTitle}</h2>
          <div className="mt-4 grid gap-3 text-sm leading-7 sm:text-base">
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.groupDeadlineLabel}: {formatFixtureKickoff(groupDeadline, locale)}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.openMatchesLabel}: {openCount}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.savedPredictionsLabel}: {savedCount} / {fixtures.length}</div>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.statusTitle}</h2>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-100 sm:text-base">
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4">{copy.statusOpen}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4">{copy.statusClosed}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4">{copy.statusSaved}</div>
          </div>
        </article>
      </div>

      {unavailableInRealMode ? (
        <article className="rounded-[1.75rem] border border-rose-400/20 bg-rose-400/10 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.unavailableTitle}</h2>
          <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">{copy.unavailableDescription}</p>
        </article>
      ) : (
        <PredictionsBoard
          copy={copy}
          fixtures={fixtures}
          groupDeadline={groupDeadline}
          groupId={group?.group_id}
          groupSlug={routeParams.groupSlug}
          locale={locale}
        />
      )}

      <div className="flex flex-wrap gap-4">
        <Link className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" href={backHref}>
          {copy.backToGroup}
        </Link>
        <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/groups?lang=${locale}`}>
          {copy.browseGroups}
        </Link>
      </div>
    </section>
  );
}
