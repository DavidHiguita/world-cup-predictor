"use client";

import { formatFixtureKickoff, type PredictionFixture } from "@/lib/predictions/fixtures";

type ScoreField = "homeScore" | "awayScore";

export type PredictionScoreValue = {
  homeScore: string;
  awayScore: string;
};

export type PredictionMatchCardCopy = {
  summaryTitle: string;
  groupDeadlineLabel: string;
  openMatchesLabel: string;
  savedPredictionsLabel: string;
  kickoffLabel: string;
  venueLabel: string;
  homeLabel: string;
  awayLabel: string;
  yourPickLabel: string;
  noPickYet: string;
  windowLabel: string;
  windowOpen: string;
  windowClosed: string;
  homeScoreInputLabel: string;
  awayScoreInputLabel: string;
  openBadge: string;
  closedBadge: string;
  saveAllPicks: string;
  savingAllPicks: string;
  resetChanges: string;
  selectionHint: string;
  bulkSelectionHint: string;
  unsavedChangesLabel: string;
  pendingChanges: string;
  allChangesSaved: string;
  savedState: string;
  unsavedState: string;
  updatePick: string;
  lockedPick: string;
  incompleteScore: string;
  scoreSeparator: string;
  notices: {
    saved: string;
    partial: string;
    closed: string;
    invalid: string;
    error: string;
  };
};

type PredictionMatchCardProps = {
  fixture: PredictionFixture;
  locale: string;
  onChange: (field: ScoreField, value: string) => void;
  savedPrediction: PredictionScoreValue;
  selectedPrediction: PredictionScoreValue;
  status: "open" | "closed";
  isSaving: boolean;
  copy: PredictionMatchCardCopy;
};

function isComplete(prediction: PredictionScoreValue) {
  return prediction.homeScore !== "" && prediction.awayScore !== "";
}

function formatScore(prediction: PredictionScoreValue, separator: string) {
  if (!isComplete(prediction)) {
    return null;
  }

  return `${prediction.homeScore} ${separator} ${prediction.awayScore}`;
}

export function PredictionMatchCard({ fixture, locale, onChange, savedPrediction, selectedPrediction, status, isSaving, copy }: PredictionMatchCardProps) {
  const isDirty = selectedPrediction.homeScore !== savedPrediction.homeScore || selectedPrediction.awayScore !== savedPrediction.awayScore;
  const currentScore = formatScore(selectedPrediction, copy.scoreSeparator) ?? formatScore(savedPrediction, copy.scoreSeparator);
  const hasSavedScore = isComplete(savedPrediction);
  const isSelectionComplete = isComplete(selectedPrediction);

  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-300">{fixture.stage}</p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {fixture.homeTeamFlag} {fixture.homeTeamName} vs {fixture.awayTeamFlag} {fixture.awayTeamName}
          </h2>
          <p className="muted-copy mt-3 text-sm leading-6">
            {copy.kickoffLabel}: {formatFixtureKickoff(fixture.kickoffAt, locale)} · {copy.venueLabel}: {fixture.venue}
          </p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-medium ${status === "open" ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100" : "border border-rose-400/20 bg-rose-400/10 text-rose-100"}`}>
          {status === "open" ? copy.openBadge : copy.closedBadge}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">
          <p className="text-sm font-medium text-sky-300">{copy.homeLabel}</p>
          <p className="mt-2 text-sm leading-6">{fixture.homeTeamCode} · {fixture.homeTeamName}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">
          <p className="text-sm font-medium text-sky-300">{copy.awayLabel}</p>
          <p className="mt-2 text-sm leading-6">{fixture.awayTeamCode} · {fixture.awayTeamName}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">
          <p className="text-sm font-medium text-amber-300">{copy.yourPickLabel}</p>
          <p className="mt-2 text-sm leading-6">{currentScore ?? (selectedPrediction.homeScore || selectedPrediction.awayScore ? copy.incompleteScore : copy.noPickYet)}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">
          <p className="text-sm font-medium text-emerald-300">{copy.windowLabel}</p>
          <p className="mt-2 text-sm leading-6">{status === "open" ? copy.windowOpen : copy.windowClosed}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="rounded-[1.25rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white">
          <span className="block text-sm font-medium text-sky-300">{copy.homeScoreInputLabel}</span>
          <input
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={status !== "open" || isSaving}
            inputMode="numeric"
            max="99"
            min="0"
            onChange={(event) => onChange("homeScore", event.target.value.replace(/[^\d]/g, "").slice(0, 2))}
            placeholder="0"
            type="number"
            value={selectedPrediction.homeScore}
          />
        </label>
        <label className="rounded-[1.25rem] border border-white/10 px-5 py-4 text-sm font-semibold text-white">
          <span className="block text-sm font-medium text-sky-300">{copy.awayScoreInputLabel}</span>
          <input
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={status !== "open" || isSaving}
            inputMode="numeric"
            max="99"
            min="0"
            onChange={(event) => onChange("awayScore", event.target.value.replace(/[^\d]/g, "").slice(0, 2))}
            placeholder="0"
            type="number"
            value={selectedPrediction.awayScore}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {status === "open" ? (
          <>
            <p className="muted-copy text-sm leading-6">{isDirty ? copy.pendingChanges : hasSavedScore ? copy.updatePick : copy.selectionHint}</p>
            {hasSavedScore && !isDirty ? (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                {copy.savedState}
              </span>
            ) : null}
            {isDirty && isSelectionComplete ? (
              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                {copy.unsavedState}
              </span>
            ) : null}
          </>
        ) : (
          <p className="muted-copy text-sm leading-6">{copy.lockedPick}</p>
        )}
      </div>
    </article>
  );
}
