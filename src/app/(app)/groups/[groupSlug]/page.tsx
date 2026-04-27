import Link from "next/link";
import { redirect } from "next/navigation";

import { getCommonMessages, resolveLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GroupDetailsRow = {
  id: string;
  group_id: string;
  share_code: string;
  name: string;
  slug: string;
  deadline: string;
  max_players: number;
};

type GroupDetailsPageProps = {
  params: Promise<{
    groupSlug: string;
  }>;
  searchParams?: Promise<{
    lang?: string;
    created?: string;
    groupId?: string;
    shareCode?: string;
    name?: string;
    deadline?: string;
    maxPlayers?: string;
  }>;
};

export default async function GroupDetailsPage({ params, searchParams }: GroupDetailsPageProps) {
  const routeParams = await params;
  const query = await searchParams;
  const locale = resolveLocale(query?.lang);
  const messages = getCommonMessages(locale);
  const copy = messages.createGroup.linkedPages;
  const successCopy = messages.createGroup.success;
  const created = query?.created === "1";
  let group: GroupDetailsRow | null = null;
  let memberCount = 0;
  const formatDeadline = (value: string) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value));

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?lang=${locale}&redirectTo=${encodeURIComponent(`/groups/${routeParams.groupSlug}?lang=${locale}`)}`);
  }

  if (query?.groupId) {
    const { data } = await supabase.from("groups").select("id, group_id, share_code, name, slug, deadline, max_players").eq("group_id", query.groupId).maybeSingle();
    group = (data as GroupDetailsRow | null) ?? null;
  }

  if (!group) {
    const { data } = await supabase.from("groups").select("id, group_id, share_code, name, slug, deadline, max_players").eq("slug", routeParams.groupSlug).maybeSingle();
    group = (data as GroupDetailsRow | null) ?? null;
  }

  if (!group) {
    redirect(`/groups?lang=${locale}`);
  }

  const { count } = await supabase
    .from("group_memberships")
    .select("id", { count: "exact", head: true })
    .eq("group_id", group.id);

  memberCount = count ?? (created ? 1 : 0);

  const groupName = group.name ?? (query?.name ? decodeURIComponent(query.name) : routeParams.groupSlug);
  const groupId = group.group_id;
  const shareCode = group.share_code ?? query?.shareCode ?? "";
  const shareLink = `/invite/${shareCode}`;
  const predictionsParams = new URLSearchParams();
  predictionsParams.set("lang", locale);
  if (groupId) {
    predictionsParams.set("groupId", groupId);
  }
  const predictionsHref = `/groups/${routeParams.groupSlug}/predictions?${predictionsParams.toString()}`;
  const rankingsParams = new URLSearchParams(predictionsParams);
  const rankingsHref = `/groups/${routeParams.groupSlug}/rankings?${rankingsParams.toString()}`;
  const memberCountLabel = `${memberCount} / ${group.max_players}`;
  const deadline = formatDeadline(group.deadline ?? (query?.deadline ? decodeURIComponent(query.deadline) : new Date().toISOString()));

  return (
    <section className="page-grid">
      <div>
        <p className="section-label">{copy.groupDetailsSectionLabel}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{groupName}</h1>
        <p className="muted-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">
          {copy.groupDetailsDescription}
        </p>
      </div>

      {created ? (
        <article className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
          <h2 className="text-xl font-semibold text-white">{successCopy.title}</h2>
          <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">
            {successCopy.description}
          </p>
        </article>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.groupSummaryTitle}</h2>
          <div className="mt-4 grid gap-3 text-sm leading-7 sm:text-base">
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">group_id: {groupId}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.rulesSummary}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.membersPrefix}: {memberCountLabel} · {copy.shareLinkActive}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.nextDeadlineLabel}: {deadline}</div>
          </div>
        </article>

        <div className="grid gap-4">
          <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-semibold text-white">{copy.shareTitle}</h2>
            <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-slate-950/30 px-4 py-4 text-sm leading-7 text-slate-100 break-all">
              {shareLink}
            </div>
            <p className="muted-copy mt-4 text-sm leading-6">
              {copy.shareDescription}
            </p>
          </article>

          <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-semibold text-white">{copy.nextActionsTitle}</h2>
            <div className="mt-4 grid gap-3">
              <Link className="rounded-[1.25rem] bg-sky-400 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" href={`/groups?lang=${locale}`}>
                {copy.backToGroups}
              </Link>
              <Link className="rounded-[1.25rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/dashboard?lang=${locale}`}>
                {copy.openDashboard}
              </Link>
              <Link className="rounded-[1.25rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={predictionsHref}>
                {copy.openPredictions}
              </Link>
              <Link className="rounded-[1.25rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={rankingsHref}>
                {copy.openRankings}
              </Link>
              <Link className="rounded-[1.25rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?lang=${locale}`}>
                {copy.createAnotherGroup}
              </Link>
            </div>
            <p className="muted-copy mt-4 text-sm leading-7 sm:text-base">
              {copy.groupSlugPrefix}: {routeParams.groupSlug}. {copy.futureEntryPoints}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
