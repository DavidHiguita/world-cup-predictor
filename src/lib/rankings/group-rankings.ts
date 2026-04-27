import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";

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
};

type GroupMembershipRow = {
  user_id: string;
  role: "owner" | "member";
};

type PredictionRow = {
  user_id: string;
  match_id: string;
  predicted_winner_code: string;
};

type ResolvedMatchRow = {
  id: string;
  result_winner_code: string | null;
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

  return {
    rows,
    podium: rows.slice(0, 3),
    resolvedMatches: rows[0]?.resolvedMatches ?? 0,
    lastUpdated: rows[0]?.lastUpdated ?? null,
    currentUserRow: rows.find((row) => row.isCurrentUser) ?? null,
  };
}

async function getGroupRankingsFromAdmin(groupId: string, currentUserId: string): Promise<GroupRankingsResult> {
  const admin = createSupabaseAdminClient();
  const [{ data: membershipsData, error: membershipsError }, { data: resolvedMatchesData, error: matchesError }] = await Promise.all([
    admin.from("group_memberships").select("user_id, role").eq("group_id", groupId),
    admin.from("matches").select("id, result_winner_code, resolved_at").eq("result_status", "final").not("result_winner_code", "is", null),
  ]);

  if (membershipsError) {
    throw membershipsError;
  }

  if (matchesError) {
    throw matchesError;
  }

  const memberships = (membershipsData as GroupMembershipRow[] | null) ?? [];
  const resolvedMatches = (resolvedMatchesData as ResolvedMatchRow[] | null) ?? [];
  const resolvedMatchIds = resolvedMatches.map((match) => match.id);
  const resolvedMatchWinners = new Map(
    resolvedMatches.map((match) => [match.id, match.result_winner_code ?? ""]),
  );
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
        .select("user_id, match_id, predicted_winner_code")
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
      const winnerCode = resolvedMatchWinners.get(prediction.match_id);

      if (winnerCode && prediction.predicted_winner_code === winnerCode) {
        totalPoints += 3;
        correctPicks += 1;
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
