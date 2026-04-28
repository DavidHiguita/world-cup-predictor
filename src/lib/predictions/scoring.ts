export const DRAW_OUTCOME_CODE = "DRAW";
export const EXACT_SCORE_POINTS = 3;
export const CORRECT_OUTCOME_POINTS = 1;
export const MAX_PREDICTION_SCORE = 99;

export type ScorePrediction = {
  homeScore: number;
  awayScore: number;
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

export function getPredictionPoints(
  prediction: ScorePrediction,
  resolved: ScorePrediction,
  homeTeamCode: string,
  awayTeamCode: string,
) {
  if (prediction.homeScore === resolved.homeScore && prediction.awayScore === resolved.awayScore) {
    return EXACT_SCORE_POINTS;
  }

  const predictedOutcome = getOutcomeCode(prediction.homeScore, prediction.awayScore, homeTeamCode, awayTeamCode);
  const resolvedOutcome = getOutcomeCode(resolved.homeScore, resolved.awayScore, homeTeamCode, awayTeamCode);

  return predictedOutcome === resolvedOutcome ? CORRECT_OUTCOME_POINTS : 0;
}

export function isExactScoreHit(prediction: ScorePrediction, resolved: ScorePrediction) {
  return prediction.homeScore === resolved.homeScore && prediction.awayScore === resolved.awayScore;
}
