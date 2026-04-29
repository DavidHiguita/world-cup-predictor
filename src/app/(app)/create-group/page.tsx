import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createGroupArtifacts,
  createGroupSteps,
  defaultCreateGroupValues,
  getCreateGroupStepIndex,
  getCreateGroupValidation,
  getCreateGroupValuesFromSearchParams,
  resolveCreateGroupStep,
} from "@/lib/groups/create-group";
import { resolveCreateGroupSubmitError } from "@/lib/groups/create-group-submit";
import { getCommonMessages, resolveLocale } from "@/lib/i18n";
import { formatScoringRuleSummary } from "@/lib/predictions/scoring";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreateGroupPageProps = {
  searchParams?: Promise<{
    lang?: string;
    step?: string;
    discard?: string;
    error?: string;
    name?: string;
    deadline?: string;
    maxPlayers?: string;
    exactScorePoints?: string;
    correctOutcomePoints?: string;
  }>;
};

function buildFlowQuery(params: {
  lang: string;
  step?: string;
  name: string;
  deadline: string;
  maxPlayers: number;
  exactScorePoints: number;
  correctOutcomePoints: number;
  discard?: string;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("lang", params.lang);

  if (params.step) {
    searchParams.set("step", params.step);
  }

  if (params.discard) {
    searchParams.set("discard", params.discard);
  }

  searchParams.set("name", params.name);
  searchParams.set("deadline", params.deadline);
  searchParams.set("maxPlayers", String(params.maxPlayers));
  searchParams.set("exactScorePoints", String(params.exactScorePoints));
  searchParams.set("correctOutcomePoints", String(params.correctOutcomePoints));

  return searchParams.toString();
}

export default async function CreateGroupPage({ searchParams }: CreateGroupPageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?lang=${locale}&redirectTo=${encodeURIComponent(`/create-group?lang=${locale}`)}`);
  }

  const messages = getCommonMessages(locale);
  const copy = messages.createGroup;
  const step = resolveCreateGroupStep(params?.step);
  const values = getCreateGroupValuesFromSearchParams({
    name: params?.name,
    deadline: params?.deadline,
    maxPlayers: params?.maxPlayers,
    exactScorePoints: params?.exactScorePoints,
    correctOutcomePoints: params?.correctOutcomePoints,
  });
  const validation = getCreateGroupValidation(values);
  const artifacts = createGroupArtifacts({
    ...defaultCreateGroupValues,
    ...values,
  });
  const currentStepIndex = getCreateGroupStepIndex(step);
  const showDiscard = params?.discard === "1";
  const submitError = resolveCreateGroupSubmitError(params?.error);
  const scoringSummary = formatScoringRuleSummary(values, locale);
  const dashboardHref = `/dashboard?lang=${locale}`;
  const groupsHref = `/groups?lang=${locale}`;
  const currentFlowHref = `/create-group?${buildFlowQuery({ lang: locale, step, ...values })}`;
  const setupHref = `/create-group?${buildFlowQuery({ lang: locale, step: "setup", ...values })}`;
  const reviewHref = `/create-group?${buildFlowQuery({ lang: locale, step: "review", ...values })}`;
  const discardHref = `/create-group?${buildFlowQuery({ lang: locale, step, discard: "1", ...values })}`;

  return (
    <section className="page-grid relative">
      <div aria-hidden={showDiscard} className={showDiscard ? "pointer-events-none select-none blur-[1px]" : ""}>
      <div>
        <p className="section-label">{copy.sectionLabel}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {copy.title}
        </h1>
        <p className="muted-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">
          {copy.description}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.stepperTitle}</h2>
          <div className="mt-4 grid gap-3">
            {createGroupSteps.map((stepKey, index) => {
              const isCurrent = stepKey === step;
              const isComplete = index < currentStepIndex;
              const href = stepKey === "setup" ? setupHref : reviewHref;

              return (
                <Link
                  key={stepKey}
                  className={`rounded-[1.25rem] border px-4 py-4 text-sm font-semibold transition ${
                    isCurrent
                      ? "border-sky-400/40 bg-sky-400/10 text-white"
                      : isComplete
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                        : "border-white/10 bg-slate-950/20 text-slate-200 hover:border-white/30 hover:bg-white/5"
                  }`}
                  href={href}
                >
                  {index + 1}. {copy.steps[stepKey]}
                </Link>
              );
            })}
          </div>

          <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-slate-950/30 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">{copy.progressTitle}</h3>
            <p className="muted-copy mt-3 text-sm leading-6">
              {copy.progressDescription}
            </p>
          </div>

          <div className="mt-6 grid gap-3 text-sm leading-7 sm:text-base">
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.basics.rulesLabel}: {scoringSummary}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.limits.maxPlayersLabel}: {values.maxPlayers} {copy.limits.maxPlayersSuffix}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.timing.deadlineLabel}: {values.deadline}</div>
          </div>
        </article>

        <div className="grid gap-4">
          {step === "setup" ? (
            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-semibold text-white">{copy.basics.title}</h2>
              <form action="/create-group" className="mt-4 grid gap-4" method="get">
                <input name="lang" type="hidden" value={locale} />
                <input name="step" type="hidden" value="review" />
                <label className="grid gap-2 text-sm font-semibold text-white">
                  <span>{copy.basics.nameLabel}</span>
                  <input
                    className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-400/50"
                    defaultValue={values.name}
                    name="name"
                    placeholder={copy.basics.namePlaceholder}
                    required
                    type="text"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "setup", name: "Office Predictor Cup", deadline: values.deadline, maxPlayers: values.maxPlayers, exactScorePoints: values.exactScorePoints, correctOutcomePoints: values.correctOutcomePoints })}`}>
                    {copy.basics.presets.office}
                  </Link>
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "setup", name: "Family World Cup Pool", deadline: values.deadline, maxPlayers: values.maxPlayers, exactScorePoints: values.exactScorePoints, correctOutcomePoints: values.correctOutcomePoints })}`}>
                    {copy.basics.presets.family}
                  </Link>
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "setup", name: "Friends Knockout Race", deadline: values.deadline, maxPlayers: values.maxPlayers, exactScorePoints: values.exactScorePoints, correctOutcomePoints: values.correctOutcomePoints })}`}>
                    {copy.basics.presets.friends}
                  </Link>
                </div>
                <label className="grid gap-2 text-sm font-semibold text-white">
                  <span>{copy.timing.deadlineLabel}</span>
                  <input
                    className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50"
                    defaultValue={values.deadline}
                    name="deadline"
                    required
                    type="datetime-local"
                  />
                  <span className="muted-copy text-xs leading-6">{copy.timing.helper}</span>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "setup", name: values.name, deadline: "2026-06-11T18:00", maxPlayers: values.maxPlayers, exactScorePoints: values.exactScorePoints, correctOutcomePoints: values.correctOutcomePoints })}`}>
                    {copy.timing.presets.first}
                  </Link>
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "setup", name: values.name, deadline: "2026-06-12T12:00", maxPlayers: values.maxPlayers, exactScorePoints: values.exactScorePoints, correctOutcomePoints: values.correctOutcomePoints })}`}>
                    {copy.timing.presets.second}
                  </Link>
                </div>
                <label className="grid gap-2 text-sm font-semibold text-white">
                  <span>{copy.limits.maxPlayersLabel}</span>
                  <input
                    className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50"
                    defaultValue={String(values.maxPlayers)}
                    max="200"
                    min="4"
                    name="maxPlayers"
                    required
                    type="number"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "setup", name: values.name, deadline: values.deadline, maxPlayers: 12, exactScorePoints: values.exactScorePoints, correctOutcomePoints: values.correctOutcomePoints })}`}>
                    {copy.limits.presets.small}
                  </Link>
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "setup", name: values.name, deadline: values.deadline, maxPlayers: 24, exactScorePoints: values.exactScorePoints, correctOutcomePoints: values.correctOutcomePoints })}`}>
                    {copy.limits.presets.medium}
                  </Link>
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "setup", name: values.name, deadline: values.deadline, maxPlayers: 50, exactScorePoints: values.exactScorePoints, correctOutcomePoints: values.correctOutcomePoints })}`}>
                    {copy.limits.presets.large}
                  </Link>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">
                  <p className="text-sm font-semibold text-white">{copy.limits.scoringLabel}</p>
                  <p className="muted-copy mt-2 text-sm leading-6">{copy.limits.scoringSummary}</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-white">
                      <span>{copy.limits.exactScorePointsLabel}</span>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50"
                        defaultValue={String(values.exactScorePoints)}
                        max="10"
                        min="1"
                        name="exactScorePoints"
                        required
                        type="number"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-white">
                      <span>{copy.limits.correctOutcomePointsLabel}</span>
                      <input
                        className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50"
                        defaultValue={String(values.correctOutcomePoints)}
                        max="10"
                        min="0"
                        name="correctOutcomePoints"
                        required
                        type="number"
                      />
                    </label>
                  </div>
                  <p className="muted-copy mt-3 text-xs leading-6">{copy.limits.scoringHint}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" type="submit">
                    {copy.actions.continue}
                  </button>
                  <Link className="rounded-full border border-rose-400/20 bg-rose-400/10 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/15" href={discardHref}>
                    {copy.actions.discard}
                  </Link>
                </div>
              </form>
            </article>
          ) : (
            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-semibold text-white">{copy.review.title}</h2>
              <div className="mt-4 grid gap-3 text-sm leading-7 sm:text-base">
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.basics.nameLabel}: {values.name || copy.review.missingName}</div>
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.review.rulesLabel}: {scoringSummary}</div>
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.timing.deadlineLabel}: {values.deadline}</div>
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.limits.maxPlayersLabel}: {values.maxPlayers}</div>
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.review.scoringLocked}</div>
              </div>

              {!validation.success ? (
                <article className="mt-4 rounded-[1.25rem] border border-rose-400/20 bg-rose-400/10 p-4">
                  <h3 className="text-sm font-semibold text-white">{copy.review.validationTitle}</h3>
                  <ul className="muted-copy mt-3 grid gap-2 text-sm leading-6">
                    {validation.error.issues.map((issue) => (
                      <li key={`${issue.path.join("-")}-${issue.message}`}>{issue.message}</li>
                    ))}
                  </ul>
                </article>
              ) : null}

              {submitError ? (
                <article className="mt-4 rounded-[1.25rem] border border-rose-400/20 bg-rose-400/10 p-4">
                  <h3 className="text-sm font-semibold text-white">{copy.review.validationTitle}</h3>
                  <p className="muted-copy mt-3 text-sm leading-6">
                    {submitError === "auth"
                      ? copy.errors.authRequired
                      : submitError === "duplicate"
                        ? copy.errors.duplicate
                        : copy.errors.generic}
                  </p>
                </article>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={setupHref}>
                  {copy.actions.back}
                </Link>
                <form action="/api/groups/create" className="contents" method="post">
                  <input name="lang" type="hidden" value={locale} />
                  <input name="name" type="hidden" value={values.name} />
                  <input name="deadline" type="hidden" value={values.deadline} />
                  <input name="maxPlayers" type="hidden" value={String(values.maxPlayers)} />
                  <input name="exactScorePoints" type="hidden" value={String(values.exactScorePoints)} />
                  <input name="correctOutcomePoints" type="hidden" value={String(values.correctOutcomePoints)} />
                  <button className={`rounded-full px-5 py-3 text-sm font-semibold transition ${validation.success ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "cursor-not-allowed bg-slate-700 text-slate-300"}`} disabled={!validation.success} type="submit">
                    {copy.actions.create}
                  </button>
                </form>
                <Link className="rounded-full border border-rose-400/20 bg-rose-400/10 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/15" href={discardHref}>
                  {copy.actions.discard}
                </Link>
              </div>
            </article>
          )}
        </div>
      </div>

      {showDiscard ? (
        <article className="rounded-[1.75rem] border border-rose-400/20 bg-rose-400/10 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.discard.title}</h2>
          <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">
            {copy.discard.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step, ...values })}`}>
              {copy.discard.keepEditing}
            </Link>
            <Link className="rounded-full bg-rose-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-200" href={dashboardHref}>
              {copy.discard.confirm}
            </Link>
          </div>
        </article>
      ) : null}

      <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-semibold text-white">{copy.artifacts.title}</h2>
        <div className="mt-4 grid gap-3 text-sm leading-7 sm:grid-cols-3 sm:text-base">
          <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.artifacts.slug}: {artifacts.slug}</div>
          <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.artifacts.groupId}: {artifacts.groupId}</div>
          <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.artifacts.shareCode}: {artifacts.shareCode}</div>
        </div>
        <p className="muted-copy mt-4 text-sm leading-6">
          {copy.artifacts.description}
        </p>
      </article>

      <div className="flex flex-wrap gap-4">
        <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5" href={dashboardHref}>
          {copy.actions.backToDashboard}
        </Link>
        <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-white/5" href={groupsHref}>
          {copy.actions.browseGroups}
        </Link>
      </div>
      </div>

      {showDiscard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
          <article
            aria-describedby="create-group-discard-description"
            aria-labelledby="create-group-discard-title"
            aria-modal="true"
            className="w-full max-w-2xl rounded-[1.75rem] border border-rose-400/20 bg-slate-950/95 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.55)] sm:p-6"
            role="dialog"
          >
            <h2 className="text-2xl font-semibold text-white" id="create-group-discard-title">{copy.discard.title}</h2>
            <p className="muted-copy mt-3 text-sm leading-7 sm:text-base" id="create-group-discard-description">
              {copy.discard.description}
            </p>
            <div className="mt-5 grid gap-3 text-sm leading-7 sm:grid-cols-2 sm:text-base">
              <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.basics.nameLabel}: {values.name || copy.review.missingName}</div>
              <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.timing.deadlineLabel}: {values.deadline}</div>
              <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.limits.maxPlayersLabel}: {values.maxPlayers} {copy.limits.maxPlayersSuffix}</div>
              <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.review.rulesLabel}: {scoringSummary}</div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={currentFlowHref}>
                {copy.discard.keepEditing}
              </Link>
              <Link className="rounded-full bg-rose-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-200" href={dashboardHref}>
                {copy.discard.confirm}
              </Link>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
