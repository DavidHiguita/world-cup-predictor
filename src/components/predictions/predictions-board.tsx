"use client";

import { useMemo, useState } from "react";

import { getFixtureStatus, type PredictionFixture } from "@/lib/predictions/fixtures";

import { PredictionMatchCard, type PredictionMatchCardCopy, type PredictionScoreValue } from "./prediction-match-card";

type PredictionsBoardProps = {
  fixtures: PredictionFixture[];
  groupDeadline: string;
  groupId?: string;
  groupSlug: string;
  locale: string;
  copy: PredictionMatchCardCopy;
};

type SaveResponsePayload = {
  status?: "saved" | "partial" | "closed" | "invalid" | "error";
  savedMatchIds?: string[];
  closedMatchIds?: string[];
};

type FixtureWithStatus = {
  fixture: PredictionFixture;
  status: "open" | "closed";
};

function toPredictionValue(fixture: PredictionFixture): PredictionScoreValue {
  return {
    homeScore: fixture.predictedHomeScore === null || fixture.predictedHomeScore === undefined ? "" : String(fixture.predictedHomeScore),
    awayScore: fixture.predictedAwayScore === null || fixture.predictedAwayScore === undefined ? "" : String(fixture.predictedAwayScore),
  };
}

function isComplete(prediction: PredictionScoreValue): boolean {
  return prediction.homeScore !== "" && prediction.awayScore !== "";
}

