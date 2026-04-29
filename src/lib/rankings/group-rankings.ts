import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { DEFAULT_GROUP_SCORING_SETTINGS, getPredictionPoints, isExactScoreHit, type GroupScoringSettings } from "@/lib/predictions/scoring";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type GroupRankingRpcRow = {
  user_id: string;
  role: "owner" | "member";
  total_points: number;
  correct_picks: number;
  scored_matches: number;
  rank: number;
  resolved_matches: number;
  last_updated: string | null;
  exact_score_points: number;
  correct_outcome_points: number;
};

export type GroupRankingRow = {
  userId: string;
  role: "owner" | "member";
  totalPoints: number;
  correctPicks: number;
  scoredMatches: number;
  rank: number;
  resolvedMatches: number;
  lastUpdated: string | null;
  isCurrentUser: boolean;
  shortCode: string;
};

export type GroupRankingsResult = {
  rows: GroupRankingRow[];
  podium: GroupRankingRow[];
  resolvedMatches: number;
  lastUpdated: string | null;
  currentUserRow: GroupRankingRow | null;
  scoring: GroupScoringSettings;
};

type GroupScoringRow = {
  exact_score_points: number;
  correct_outcome_points: number;
};

type GroupMembershipRow = {
  user_id: string;
  role: "owner" | "member";
};

type PredictionRow = {
  user_id: string;
  match_id: string;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
};

type ResolvedMatchRow = {
  id: string;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
  resolved_at: string | null;
};

function mapRows(data: GroupRankingRpcRow[] | null, currentUserId: string): GroupRankingsResult {
  const rows = (data ?? []).map((row) => ({
    userId: row.user_id,
    role: row.role,
    totalPoints: row.total_points,
    correctPicks: row.correct_picks,
    scoredMatches: row.scored_matches,
    rank: row.rank,
    resolvedMatches: row.resolved_matches,
    lastUpdated: row.last_updated,
    isCurrentUser: row.user_id === currentUserId,
    shortCode: row.user_id.replace(/-/g, "").slice(0, 4).toUpperCase(),
  }));
  const scoring = data?.[0]
    ? {
        exactScorePoints: data[0].exact_score_points,
        correctOutcomePoints: data[0].correct_outcome_points,
      }
    : DEFAULT_GROUP_SCORING_SETTINGS;

  return {
    rows,
    podium: rows.slice(0, 3),
    resolvedMatches: rows[0]?.resolvedMatches ?? 0,
    lastUpdated: rows[0]?.lastUpdated ?? null,
    currentUserRow: rows.find((row) => row.isCurrentUser) ?? null,
    scoring,
  };
}

