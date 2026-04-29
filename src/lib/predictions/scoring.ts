import { type Locale } from "@/lib/i18n";

export const DRAW_OUTCOME_CODE = "DRAW";
export const EXACT_SCORE_POINTS = 3;
export const CORRECT_OUTCOME_POINTS = 1;
export const MIN_EXACT_SCORE_POINTS = 1;
export const MIN_CORRECT_OUTCOME_POINTS = 0;
export const MAX_SCORING_POINTS = 10;
export const MAX_PREDICTION_SCORE = 99;

export type ScorePrediction = {
  homeScore: number;
  awayScore: number;
};

export type GroupScoringSettings = {
  exactScorePoints: number;
  correctOutcomePoints: number;
};

export const DEFAULT_GROUP_SCORING_SETTINGS: GroupScoringSettings = {
  exactScorePoints: EXACT_SCORE_POINTS,
  correctOutcomePoints: CORRECT_OUTCOME_POINTS,
};

export function getOutcomeCode(homeScore: number, awayScore: number, homeTeamCode: string, awayTeamCode: string) {
  if (homeScore > awayScore) {
    return homeTeamCode;
  }

  if (awayScore > homeScore) {
    return awayTeamCode;
  }

  return DRAW_OUTCOME_CODE;
}

export function isValidScoreValue(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= MAX_PREDICTION_SCORE;
}

export function isCompleteScorePrediction(value: Partial<Record<"homeScore" | "awayScore", string | number | null | undefined>>) {
  return value.homeScore !== "" && value.homeScore !== null && value.homeScore !== undefined && value.awayScore !== "" && value.awayScore !== null && value.awayScore !== undefined;
}

export function parseScoreInput(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (!/^\d{1,2}$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);

  return isValidScoreValue(parsed) ? parsed : null;
}

export function isValidGroupScoringSettings(value: GroupScoringSettings) {
  return (
    Number.isInteger(value.exactScorePoints) &&
    Number.isInteger(value.correctOutcomePoints) &&
    value.exactScorePoints >= MIN_EXACT_SCORE_POINTS &&
    value.exactScorePoints <= MAX_SCORING_POINTS &&
    value.correctOutcomePoints >= MIN_CORRECT_OUTCOME_POINTS &&
    value.correctOutcomePoints <= MAX_SCORING_POINTS &&
    value.exactScorePoints >= value.correctOutcomePoints
  );
}

export function buildGroupRulesText(settings: GroupScoringSettings) {
  return `Exact score predictions · Exact score = ${settings.exactScorePoints} ${settings.exactScorePoints === 1 ? "point" : "points"} · Correct outcome = ${settings.correctOutcomePoints} ${settings.correctOutcomePoints === 1 ? "point" : "points"}.`;
}

export function formatScoringRuleSummary(settings: GroupScoringSettings, locale: Locale) {
  if (locale === "es") {
    return `Marcador exacto = ${settings.exactScorePoints} ${settings.exactScorePoints === 1 ? "punto" : "puntos"} · Resultado correcto = ${settings.correctOutcomePoints} ${settings.correctOutcomePoints === 1 ? "punto" : "puntos"}`;
  }

  return `Exact score = ${settings.exactScorePoints} ${settings.exactScorePoints === 1 ? "point" : "points"} · Correct outcome = ${settings.correctOutcomePoints} ${settings.correctOutcomePoints === 1 ? "point" : "points"}`;
}

export function getPredictionPoints(
  prediction: ScorePrediction,
  resolved: ScorePrediction,
  homeTeamCode: string,
  awayTeamCode: string,
  scoring: GroupScoringSettings = DEFAULT_GROUP_SCORING_SETTINGS,
) {
  if (prediction.homeScore === resolved.homeScore && prediction.awayScore === resolved.awayScore) {
    return scoring.exactScorePoints;
  }

  const predictedOutcome = getOutcomeCode(prediction.homeScore, prediction.awayScore, homeTeamCode, awayTeamCode);
  const resolvedOutcome = getOutcomeCode(resolved.homeScore, resolved.awayScore, homeTeamCode, awayTeamCode);

  return predictedOutcome === resolvedOutcome ? scoring.correctOutcomePoints : 0;
}

export function isExactScoreHit(prediction: ScorePrediction, resolved: ScorePrediction) {
  return prediction.homeScore === resolved.homeScore && prediction.awayScore === resolved.awayScore;
}