export function PredictionsBoard({ fixtures, groupDeadline, groupId, groupSlug, locale, copy }: PredictionsBoardProps) {
  const initialSelections = useMemo(
    () => Object.fromEntries(fixtures.map((fixture) => [fixture.id, toPredictionValue(fixture)])),
    [fixtures],
  );
  const [selectedByMatchId, setSelectedByMatchId] = useState<Record<string, PredictionScoreValue>>(initialSelections);
  const [savedByMatchId, setSavedByMatchId] = useState<Record<string, PredictionScoreValue>>(initialSelections);
  const [forcedClosedMatchIds, setForcedClosedMatchIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const forcedClosedSet = useMemo(() => new Set(forcedClosedMatchIds), [forcedClosedMatchIds]);
  const fixturesWithStatus = useMemo<FixtureWithStatus[]>(
    () =>
      fixtures.map((fixture) => ({
        fixture,
        status: forcedClosedSet.has(fixture.id) ? "closed" : getFixtureStatus(fixture.kickoffAt, groupDeadline),
      })),
    [fixtures, forcedClosedSet, groupDeadline],
  );
  const dirtyFixtures = fixturesWithStatus.filter(({ fixture, status }) => {
    const selectedPrediction = selectedByMatchId[fixture.id] ?? toPredictionValue(fixture);
    const savedPrediction = savedByMatchId[fixture.id] ?? toPredictionValue(fixture);

    return status === "open" && isComplete(selectedPrediction) && (selectedPrediction.homeScore !== savedPrediction.homeScore || selectedPrediction.awayScore !== savedPrediction.awayScore);
  });
  const openMatchesCount = fixturesWithStatus.filter(({ status }) => status === "open").length;
  const unsavedChangesCount = dirtyFixtures.length;
  const hasUnsavedChanges = dirtyFixtures.length > 0;
  const savedPredictionCount = Object.values(savedByMatchId).filter((prediction) => isComplete(prediction)).length;
  const helperText = hasUnsavedChanges ? copy.pendingChanges : savedPredictionCount > 0 ? copy.allChangesSaved : copy.bulkSelectionHint;
  const noticeToneClass = notice === copy.notices.saved
    ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-50"
    : notice === copy.notices.partial
      ? "border border-amber-400/20 bg-amber-400/10 text-amber-50"
      : notice === copy.notices.closed
        ? "border border-rose-400/20 bg-rose-400/10 text-rose-50"
        : notice
          ? "border border-rose-400/20 bg-rose-400/10 text-rose-50"
          : "";

  function handleResetChanges() {
    setSelectedByMatchId(savedByMatchId);
    setNotice(null);
  }

  async function handleSaveAll() {
    if (!hasUnsavedChanges || isSaving) {
      return;
    }

    setIsSaving(true);
    setNotice(null);

    try {
      const formData = new FormData();
      if (groupId) {
        formData.set("groupId", groupId);
      }
      formData.set("groupSlug", groupSlug);
      formData.set(
        "predictions",
        JSON.stringify(
          dirtyFixtures.map(({ fixture }) => ({
            matchId: fixture.id,
            homeScore: selectedByMatchId[fixture.id]?.homeScore ?? "",
            awayScore: selectedByMatchId[fixture.id]?.awayScore ?? "",
          })),
        ),
      );
      formData.set("lang", locale);

      const response = await fetch("/api/predictions/save", {
        method: "POST",
        body: formData,
        headers: {
          "x-requested-with": "fetch",
        },
      });
      const data = (await response.json()) as SaveResponsePayload;

      if (data.status === "saved") {
        const nextSavedByMatchId = { ...savedByMatchId };

        (data.savedMatchIds ?? dirtyFixtures.map(({ fixture }) => fixture.id)).forEach((matchId) => {
          nextSavedByMatchId[matchId] = selectedByMatchId[matchId] ?? { homeScore: "", awayScore: "" };
        });

        setSavedByMatchId(nextSavedByMatchId);
        setNotice(copy.notices.saved);
      } else if (data.status === "partial") {
        const nextSavedByMatchId = { ...savedByMatchId };
        const nextSelectedByMatchId = { ...selectedByMatchId };

        (data.savedMatchIds ?? []).forEach((matchId) => {
          nextSavedByMatchId[matchId] = selectedByMatchId[matchId] ?? { homeScore: "", awayScore: "" };
        });

        (data.closedMatchIds ?? []).forEach((matchId) => {
          nextSelectedByMatchId[matchId] = savedByMatchId[matchId] ?? { homeScore: "", awayScore: "" };
        });

        setSavedByMatchId(nextSavedByMatchId);
        setSelectedByMatchId(nextSelectedByMatchId);
        setForcedClosedMatchIds((current) => Array.from(new Set([...current, ...(data.closedMatchIds ?? [])])));
        setNotice(copy.notices.partial);
      } else if (data.status === "closed") {
        const nextSelectedByMatchId = { ...selectedByMatchId };

        (data.closedMatchIds ?? dirtyFixtures.map(({ fixture }) => fixture.id)).forEach((matchId) => {
          nextSelectedByMatchId[matchId] = savedByMatchId[matchId] ?? { homeScore: "", awayScore: "" };
        });

        setSelectedByMatchId(nextSelectedByMatchId);
        setForcedClosedMatchIds((current) => Array.from(new Set([...current, ...(data.closedMatchIds ?? [])])));
        setNotice(copy.notices.closed);
      } else if (data.status === "invalid") {
        setNotice(copy.notices.invalid);
      } else {
        setNotice(copy.notices.error);
      }
    } catch {
      setNotice(copy.notices.error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.summaryTitle}</h2>
          <div className="mt-4 grid gap-3 text-sm leading-7 sm:text-base">
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.openMatchesLabel}: {openMatchesCount}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.savedPredictionsLabel}: {savedPredictionCount} / {fixtures.length}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.unsavedChangesLabel}: {unsavedChangesCount}</div>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 xl:col-span-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{copy.saveAllPicks}</h2>
              <p className="muted-copy mt-3 text-sm leading-6">{helperText}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${hasUnsavedChanges ? "border border-amber-400/20 bg-amber-400/10 text-amber-100" : "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100"}`}>
                {hasUnsavedChanges ? copy.unsavedState : copy.savedState}
              </span>
              <button
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-400"
                disabled={!hasUnsavedChanges || isSaving}
                onClick={handleResetChanges}
                type="button"
              >
                {copy.resetChanges}
              </button>
              <button
                className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-200"
                disabled={!hasUnsavedChanges || isSaving}
                onClick={handleSaveAll}
                type="button"
              >
                {isSaving ? copy.savingAllPicks : copy.saveAllPicks}
              </button>
            </div>
          </div>
          {notice ? <p className={`mt-4 rounded-[1.25rem] px-4 py-4 text-sm font-medium ${noticeToneClass}`}>{notice}</p> : null}
        </article>
      </div>

      {fixturesWithStatus.map(({ fixture, status }) => (
        <PredictionMatchCard
          key={fixture.id}
          copy={copy}
          fixture={fixture}
          isSaving={isSaving}
          locale={locale}
          savedPrediction={savedByMatchId[fixture.id] ?? { homeScore: "", awayScore: "" }}
          selectedPrediction={selectedByMatchId[fixture.id] ?? { homeScore: "", awayScore: "" }}
          status={status}
          onChange={(field, value) => {
            if (status !== "open" || isSaving) {
              return;
            }
            setSelectedByMatchId((current) => ({
              ...current,
              [fixture.id]: {
                ...(current[fixture.id] ?? { homeScore: "", awayScore: "" }),
                [field]: value,
              },
            }));
          }}
        />
      ))}
    </div>
  );
}