async function getGroupRankingsFromAdmin(groupId: string, currentUserId: string): Promise<GroupRankingsResult> {
  const admin = createSupabaseAdminClient();
  const [{ data: membershipsData, error: membershipsError }, { data: resolvedMatchesData, error: matchesError }, { data: groupData, error: groupError }] = await Promise.all([
    admin.from("group_memberships").select("user_id, role").eq("group_id", groupId),
    admin.from("matches").select("id, home_team_code, away_team_code, home_score, away_score, resolved_at").eq("result_status", "final").not("home_score", "is", null).not("away_score", "is", null),
    admin.from("groups").select("exact_score_points, correct_outcome_points").eq("id", groupId).maybeSingle(),
  ]);

  if (membershipsError) {
    throw membershipsError;
  }

  if (matchesError) {
    throw matchesError;
  }

  if (groupError) {
    throw groupError;
  }

  const memberships = (membershipsData as GroupMembershipRow[] | null) ?? [];
  const resolvedMatches = (resolvedMatchesData as ResolvedMatchRow[] | null) ?? [];
  const scoring = groupData
    ? {
        exactScorePoints: (groupData as GroupScoringRow).exact_score_points,
        correctOutcomePoints: (groupData as GroupScoringRow).correct_outcome_points,
      }
    : DEFAULT_GROUP_SCORING_SETTINGS;
  const resolvedMatchIds = resolvedMatches.map((match) => match.id);
  const resolvedMatchesById = new Map(resolvedMatches.map((match) => [match.id, match]));
  const lastUpdated = resolvedMatches.reduce<string | null>((latest, match) => {
    if (!match.resolved_at) {
      return latest;
    }

    if (!latest || new Date(match.resolved_at).getTime() > new Date(latest).getTime()) {
      return match.resolved_at;
    }

    return latest;
  }, null);

  const { data: predictionsData, error: predictionsError } = resolvedMatchIds.length
    ? await admin
        .from("predictions")
        .select("user_id, match_id, predicted_home_score, predicted_away_score")
        .eq("group_id", groupId)
        .in("match_id", resolvedMatchIds)
    : { data: [], error: null };

  if (predictionsError) {
    throw predictionsError;
  }

  const predictions = (predictionsData as PredictionRow[] | null) ?? [];
  const predictionsByUser = new Map<string, PredictionRow[]>();

  for (const prediction of predictions) {
    const existing = predictionsByUser.get(prediction.user_id) ?? [];
    existing.push(prediction);
    predictionsByUser.set(prediction.user_id, existing);
  }

  const scoredRows = memberships.map((membership) => {
    const userPredictions = predictionsByUser.get(membership.user_id) ?? [];
    let totalPoints = 0;
    let correctPicks = 0;

    for (const prediction of userPredictions) {
      const resolvedMatch = resolvedMatchesById.get(prediction.match_id);

      if (
        resolvedMatch &&
        resolvedMatch.home_score !== null &&
        resolvedMatch.away_score !== null &&
        prediction.predicted_home_score !== null &&
        prediction.predicted_away_score !== null
      ) {
        totalPoints += getPredictionPoints(
          {
            homeScore: prediction.predicted_home_score,
            awayScore: prediction.predicted_away_score,
          },
          {
            homeScore: resolvedMatch.home_score,
            awayScore: resolvedMatch.away_score,
          },
          resolvedMatch.home_team_code,
          resolvedMatch.away_team_code,
          scoring,
        );

        if (
          isExactScoreHit(
            {
              homeScore: prediction.predicted_home_score,
              awayScore: prediction.predicted_away_score,
            },
            {
              homeScore: resolvedMatch.home_score,
              awayScore: resolvedMatch.away_score,
            },
          )
        ) {
          correctPicks += 1;
        }
      }
    }

    return {
      userId: membership.user_id,
      role: membership.role,
      totalPoints,
      correctPicks,
      scoredMatches: userPredictions.length,
      resolvedMatches: resolvedMatches.length,
      lastUpdated,
      isCurrentUser: membership.user_id === currentUserId,
      shortCode: membership.user_id.replace(/-/g, "").slice(0, 4).toUpperCase(),
    };
  });

  const sortedRows = scoredRows.sort((left, right) => {
    if (right.totalPoints !== left.totalPoints) {
      return right.totalPoints - left.totalPoints;
    }

    if (right.correctPicks !== left.correctPicks) {
      return right.correctPicks - left.correctPicks;
    }

    if (right.scoredMatches !== left.scoredMatches) {
      return right.scoredMatches - left.scoredMatches;
    }

    return left.userId.localeCompare(right.userId);
  });

  let previousKey = "";
  let previousRank = 0;

  const rows = sortedRows.map((row, index) => {
    const rankKey = `${row.totalPoints}:${row.correctPicks}:${row.scoredMatches}`;
    const rank = rankKey === previousKey ? previousRank : index + 1;
    previousKey = rankKey;
    previousRank = rank;

    return {
      ...row,
      rank,
    };
  });

  return {
    rows,
    podium: rows.slice(0, 3),
    resolvedMatches: resolvedMatches.length,
    lastUpdated,
    currentUserRow: rows.find((row) => row.isCurrentUser) ?? null,
    scoring,
  };
}

export async function getGroupRankings(supabase: SupabaseServerClient, groupId: string, currentUserId: string): Promise<GroupRankingsResult> {
  const { data, error } = await supabase.rpc("get_group_rankings", {
    target_group_uuid: groupId,
  });

  if (!error) {
    return mapRows((data as GroupRankingRpcRow[] | null) ?? [], currentUserId);
  }

  if (hasSupabaseAdminEnv()) {
    return getGroupRankingsFromAdmin(groupId, currentUserId);
  }

  throw error;
}
