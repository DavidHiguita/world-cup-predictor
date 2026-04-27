"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { type Locale } from "@/lib/i18n";
import { formatFixtureKickoff } from "@/lib/predictions/fixtures";
import { type GroupRankingRow } from "@/lib/rankings/group-rankings";

type RankingsBoardCopy = {
  summaryTitle: string;
  liveStatusTitle: string;
  scoringRuleLabel: string;
  scoringRuleValue: string;
  resolvedMatchesLabel: string;
  lastUpdatedLabel: string;
  lastCheckedLabel: string;
  awaitingResults: string;
  podiumTitle: string;
  leaderboardTitle: string;
  rankLabel: string;
  playerLabel: string;
  pointsLabel: string;
  correctPicksLabel: string;
  scoredMatchesLabel: string;
  youLabel: string;
  ownerLabel: string;
  memberLabel: string;
  freshState: string;
  staleState: string;
  refreshNow: string;
  refreshingRankings: string;
  retryRefresh: string;
  syncResults: string;
  syncingResults: string;
  syncResultsHint: string;
  noResultsTitle: string;
  noResultsDescription: string;
  loadErrorTitle: string;
  loadErrorDescription: string;
  notices: {
    refreshed: string;
    stale: string;
    syncSuccess: string;
    syncUnchanged: string;
    syncFailed: string;
    syncUnsupported: string;
  };
};

type RankingsSnapshot = {
  rows: GroupRankingRow[];
  podium: GroupRankingRow[];
  resolvedMatches: number;
  lastUpdated: string | null;
  fetchedAt: string;
};

type RankingsRefreshResponse = RankingsSnapshot & {
  status: "ok";
};

type RankingsSyncResponse = {
  status: "synced" | "unchanged" | "unsupported" | "error";
  updatedMatchIds: string[];
  unchangedMatchIds: string[];
  syncedAt: string;
  rankings?: RankingsSnapshot;
};

type RankingsBoardProps = {
  copy: RankingsBoardCopy;
  locale: Locale;
  groupId: string;
  groupSlug: string;
  initialData: RankingsSnapshot;
  isOwner: boolean;
  canSyncResults: boolean;
};

function isRefreshPayload(value: RankingsRefreshResponse | { status: string }): value is RankingsRefreshResponse {
  return value.status === "ok" && "rows" in value && "podium" in value && "resolvedMatches" in value && "lastUpdated" in value && "fetchedAt" in value;
}

function formatRankingLabel(row: GroupRankingRow, copy: RankingsBoardCopy) {
  if (row.isCurrentUser) {
    return copy.youLabel;
  }

  const baseLabel = row.role === "owner" ? copy.ownerLabel : copy.memberLabel;
  return `${baseLabel} ${row.shortCode}`;
}

function getPodiumTone(index: number) {
  if (index === 0) {
    return "border border-amber-300/30 bg-amber-300/10 text-amber-50";
  }
  if (index === 1) {
    return "border border-slate-300/20 bg-slate-300/10 text-slate-50";
  }
  return "border border-orange-400/20 bg-orange-400/10 text-orange-50";
}

