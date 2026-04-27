import Link from "next/link";
import { getCommonMessages, resolveLocale } from "@/lib/i18n";
import { mapGroupJoinPreviewRow, resolveJoinGroupStatus, type GroupJoinPreview } from "@/lib/groups/join-group";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type JoinGroupPageProps = {
  searchParams?: Promise<{
    lang?: string;
    status?: string;
    groupId?: string;
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
  member_count: number;
  join_state: string;
};

function getStatusPresentation(copy: ReturnType<typeof getCommonMessages>["joinGroup"], status: ReturnType<typeof resolveJoinGroupStatus>) {
  if (status === "invalid") {
    return {
      title: copy.invalidTitle,
      description: copy.invalidDescription,
      tone: "border-rose-400/20 bg-rose-400/10",
    };
  }

  if (status === "full") {
    return {
      title: copy.fullTitle,
      description: copy.fullDescription,
      tone: "border-amber-400/20 bg-amber-400/10",
    };
  }

  if (status === "duplicate" || status === "joined") {
    return {
      title: copy.duplicateTitle,
      description: copy.duplicateDescription,
      tone: "border-sky-400/20 bg-sky-400/10",
    };
  }

  if (status === "auth") {
    return {
      title: copy.authTitle,
      description: copy.authDescription,
      tone: "border-sky-400/20 bg-sky-400/10",
    };
  }

  if (status === "error") {
    return {
      title: copy.errorTitle,
      description: copy.errorDescription,
      tone: "border-rose-400/20 bg-rose-400/10",
    };
  }

  return {
    title: copy.previewTitle,
    description: copy.openDescription,
    tone: "border-emerald-400/20 bg-emerald-400/10",
  };
}

export default async function JoinGroupPage({ searchParams }: JoinGroupPageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const messages = getCommonMessages(locale);
  const copy = messages.joinGroup;
  const status = resolveJoinGroupStatus(params?.status);
  const groupId = String(params?.groupId ?? "").trim();
  const formatDeadline = (value: string) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value));
  let preview: GroupJoinPreview | null = null;

  if (groupId) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("get_group_join_preview_by_identifier", {
      target_group_identifier: groupId,
    });
    const previewRow = (data as GroupJoinPreviewRow[] | null)?.[0] ?? null;

    if (previewRow) {
      preview = mapGroupJoinPreviewRow(previewRow);
    }
  }

  const effectiveStatus =
    status !== "idle"
      ? status
      : groupId && !preview
        ? "invalid"
      : preview?.joinState === "full"
        ? "full"
        : preview?.joinState === "joined"
          ? "joined"
          : "idle";
  const presentation = getStatusPresentation(copy, effectiveStatus);

  return (
    <section className="page-grid">
      <div>
        <p className="section-label">{copy.sectionLabel}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
        <p className="muted-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">
          {copy.description}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <form action="/join-group" className="grid gap-4" method="get">
            <input name="lang" type="hidden" value={locale} />
            <label className="grid gap-2 text-sm font-semibold text-white">
              <span>{copy.groupIdLabel}</span>
              <input
                className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400/50"
                defaultValue={preview?.groupId ?? groupId}
                name="groupId"
                placeholder={copy.groupIdPlaceholder}
                required
                type="text"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" type="submit">
                {copy.validateAction}
              </button>
              <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/dashboard?lang=${locale}`}>
                {copy.backToDashboard}
              </Link>
            </div>
          </form>
        </article>

        <article className={`rounded-[1.75rem] border p-5 ${presentation.tone}`}>
          <h2 className="text-xl font-semibold text-white">{presentation.title}</h2>
          <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">{presentation.description}</p>
          {preview ? (
            <div className="mt-6 grid gap-3 text-sm leading-7 sm:text-base">
              <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/20 px-4 py-4 text-slate-100">{preview.name}</div>
              <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/20 px-4 py-4 text-slate-100">{copy.rulesLabel}: {preview.rules}</div>
              <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/20 px-4 py-4 text-slate-100">{copy.membersLabel}: {preview.memberCount} / {preview.maxPlayers}</div>
              <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/20 px-4 py-4 text-slate-100">{copy.deadlineLabel}: {formatDeadline(preview.deadline)}</div>
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {preview && effectiveStatus === "idle" ? (
              <form action="/api/groups/join" className="contents" method="post">
                <input name="lang" type="hidden" value={locale} />
                <input name="joinMode" type="hidden" value="groupId" />
                <input name="groupId" type="hidden" value={preview.groupId} />
                <input name="returnTo" type="hidden" value={`/join-group?lang=${locale}&groupId=${encodeURIComponent(preview.groupId)}`} />
                <button className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300" type="submit">
                  {copy.joinAction}
                </button>
              </form>
            ) : preview && (effectiveStatus === "duplicate" || effectiveStatus === "joined") ? (
              <Link className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" href={`/groups/${preview.slug}?lang=${locale}&groupId=${encodeURIComponent(preview.groupId)}`}>
                {copy.openGroup}
              </Link>
            ) : null}
            <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/groups?lang=${locale}`}>
              {copy.backToGroups}
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
