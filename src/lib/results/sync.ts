import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MatchResultRow = {
  id: string;
  home_team_code: string;
  away_team_code: string;
  kickoff_at: string;
  result_status: string | null;
  result_winner_code: string | null;
  home_score: number | null;
  away_score: number | null;
};

type ResultSnapshot = {
  homeTeamCode: string;
  awayTeamCode: string;
  kickoffAt: string;
  homeScore: number;
  awayScore: number;
  winnerCode: string;
  resolvedAt: string;
};

export type ResultSyncResult = {
  updatedMatchIds: string[];
  unchangedMatchIds: string[];
  syncedAt: string;
};

type MatchResultUpdate = {
  home_score: number;
  away_score: number;
  result_winner_code: string;
  result_status: string;
  resolved_at: string;
};

function buildSnapshots(): ResultSnapshot[] {
  return [
    {
      homeTeamCode: "MEX",
      awayTeamCode: "JPN",
      kickoffAt: "2026-06-12T18:00:00+00:00",
      homeScore: 2,
      awayScore: 1,
      winnerCode: "MEX",
      resolvedAt: "2026-06-12T20:05:00+00:00",
    },
    {
      homeTeamCode: "USA",
      awayTeamCode: "GHA",
      kickoffAt: "2026-06-12T21:00:00+00:00",
      homeScore: 1,
      awayScore: 2,
      winnerCode: "GHA",
      resolvedAt: "2026-06-12T23:05:00+00:00",
    },
    {
      homeTeamCode: "ARG",
      awayTeamCode: "NED",
      kickoffAt: "2026-06-13T18:00:00+00:00",
      homeScore: 3,
      awayScore: 2,
      winnerCode: "ARG",
      resolvedAt: "2026-06-13T20:10:00+00:00",
    },
  ];
}

export async function syncLatestResults(): Promise<ResultSyncResult> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id, home_team_code, away_team_code, kickoff_at, result_status, result_winner_code, home_score, away_score");

  if (error) {
    console.error(JSON.stringify({ event: "result_sync_failed", stage: "load_matches", message: error.message }));
    throw error;
  }

  const matches = (data as MatchResultRow[] | null) ?? [];
  const matchesByKey = new Map(
    matches.map((match) => [`${match.home_team_code}:${match.away_team_code}:${match.kickoff_at}`, match]),
  );
  const updatedMatchIds: string[] = [];
  const unchangedMatchIds: string[] = [];

  for (const snapshot of buildSnapshots()) {
    const key = `${snapshot.homeTeamCode}:${snapshot.awayTeamCode}:${snapshot.kickoffAt}`;
    const match = matchesByKey.get(key);

    if (!match) {
      unchangedMatchIds.push(key);
      continue;
    }

    const alreadySynced =
      match.result_status === "final" &&
      match.result_winner_code === snapshot.winnerCode &&
      match.home_score === snapshot.homeScore &&
      match.away_score === snapshot.awayScore;

    if (alreadySynced) {
      unchangedMatchIds.push(match.id);
      continue;
    }

    const updateValues: MatchResultUpdate = {
      home_score: snapshot.homeScore,
      away_score: snapshot.awayScore,
      result_winner_code: snapshot.winnerCode,
      result_status: "final",
      resolved_at: snapshot.resolvedAt,
    };

    const { error: updateError } = await (supabase
      .from("matches")
      .update(updateValues as never)
      .eq("id", match.id));

    if (updateError) {
      console.error(
        JSON.stringify({
          event: "result_sync_failed",
          stage: "update_match",
          matchId: match.id,
          message: updateError.message,
        }),
      );
      throw updateError;
    }

    updatedMatchIds.push(match.id);
  }

  return {
    updatedMatchIds,
    unchangedMatchIds,
    syncedAt: new Date().toISOString(),
  };
}
