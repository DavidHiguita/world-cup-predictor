import Link from "next/link";
import { redirect } from "next/navigation";

import { getCommonMessages, resolveLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type GroupListRow = {
  id: string;
  group_id: string;
  name: string;
  slug: string;
  deadline: string;
};

type GroupsPageProps = {
  searchParams?: Promise<{
    lang?: string;
  }>;
};

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const messages = getCommonMessages(locale);
  const copy = messages.createGroup.linkedPages;
  const formatDeadline = (value: string) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value));
  let groups: GroupListRow[] = [];
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?lang=${locale}&redirectTo=${encodeURIComponent(`/groups?lang=${locale}`)}`);
  }

  const { data } = await supabase.from("groups").select("id, group_id, name, slug, deadline").order("created_at", { ascending: false });
  groups = ((data as GroupListRow[] | null) ?? []).filter((group) => group.slug);

  return (
    <section className="page-grid">
      <div>
        <p className="section-label">{copy.groupsSectionLabel}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {copy.groupsTitle}
        </h1>
        <p className="muted-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">
          {copy.groupsDescription}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          {groups.length ? (
            groups.map((group) => (
              <Link
                key={group.id}
                className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 transition hover:border-sky-400/30 hover:bg-white/10"
                href={`/groups/${group.slug}?lang=${locale}&groupId=${encodeURIComponent(group.group_id)}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-sky-300">group_id: {group.group_id}</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{group.name}</h2>
                    <p className="muted-copy mt-3 text-sm leading-6">Next deadline · {formatDeadline(group.deadline)}</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100">
                    Open group
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-semibold text-white">No groups yet</h2>
              <p className="muted-copy mt-3 text-sm leading-6">Create your first group to start making predictions.</p>
            </article>
          )}
        </div>

        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.quickActionsTitle}</h2>
          <div className="mt-4 grid gap-3">
            <Link
              className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5"
              href={`/create-group?lang=${locale}`}
            >
              {copy.createNewGroup}
            </Link>
            <Link
              className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5"
              href={`/join-group?lang=${locale}`}
            >
              {copy.joinByGroupId}
            </Link>
            <Link
              className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5"
              href={`/dashboard?lang=${locale}`}
            >
              {copy.returnToDashboard}
            </Link>
          </div>
          <p className="muted-copy mt-4 text-sm leading-6">
            {copy.groupsSupportDescription}
          </p>
        </article>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5"
          href={`/dashboard?lang=${locale}`}
        >
          Back to dashboard
        </Link>
        <Link
          className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5"
          href={`/profile?lang=${locale}`}
        >
          {copy.goToProfile}
        </Link>
      </div>
    </section>
  );
}
