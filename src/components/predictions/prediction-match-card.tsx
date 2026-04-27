"use client";

import { useMemo } from "react";

import { formatFixtureKickoff, type PredictionFixture } from "@/lib/predictions/fixtures";

export type PredictionMatchCardCopy = {
  summaryTitle: string;
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
  openBadge: string;
  closedBadge: string;
  pickHome: string;
  pickAway: string;
  savePick: string;
  savingPick: string;
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
  onSelect: (winnerCode: string) => void;
  savedWinnerCode: string;
  selectedWinnerCode: string;
  status: "open" | "closed";
  copy: PredictionMatchCardCopy;
};

export function PredictionMatchCard({ fixture, locale, onSelect, savedWinnerCode, selectedWinnerCode, status, copy }: PredictionMatchCardProps) {
  const predictedTeam = useMemo(() => {
    const winnerCode = savedWinnerCode || selectedWinnerCode;
    if (winnerCode === fixture.homeTeamCode) {
      return fixture.homeTeamName;
    }
    if (winnerCode === fixture.awayTeamCode) {
      return fixture.awayTeamName;
    }
    return null;
  }, [fixture.awayTeamCode, fixture.awayTeamName, fixture.homeTeamCode, fixture.homeTeamName, savedWinnerCode, selectedWinnerCode]);

  const isDirty = selectedWinnerCode !== savedWinnerCode;

  const homeSelected = selectedWinnerCode === fixture.homeTeamCode;
  const awaySelected = selectedWinnerCode === fixture.awayTeamCode;

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
          <p className="mt-2 text-sm leading-6">{predictedTeam ?? copy.noPickYet}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">
          <p className="text-sm font-medium text-emerald-300">{copy.windowLabel}</p>
          <p className="mt-2 text-sm leading-6">{status === "open" ? copy.windowOpen : copy.windowClosed}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          className={`rounded-[1.25rem] border px-5 py-4 text-left text-sm font-semibold transition ${homeSelected ? "border-emerald-400 bg-emerald-400/15 text-emerald-50" : "border-white/10 text-white hover:border-white/30 hover:bg-white/5"}`}
          disabled={status !== "open"}
          onClick={() => onSelect(fixture.homeTeamCode)}
          type="button"
        >
          {copy.pickHome}
        </button>
        <button
          className={`rounded-[1.25rem] border px-5 py-4 text-left text-sm font-semibold transition ${awaySelected ? "border-emerald-400 bg-emerald-400/15 text-emerald-50" : "border-white/10 text-white hover:border-white/30 hover:bg-white/5"}`}
          disabled={status !== "open"}
          onClick={() => onSelect(fixture.awayTeamCode)}
          type="button"
        >
          {copy.pickAway}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {status === "open" ? (
          <>
            <p className="muted-copy text-sm leading-6">{isDirty ? copy.pendingChanges : savedWinnerCode ? copy.updatePick : copy.selectionHint}</p>
            {savedWinnerCode && !isDirty ? (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                {copy.savedState}
              </span>
            ) : null}
            {isDirty ? (
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
