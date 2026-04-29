import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";
import { getCommonMessages, resolveLocale } from "@/lib/i18n";
import { mapGroupJoinPreviewRow, type GroupJoinPreview } from "@/lib/groups/join-group";
import { formatScoringRuleSummary } from "@/lib/predictions/scoring";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type InvitePageProps = {
  params: Promise<{
    inviteCode: string;
  }>;
  searchParams?: Promise<{
    lang?: string;
  }>;
};

type GroupJoinPreviewRow = {
  id: string;
  group_id: string;
  share_code: string;
  slug: string;
  name: string;
  rules: string;
  deadline: string;
  max_players: number;
  exact_score_points: number;
  correct_outcome_points: number;
  member_count: number;
  join_state: string;
};

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const routeParams = await params;
  const query = await searchParams;
  const locale = resolveLocale(query?.lang);
  const messages = getCommonMessages(locale);
  const copy = messages.invite;
  const formatDeadline = (value: string) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value));
  let preview: GroupJoinPreview | null = null;
  let isAuthenticated = false;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  isAuthenticated = Boolean(user);
  const { data } = await supabase.rpc("get_group_join_preview_by_share_code", {
    target_group_share_code: routeParams.inviteCode,
  });
  const previewRow = (data as GroupJoinPreviewRow[] | null)?.[0] ?? null;

  if (previewRow) {
    preview = mapGroupJoinPreviewRow(previewRow);
  }

  const signInHref = `/sign-in?lang=${locale}&redirectTo=${encodeURIComponent(`/invite/${routeParams.inviteCode}?lang=${locale}`)}`;

  return (
    <PublicShell locale={locale}>
      <section className="page-grid">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
          <article className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <p className="section-label">{copy.sectionLabel}</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {preview ? preview.name : copy.unavailableTitle}
            </h1>
            <p className="muted-copy mt-4 text-base leading-8">
              {preview ? copy.description : copy.unavailableDescription}
            </p>
            {preview ? (
              <div className="mt-6 grid gap-3 text-sm leading-7 sm:text-base">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-slate-100">{copy.inviteCodeLabel}: {routeParams.inviteCode}</div>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-slate-100">{copy.rulesLabel}: {formatScoringRuleSummary({ exactScorePoints: preview.exactScorePoints, correctOutcomePoints: preview.correctOutcomePoints }, locale)}</div>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-slate-100">{copy.membersLabel}: {preview.memberCount} / {preview.maxPlayers}</div>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-slate-100">{copy.deadlineLabel}: {formatDeadline(preview.deadline)}</div>
              </div>
            ) : null}
          </article>

          <article className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{preview ? copy.title : copy.unavailableTitle}</h2>
            <p className="muted-copy mt-4 text-base leading-8">
              {preview ? copy.authHint : copy.unavailableDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              {preview ? (
                !isAuthenticated ? (
                  <Link className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" href={signInHref}>
                    {copy.signInAction}
                  </Link>
                ) : preview.joinState === "joined" ? (
                  <Link className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" href={`/groups/${preview.slug}?lang=${locale}&groupId=${encodeURIComponent(preview.groupId)}`}>
                    {copy.alreadyJoinedAction}
                  </Link>
                ) : preview.joinState === "open" ? (
                  <form action="/api/groups/join" className="contents" method="post">
                    <input name="lang" type="hidden" value={locale} />
                    <input name="joinMode" type="hidden" value="shareCode" />
                    <input name="shareCode" type="hidden" value={routeParams.inviteCode} />
                    <input name="returnTo" type="hidden" value={`/invite/${routeParams.inviteCode}?lang=${locale}`} />
                    <button className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300" type="submit">
                      {copy.joinAction}
                    </button>
                  </form>
                ) : null
              ) : null}
              <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-400/40 hover:bg-white/5" href={`/?lang=${locale}`}>
                {messages.nav.landing}
              </Link>
            </div>
          </article>
        </div>
      </section>
    </PublicShell>
  );
}
