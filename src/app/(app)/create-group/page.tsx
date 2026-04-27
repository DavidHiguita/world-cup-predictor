import Link from "next/link";

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

type CreateGroupPageProps = {
  searchParams?: Promise<{
    lang?: string;
    step?: string;
    discard?: string;
    error?: string;
    name?: string;
    rules?: string;
    deadline?: string;
    maxPlayers?: string;
  }>;
};

function buildFlowQuery(params: {
  lang: string;
  step?: string;
  name: string;
  rules: string;
  deadline: string;
  maxPlayers: number;
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
  searchParams.set("rules", params.rules);
  searchParams.set("deadline", params.deadline);
  searchParams.set("maxPlayers", String(params.maxPlayers));

  return searchParams.toString();
}

export default async function CreateGroupPage({ searchParams }: CreateGroupPageProps) {
  const params = await searchParams;
  const locale = resolveLocale(params?.lang);
  const messages = getCommonMessages(locale);
  const copy = messages.createGroup;
  const step = resolveCreateGroupStep(params?.step);
  const values = getCreateGroupValuesFromSearchParams({
    name: params?.name,
    rules: params?.rules,
    deadline: params?.deadline,
    maxPlayers: params?.maxPlayers,
  });
  const validation = getCreateGroupValidation(values);
  const artifacts = createGroupArtifacts({
    ...defaultCreateGroupValues,
    ...values,
  });
  const currentStepIndex = getCreateGroupStepIndex(step);
  const showDiscard = params?.discard === "1";
  const submitError = resolveCreateGroupSubmitError(params?.error);
  const dashboardHref = `/dashboard?lang=${locale}`;
  const groupsHref = `/groups?lang=${locale}`;

  const basicsHref = `/create-group?${buildFlowQuery({ lang: locale, step: "basics", ...values })}`;
  const timingHref = `/create-group?${buildFlowQuery({ lang: locale, step: "timing", ...values })}`;
  const limitsHref = `/create-group?${buildFlowQuery({ lang: locale, step: "limits", ...values })}`;
  const reviewHref = `/create-group?${buildFlowQuery({ lang: locale, step: "review", ...values })}`;
  const discardHref = `/create-group?${buildFlowQuery({ lang: locale, step, discard: "1", ...values })}`;

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

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.stepperTitle}</h2>
          <div className="mt-4 grid gap-3">
            {createGroupSteps.map((stepKey, index) => {
              const isCurrent = stepKey === step;
              const isComplete = index < currentStepIndex;
              const href =
                stepKey === "basics"
                  ? basicsHref
                  : stepKey === "timing"
                    ? timingHref
                    : stepKey === "limits"
                      ? limitsHref
                      : reviewHref;

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
        </article>

        <div className="grid gap-4">
          {step === "basics" ? (
            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-semibold text-white">{copy.basics.title}</h2>
              <div className="mt-4 grid gap-4">
                <div className="rounded-[1.25rem] border border-white/10 p-4">
                  <p className="text-sm font-semibold text-white">{copy.basics.nameLabel}</p>
                  <p className="muted-copy mt-2 text-sm leading-6">{values.name || copy.basics.namePlaceholder}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 p-4">
                  <p className="text-sm font-semibold text-white">{copy.basics.rulesLabel}</p>
                  <p className="muted-copy mt-2 text-sm leading-6">{values.rules}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "basics", name: "Office Predictor Cup", rules: values.rules, deadline: values.deadline, maxPlayers: values.maxPlayers })}`}>
                    {copy.basics.presets.office}
                  </Link>
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "basics", name: "Family World Cup Pool", rules: values.rules, deadline: values.deadline, maxPlayers: values.maxPlayers })}`}>
                    {copy.basics.presets.family}
                  </Link>
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "basics", name: "Friends Knockout Race", rules: values.rules, deadline: values.deadline, maxPlayers: values.maxPlayers })}`}>
                    {copy.basics.presets.friends}
                  </Link>
                </div>
              </div>
            </article>
          ) : null}

          {step === "timing" ? (
            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-semibold text-white">{copy.timing.title}</h2>
              <div className="mt-4 grid gap-4">
                <div className="rounded-[1.25rem] border border-white/10 p-4">
                  <p className="text-sm font-semibold text-white">{copy.timing.deadlineLabel}</p>
                  <p className="muted-copy mt-2 text-sm leading-6">{values.deadline}</p>
                  <p className="muted-copy mt-2 text-xs leading-6">{copy.timing.helper}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "timing", name: values.name, rules: values.rules, deadline: "2026-06-11T18:00", maxPlayers: values.maxPlayers })}`}>
                    {copy.timing.presets.first}
                  </Link>
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "timing", name: values.name, rules: values.rules, deadline: "2026-06-12T12:00", maxPlayers: values.maxPlayers })}`}>
                    {copy.timing.presets.second}
                  </Link>
                </div>
              </div>
            </article>
          ) : null}

          {step === "limits" ? (
            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-semibold text-white">{copy.limits.title}</h2>
              <div className="mt-4 grid gap-4">
                <div className="rounded-[1.25rem] border border-white/10 p-4">
                  <p className="text-sm font-semibold text-white">{copy.limits.maxPlayersLabel}</p>
                  <p className="muted-copy mt-2 text-sm leading-6">{values.maxPlayers} {copy.limits.maxPlayersSuffix}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 p-4">
                  <p className="text-sm font-semibold text-white">{copy.limits.scoringLabel}</p>
                  <p className="muted-copy mt-2 text-sm leading-6">{copy.limits.scoringSummary}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "limits", name: values.name, rules: values.rules, deadline: values.deadline, maxPlayers: 12 })}`}>
                    {copy.limits.presets.small}
                  </Link>
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "limits", name: values.name, rules: values.rules, deadline: values.deadline, maxPlayers: 24 })}`}>
                    {copy.limits.presets.medium}
                  </Link>
                  <Link className="rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={`/create-group?${buildFlowQuery({ lang: locale, step: "limits", name: values.name, rules: values.rules, deadline: values.deadline, maxPlayers: 50 })}`}>
                    {copy.limits.presets.large}
                  </Link>
                </div>
              </div>
            </article>
          ) : null}

          {step === "review" ? (
            <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-semibold text-white">{copy.review.title}</h2>
              <div className="mt-4 grid gap-3 text-sm leading-7 sm:text-base">
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.basics.nameLabel}: {values.name || copy.review.missingName}</div>
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.review.rulesLabel}: {values.rules}</div>
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.timing.deadlineLabel}: {values.deadline}</div>
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.limits.maxPlayersLabel}: {values.maxPlayers}</div>
                <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.review.scoringEnabled}</div>
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
            </article>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {currentStepIndex > 0 ? (
              <Link className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5" href={currentStepIndex === 1 ? basicsHref : currentStepIndex === 2 ? timingHref : limitsHref}>
                {copy.actions.back}
              </Link>
            ) : null}

            {step !== "review" ? (
              <Link className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300" href={currentStepIndex === 0 ? timingHref : currentStepIndex === 1 ? limitsHref : reviewHref}>
                {copy.actions.continue}
              </Link>
            ) : (
              <form action="/api/groups/create" className="contents" method="post">
                <input name="lang" type="hidden" value={locale} />
                <input name="name" type="hidden" value={values.name} />
                <input name="rules" type="hidden" value={values.rules} />
                <input name="deadline" type="hidden" value={values.deadline} />
                <input name="maxPlayers" type="hidden" value={String(values.maxPlayers)} />
                <input name="scoringMode" type="hidden" value="winner_only" />
                <button className={`rounded-full px-5 py-3 text-sm font-semibold transition ${validation.success ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "cursor-not-allowed bg-slate-700 text-slate-300"}`} disabled={!validation.success} type="submit">
                  {copy.actions.create}
                </button>
              </form>
            )}

            <Link className="rounded-full border border-rose-400/20 bg-rose-400/10 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/15" href={discardHref}>
              {copy.actions.discard}
            </Link>
          </div>
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
    </section>
  );
}