export function RankingsBoard({
  copy,
  locale,
  groupId,
  groupSlug,
  initialData,
  isOwner,
  canSyncResults,
}: RankingsBoardProps) {
  const [rows, setRows] = useState(initialData.rows);
  const [podium, setPodium] = useState(initialData.podium);
  const [resolvedMatches, setResolvedMatches] = useState(initialData.resolvedMatches);
  const [lastUpdated, setLastUpdated] = useState(initialData.lastUpdated);
  const [lastCheckedAt, setLastCheckedAt] = useState(initialData.fetchedAt);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => new Date(initialData.fetchedAt).getTime());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const isStale = useMemo(() => {
    if (loadError) {
      return true;
    }

    return currentTimestamp - new Date(lastCheckedAt).getTime() > 120_000;
  }, [currentTimestamp, lastCheckedAt, loadError]);

  const statusLabel = isStale ? copy.staleState : copy.freshState;
  const statusToneClass = isStale
    ? "border border-amber-400/20 bg-amber-400/10 text-amber-100"
    : "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  const noticeToneClass = notice === copy.notices.refreshed || notice === copy.notices.syncSuccess
    ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-50"
    : notice === copy.notices.stale || notice === copy.notices.syncUnchanged
      ? "border border-amber-400/20 bg-amber-400/10 text-amber-50"
      : notice
        ? "border border-rose-400/20 bg-rose-400/10 text-rose-50"
        : "";

  function applySnapshot(snapshot: RankingsSnapshot) {
    setRows(snapshot.rows);
    setPodium(snapshot.podium);
    setResolvedMatches(snapshot.resolvedMatches);
    setLastUpdated(snapshot.lastUpdated);
    setLastCheckedAt(snapshot.fetchedAt);
    setCurrentTimestamp(new Date(snapshot.fetchedAt).getTime());
    setLoadError(false);
  }

  const refreshRankings = useCallback(async (showSuccessNotice = true) => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const params = new URLSearchParams();
      params.set("groupId", groupId);
      params.set("groupSlug", groupSlug);
      const response = await fetch(`/api/rankings?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "x-requested-with": "fetch",
        },
      });
      const payload = (await response.json()) as RankingsRefreshResponse | { status: string };

      if (!response.ok || !isRefreshPayload(payload)) {
        throw new Error("refresh_failed");
      }

      applySnapshot(payload);
      if (showSuccessNotice) {
        setNotice(copy.notices.refreshed);
      }
    } catch {
      setLoadError(true);
      setNotice(copy.notices.stale);
    } finally {
      setIsRefreshing(false);
    }
  }, [copy.notices.refreshed, copy.notices.stale, groupId, groupSlug, isRefreshing]);

  async function handleSyncResults() {
    if (!isOwner || isSyncing) {
      return;
    }

    if (!canSyncResults) {
      setNotice(copy.notices.syncUnsupported);
      return;
    }

    setIsSyncing(true);

    try {
      const response = await fetch("/api/results/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "fetch",
        },
        body: JSON.stringify({
          groupId,
          groupSlug,
        }),
      });
      const payload = (await response.json()) as RankingsSyncResponse;

      if (payload.status === "unsupported") {
        setNotice(copy.notices.syncUnsupported);
        return;
      }

      if (!response.ok || payload.status === "error" || !payload.rankings) {
        throw new Error("sync_failed");
      }

      applySnapshot(payload.rankings);
      setNotice(payload.status === "unchanged" ? copy.notices.syncUnchanged : copy.notices.syncSuccess);
    } catch {
      setNotice(copy.notices.syncFailed);
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    const freshnessIntervalId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 30_000);
    const intervalId = window.setInterval(() => {
      void refreshRankings(false);
    }, 60_000);

    return () => {
      window.clearInterval(freshnessIntervalId);
      window.clearInterval(intervalId);
    };
  }, [refreshRankings]);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.summaryTitle}</h2>
          <div className="mt-4 grid gap-3 text-sm leading-7 sm:text-base">
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.scoringRuleLabel}: {copy.scoringRuleValue}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.resolvedMatchesLabel}: {resolvedMatches}</div>
            <div className="rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.lastUpdatedLabel}: {lastUpdated ? formatFixtureKickoff(lastUpdated, locale) : copy.awaitingResults}</div>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{copy.liveStatusTitle}</h2>
              <p className="muted-copy mt-3 text-sm leading-6">{copy.lastCheckedLabel}: {formatFixtureKickoff(lastCheckedAt, locale)}</p>
              {isOwner ? <p className="muted-copy mt-2 text-sm leading-6">{copy.syncResultsHint}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${statusToneClass}`}>
                {statusLabel}
              </span>
              <button
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-400"
                disabled={isRefreshing || isSyncing}
                onClick={() => {
                  void refreshRankings(true);
                }}
                type="button"
              >
                {isRefreshing ? copy.refreshingRankings : loadError ? copy.retryRefresh : copy.refreshNow}
              </button>
              {isOwner ? (
                <button
                  className="rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-200"
                  disabled={isRefreshing || isSyncing || !canSyncResults}
                  onClick={handleSyncResults}
                  type="button"
                >
                  {isSyncing ? copy.syncingResults : copy.syncResults}
                </button>
              ) : null}
            </div>
          </div>
          {notice ? <p className={`mt-4 rounded-[1.25rem] px-4 py-4 text-sm font-medium ${noticeToneClass}`}>{notice}</p> : null}
        </article>
      </div>

      <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-semibold text-white">{copy.podiumTitle}</h2>
        {podium.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {podium.map((row, index) => (
              <div key={row.userId} className={`rounded-[1.25rem] px-4 py-4 ${getPodiumTone(index)}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em]">#{row.rank}</p>
                <p className="mt-3 text-lg font-semibold">{formatRankingLabel(row, copy)}</p>
                <p className="mt-2 text-sm">{row.totalPoints} pts · {row.correctPicks} / {row.scoredMatches}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[1.25rem] border border-white/10 px-4 py-4 text-slate-100">{copy.awaitingResults}</div>
        )}
      </article>

      {loadError ? (
        <article className="rounded-[1.75rem] border border-amber-400/20 bg-amber-400/10 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.loadErrorTitle}</h2>
          <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">{copy.loadErrorDescription}</p>
        </article>
      ) : null}

      {resolvedMatches === 0 ? (
        <article className="rounded-[1.75rem] border border-amber-400/20 bg-amber-400/10 p-5">
          <h2 className="text-xl font-semibold text-white">{copy.noResultsTitle}</h2>
          <p className="muted-copy mt-3 text-sm leading-7 sm:text-base">{copy.noResultsDescription}</p>
        </article>
      ) : null}

      <article className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-semibold text-white">{copy.leaderboardTitle}</h2>
        <div className="mt-4 hidden grid-cols-[0.5fr_1.4fr_0.7fr_0.8fr_0.8fr] gap-3 rounded-[1.25rem] border border-white/10 px-4 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 md:grid">
          <div>{copy.rankLabel}</div>
          <div>{copy.playerLabel}</div>
          <div>{copy.pointsLabel}</div>
          <div>{copy.correctPicksLabel}</div>
          <div>{copy.scoredMatchesLabel}</div>
        </div>
        <div className="mt-3 grid gap-3">
          {rows.map((row) => (
            <div
              key={row.userId}
              className={`grid gap-3 rounded-[1.25rem] border px-4 py-4 text-slate-100 md:grid-cols-[0.5fr_1.4fr_0.7fr_0.8fr_0.8fr] ${row.isCurrentUser ? "border-sky-400/30 bg-sky-400/10" : "border-white/10 bg-slate-950/20"}`}
            >
              <div className="text-sm font-semibold text-sky-200 md:text-base">#{row.rank}</div>
              <div>
                <p className="text-sm font-semibold text-white md:text-base">{formatRankingLabel(row, copy)}</p>
                <p className="muted-copy mt-1 text-xs leading-6">{row.role === "owner" ? copy.ownerLabel : copy.memberLabel} · {row.shortCode}</p>
              </div>
              <div className="text-sm font-medium md:text-base">{row.totalPoints}</div>
              <div className="text-sm font-medium md:text-base">{row.correctPicks}</div>
              <div className="text-sm font-medium md:text-base">{row.scoredMatches}</div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
