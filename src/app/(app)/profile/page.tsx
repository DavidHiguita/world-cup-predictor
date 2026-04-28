import Link from "next/link";
import { redirect } from "next/navigation";

import { getCommonMessages, resolveLocale } from "@/lib/i18n";
import { mapAccountDeletionRequestRow, type AccountDeletionRequest } from "@/lib/profile/account-deletion";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfilePageProps = {
  searchParams?: Promise<{
    lang?: string;
    delete?: string;
  }>;
};

type ProfileGroupRow = {
  id: string;
  group_id: string;
  name: string;
  slug: string;
  deadline: string;
};

type AccountDeletionRequestRow = {
  requested_at: string;
  scheduled_purge_at: string;
  exclude_from_marketing: boolean;
  status: string;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const messages = getCommonMessages(locale);
  const copy = messages.profile;
  const deleteState = params?.delete === "confirm" || params?.delete === "requested" || params?.delete === "error" ? params.delete : null;
  const flowSuffix = `?lang=${locale}`;
  const formatDeadline = (value: string) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value));
  let profileName: string = messages.brand;
  let email: string = copy.notProvided;
  let country: string = copy.notProvided;
  let provider: string = copy.notProvided;
  let groups: ProfileGroupRow[] = [];
  let deletionRequest: AccountDeletionRequest | null = null;
  const fallbackScheduledPurgeAt = new Date("2026-07-27T12:00:00+00:00").toISOString();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?lang=${locale}&redirectTo=${encodeURIComponent(`/profile?lang=${locale}`)}`);
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const emailPrefix = user.email?.split("@")[0] ?? messages.brand;
  const derivedName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    emailPrefix;
  const derivedCountry =
    (typeof metadata.country === "string" && metadata.country) ||
    (typeof metadata.country_name === "string" && metadata.country_name) ||
    copy.notProvided;
  const providerSource = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers[0]
    : user.app_metadata?.provider;
  profileName = derivedName;
  email = user.email ?? copy.notProvided;
  country = derivedCountry;
  provider = typeof providerSource === "string" && providerSource ? providerSource : copy.notProvided;

  const [{ data: groupsData }, { data: deletionData }] = await Promise.all([
    supabase.from("groups").select("id, group_id, name, slug, deadline").order("created_at", { ascending: false }),
    supabase
      .from("account_deletion_requests")
      .select("requested_at, scheduled_purge_at, exclude_from_marketing, status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  groups = ((groupsData as ProfileGroupRow[] | null) ?? []).filter((group) => group.slug);
  deletionRequest = deletionData ? mapAccountDeletionRequestRow(deletionData as AccountDeletionRequestRow) : null;

  const showDeleteRequested = deleteState === "requested" || deletionRequest?.status === "pending";
  const showDeleteError = deleteState === "error";
  const showDeleteConfirm = deleteState === "confirm" && !showDeleteRequested;

  return (
    <section className="page-grid">
      <div>
        <p className="section-label">{copy.sectionLabel}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {copy.title}
        </h1>
        <p className="muted-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">
          {copy.description}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-[1.25rem] border border-white/10 px-4 py-4">
                <h2 className="text-lg font-semibold text-white">{copy.nameLabel}</h2>
                <p className="muted-copy mt-3 text-sm leading-6">{profileName}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 px-4 py-4">
                <h2 className="text-lg font-semibold text-white">{copy.emailLabel}</h2>
                <p className="muted-copy mt-3 text-sm leading-6 break-all">{email}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 px-4 py-4">
                <h2 className="text-lg font-semibold text-white">{copy.countryLabel}</h2>
                <p className="muted-copy mt-3 text-sm leading-6">{country}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 px-4 py-4">
                <h2 className="text-lg font-semibold text-white">{copy.providerLabel}</h2>
                <p className="muted-copy mt-3 text-sm leading-6 capitalize">{provider}</p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-semibold text-white">{copy.joinedGroupsTitle}</h2>
            <div className="mt-4 grid gap-3">
              {groups.length ? (
                groups.map((group) => (
                  <Link key={group.id} className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5" href={`/groups/${group.slug}?lang=${locale}&groupId=${encodeURIComponent(group.group_id)}`}>
                    {group.name} · group_id: {group.group_id} · {formatDeadline(group.deadline)}
                  </Link>
                ))
              ) : (
                <article className="rounded-[1.25rem] border border-white/10 px-4 py-4">
                  <h3 className="text-lg font-semibold text-white">{copy.noGroupsTitle}</h3>
                  <p className="muted-copy mt-3 text-sm leading-6">{copy.noGroupsDescription}</p>
                </article>
              )}
              <Link className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5" href={`/join-group${flowSuffix}`}>
                {copy.joinAnotherGroup}
              </Link>
            </div>
          </article>
        </div>

        <div className="grid gap-4">
          <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-semibold text-white">Account actions</h2>
            <div className="mt-4 grid gap-3">
              <form action="/auth/sign-out" className="contents" method="post">
                <button className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-left text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5" type="submit">
                  {copy.logout}
                </button>
              </form>
              <Link className="rounded-[1.25rem] border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm font-semibold text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/15" href={`/profile?lang=${locale}&delete=confirm`}>
                {copy.reviewDelete}
              </Link>
            </div>
          </article>

          {showDeleteConfirm ? (
            <article className="rounded-[1.75rem] border border-rose-400/20 bg-rose-400/10 p-5">
              <h2 className="text-xl font-semibold text-white">{copy.deleteConfirmTitle}</h2>
              <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">
                {copy.deleteConfirmDescription}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/profile${flowSuffix}`}>
                  {copy.cancel}
                </Link>
                <form action="/api/account/delete" className="contents" method="post">
                  <input name="lang" type="hidden" value={locale} />
                  <button className="rounded-full bg-rose-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-200" type="submit">
                    {copy.deleteConfirmAction}
                  </button>
                </form>
              </div>
            </article>
          ) : null}

          {showDeleteRequested ? (
            <article className="rounded-[1.75rem] border border-amber-400/20 bg-amber-400/10 p-5">
              <h2 className="text-xl font-semibold text-white">{copy.deleteRequestedTitle}</h2>
              <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">{copy.deleteRequestedDescription}</p>
              <div className="mt-4 grid gap-3 text-sm leading-7 sm:text-base">
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.retentionLabel}: {formatDeadline(deletionRequest?.scheduledPurgeAt ?? fallbackScheduledPurgeAt)}</div>
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.marketingLabel}: {copy.marketingExcluded}</div>
              </div>
            </article>
          ) : null}

          {showDeleteError ? (
            <article className="rounded-[1.75rem] border border-rose-400/20 bg-rose-400/10 p-5">
              <h2 className="text-xl font-semibold text-white">{copy.deleteErrorTitle}</h2>
              <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">{copy.deleteErrorDescription}</p>
            </article>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5"
          href={`/dashboard${flowSuffix}`}
        >
          {copy.backToDashboard}
        </Link>
        <Link
          className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5"
          href={`/groups${flowSuffix}`}
        >
          {copy.goToGroups}
        </Link>
      </div>
    </section>
  );
}
