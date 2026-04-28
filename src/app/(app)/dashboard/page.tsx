import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DashboardGroupRow = {
  id: string;
  group_id: string;
  name: string;
  slug: string;
  deadline: string;
};

type DashboardPageProps = {
  searchParams?: Promise<{
    lang?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const formatDeadline = (value: string) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value));
  let groups: DashboardGroupRow[] = [];
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?lang=${locale}&redirectTo=${encodeURIComponent(`/dashboard?lang=${locale}`)}`);
  }

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email?.split("@")[0] ||
    "Player";

  const { data } = await supabase.from("groups").select("id, group_id, name, slug, deadline").order("created_at", { ascending: false });
  groups = ((data as DashboardGroupRow[] | null) ?? []).filter((group) => group.slug);
  const showEmptyState = groups.length === 0;

  return (
    <section className="page-grid">
      <div>
        <p className="section-label">Dashboard</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {showEmptyState ? "Welcome to your dashboard" : "Your groups at a glance"}
        </h1>
        <p className="muted-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">
          {showEmptyState
            ? "Start by creating a group or joining one with a group ID."
            : "Open your groups, check deadlines, and jump back into exact-score predictions."}
        </p>
      </div>

      {showEmptyState ? (
        <article className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-5xl">🏟️</div>
            <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">You are not in any groups yet</h2>
            <p className="muted-copy mt-4 text-base leading-8">
              Create a group for coworkers, family, or friends, or join one using a `group_id`.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" href={`/create-group?lang=${locale}`}>
                Create group
              </Link>
              <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/join-group?lang=${locale}`}>
                Join group
              </Link>
            </div>
          </div>
        </article>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-sky-300">Hello again, {displayName}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Here are your active groups</h2>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100">{groups.length} groups available</span>
            </div>

            <div className="mt-6 grid gap-4">
              {groups.map((group) => (
                <Link key={group.id} className="rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-5 transition hover:border-sky-400/30 hover:bg-white/5" href={`/groups/${group.slug}?lang=${locale}&groupId=${encodeURIComponent(group.group_id)}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{group.name}</h3>
                      <p className="muted-copy mt-2 text-sm leading-6">group_id: {group.group_id} · Predictions close {formatDeadline(group.deadline)}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100">Open group</span>
                  </div>
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-white">Next actions</h2>
            <div className="mt-6 grid gap-4">
              <Link className="rounded-[1.5rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5" href={`/groups?lang=${locale}`}>
                Browse your groups
              </Link>
              <Link className="rounded-[1.5rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5" href={`/create-group?lang=${locale}`}>
                Create a new group
              </Link>
              <Link className="rounded-[1.5rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5" href={`/profile?lang=${locale}`}>
                Open profile
              </Link>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
