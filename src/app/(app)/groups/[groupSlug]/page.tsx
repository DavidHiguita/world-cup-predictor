import Link from "next/link";
import { redirect } from "next/navigation";

import { getCommonMessages, resolveLocale } from "@/lib/i18n";
import { formatScoringRuleSummary } from "@/lib/predictions/scoring";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GroupMemberRow = {
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  display_name: string;
  email: string | null;
};

type GroupDetailsRow = {
  id: string;
  group_id: string;
  share_code: string;
  name: string;
  slug: string;
  deadline: string;
  max_players: number;
  exact_score_points: number;
  correct_outcome_points: number;
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
    management?: string;
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
  const managementState = query?.management === "removed" || query?.management === "protected" || query?.management === "missing" || query?.management === "forbidden" || query?.management === "error" ? query.management : null;
  let group: GroupDetailsRow | null = null;
  let members: GroupMemberRow[] = [];
  let memberCount = 0;
  let isOwner = false;
  let memberManagementUnavailable = false;
  let memberManagementErrorDetail: string | null = null;
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
    const { data } = await supabase.from("groups").select("id, group_id, share_code, name, slug, deadline, max_players, exact_score_points, correct_outcome_points").eq("group_id", query.groupId).maybeSingle();
    group = (data as GroupDetailsRow | null) ?? null;
  }

  if (!group) {
    const { data } = await supabase.from("groups").select("id, group_id, share_code, name, slug, deadline, max_players, exact_score_points, correct_outcome_points").eq("slug", routeParams.groupSlug).maybeSingle();
    group = (data as GroupDetailsRow | null) ?? null;
  }

  if (!group) {
    redirect(`/groups?lang=${locale}`);
  }

  const { data: memberCountData } = await supabase.rpc("get_group_member_count", {
    target_group_uuid: group.id,
  });

  const { data: membershipData } = await supabase
    .from("group_memberships")
    .select("role")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  isOwner = membershipData?.role === "owner";

  if (isOwner) {
    const { data: membersData, error: membersError } = await supabase.rpc("get_group_management_members", {
      target_group_uuid: group.id,
    });

    if (membersError) {
      memberManagementUnavailable = true;
      memberManagementErrorDetail = [membersError.message, membersError.code, membersError.hint, membersError.details]
        .filter(Boolean)
        .join(" · ");
      console.error("[group-member-management] Failed to load members", {
        groupId: group.id,
        groupSlug: routeParams.groupSlug,
        userId: user.id,
        error: membersError,
      });
    } else {
      members = (membersData as GroupMemberRow[] | null) ?? [];
    }
  }

  memberCount = typeof memberCountData === "number" ? memberCountData : created ? 1 : 0;

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
  const manageMembersHref = `#group-member-management`;
  const memberCountLabel = `${memberCount} / ${group.max_players}`;
  const deadline = formatDeadline(group.deadline ?? (query?.deadline ? decodeURIComponent(query.deadline) : new Date().toISOString()));
  const managementTone = managementState === "removed"
    ? "border-emerald-400/20 bg-emerald-400/10"
    : managementState === "protected" || managementState === "missing" || managementState === "forbidden" || managementState === "error"
      ? "border-rose-400/20 bg-rose-400/10"
      : "";
  const managementTitle = managementState === "removed"
    ? copy.managementSuccessTitle
    : managementState === "protected"
      ? copy.managementProtectedTitle
      : managementState === "missing"
        ? copy.managementMissingTitle
        : managementState === "forbidden"
          ? copy.managementForbiddenTitle
          : managementState === "error"
            ? copy.managementErrorTitle
            : null;
  const managementDescription = managementState === "removed"
    ? copy.managementSuccessDescription
    : managementState === "protected"
      ? copy.managementProtectedDescription
      : managementState === "missing"
        ? copy.managementMissingDescription
        : managementState === "forbidden"
          ? copy.managementForbiddenDescription
          : managementState === "error"
            ? copy.managementErrorDescription
            : null;
  const scoringSummary = formatScoringRuleSummary({
    exactScorePoints: group.exact_score_points,
    correctOutcomePoints: group.correct_outcome_points,
  }, locale);
  const removableMembers = members.filter((member) => member.role !== "owner" && member.user_id !== user.id);

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

      {managementState && managementTitle && managementDescription ? (
        <article className={`rounded-[1.75rem] border p-5 ${managementTone}`}>
          <h2 className="text-xl font-semibold text-white">{managementTitle}</h2>
          <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">
            {managementDescription}
          </p>
        </article>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.groupSummaryTitle}</h2>
          <div className="mt-4 grid gap-3 text-sm leading-7 sm:text-base">
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">group_id: {groupId}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.rulesSummaryPrefix}: {scoringSummary}</div>
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
              <div className="rounded-[1.25rem] border border-emerald-400/20 bg-emerald-400/10 px-5 py-4">
                <p className="text-sm font-semibold text-white">{copy.overviewActiveLabel}</p>
                <p className="muted-copy mt-2 text-sm leading-6">{copy.overviewActiveDescription}</p>
              </div>
              <Link className="rounded-[1.25rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5" href={predictionsHref}>
                {copy.openPredictions}
              </Link>
              <Link className="rounded-[1.25rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={rankingsHref}>
                {copy.openRankings}
              </Link>
              {isOwner ? (
                <Link className="rounded-[1.25rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={manageMembersHref}>
                  {copy.manageMembersShortcut}
                </Link>
              ) : null}
              <Link className="rounded-[1.25rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/groups?lang=${locale}`}>
                {copy.backToGroups}
              </Link>
              <Link className="rounded-[1.25rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?lang=${locale}`}>
                {copy.createAnotherGroup}
              </Link>
            </div>
            <p className="muted-copy mt-4 text-sm leading-7 sm:text-base">
              {copy.groupSlugPrefix}: {routeParams.groupSlug}. {copy.futureEntryPoints}
            </p>
          </article>

          {isOwner ? (
            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5" id="group-member-management">
              <h2 className="text-xl font-semibold text-white">{copy.manageMembersTitle}</h2>
              <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">
                {copy.manageMembersDescription}
              </p>
              <p className="mt-3 rounded-[1.25rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-sm leading-7 text-emerald-50 sm:text-base">
                {copy.removeMemberHint}
              </p>
              <div className="mt-4 grid gap-3">
                {memberManagementUnavailable ? (
                  <article className="rounded-[1.25rem] border border-rose-400/20 bg-rose-400/10 px-4 py-4">
                    <h3 className="text-sm font-semibold text-white">{copy.managementUnavailableTitle}</h3>
                    <p className="muted-copy mt-2 text-sm leading-6">{copy.managementUnavailableDescription}</p>
                    {memberManagementErrorDetail ? <p className="mt-2 text-xs leading-6 text-rose-100/90">{memberManagementErrorDetail}</p> : null}
                  </article>
                ) : null}
                {!memberManagementUnavailable && !removableMembers.length ? (
                  <article className="rounded-[1.25rem] border border-white/10 px-4 py-4">
                    <h3 className="text-sm font-semibold text-white">{copy.noRemovableMembersTitle}</h3>
                    <p className="muted-copy mt-2 text-sm leading-6">{copy.noRemovableMembersDescription}</p>
                  </article>
                ) : null}
                {!memberManagementUnavailable ? members.map((member) => {
                  const isProtected = member.role === "owner" || member.user_id === user.id;

                  return (
                    <article key={member.user_id} className="rounded-[1.25rem] border border-white/10 px-4 py-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-white">{member.display_name}</p>
                          <p className="muted-copy text-sm leading-6 break-all">{member.email ?? member.user_id}</p>
                          <p className="muted-copy text-xs leading-6">{member.role === "owner" ? copy.roleOwner : copy.roleMember} · {copy.memberSinceLabel}: {formatDeadline(member.joined_at)}</p>
                        </div>
                        {isProtected ? (
                          <span className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200">{copy.ownerProtectedLabel}</span>
                        ) : (
                          <form action="/api/groups/remove-member" className="grid gap-2 sm:justify-items-end" method="post">
                            <input name="lang" type="hidden" value={locale} />
                            <input name="groupSlug" type="hidden" value={routeParams.groupSlug} />
                            <input name="groupId" type="hidden" value={groupId} />
                            <input name="groupUuid" type="hidden" value={group.id} />
                            <input name="targetUserId" type="hidden" value={member.user_id} />
                            <p className="text-xs leading-5 text-slate-400">{copy.removeMemberHint}</p>
                            <button className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/15" type="submit">
                              {copy.removeMemberAction}
                            </button>
                          </form>
                        )}
                      </div>
                    </article>
                  );
                }) : null}
              </div>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
