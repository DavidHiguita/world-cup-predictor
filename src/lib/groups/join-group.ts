export type GroupJoinPreview = {
  id: string;
  groupId: string;
  shareCode: string;
  slug: string;
  name: string;
  rules: string;
  deadline: string;
  maxPlayers: number;
  exactScorePoints: number;
  correctOutcomePoints: number;
  memberCount: number;
  joinState: "open" | "joined" | "full";
};

export type GroupJoinStatus = "idle" | "invalid" | "duplicate" | "full" | "joined" | "auth" | "error";

export function mapGroupJoinPreviewRow(data: {
  id: string;
  group_id: string;
  share_code: string;
  slug: string;
  name: string;
  rules: string;
  deadline: string;
  max_players: number;
  exact_score_points: number;
  correct_outcome_points: number;
  member_count: number;
  join_state: string;
}): GroupJoinPreview {
  return {
    id: data.id,
    groupId: data.group_id,
    shareCode: data.share_code,
    slug: data.slug,
    name: data.name,
    rules: data.rules,
    deadline: data.deadline,
    maxPlayers: data.max_players,
    exactScorePoints: data.exact_score_points,
    correctOutcomePoints: data.correct_outcome_points,
    memberCount: data.member_count,
    joinState: data.join_state === "joined" || data.join_state === "full" ? data.join_state : "open",
  };
}

export function resolveJoinGroupStatus(value: string | null | undefined): GroupJoinStatus {
  if (
    value === "invalid" ||
    value === "duplicate" ||
    value === "full" ||
    value === "joined" ||
    value === "auth" ||
    value === "error"
  ) {
    return value;
  }

  return "idle";
}
