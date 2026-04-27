export type PredictionFixture = {
  id: string;
  stage: string;
  kickoffAt: string;
  homeTeamCode: string;
  homeTeamName: string;
  homeTeamFlag: string;
  awayTeamCode: string;
  awayTeamName: string;
  awayTeamFlag: string;
  venue: string;
  predictedWinnerCode?: string | null;
};

export function formatFixtureKickoff(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function getFixtureStatus(kickoffAt: string, groupDeadline: string) {
  const now = Date.now();
  const matchTime = new Date(kickoffAt).getTime();
  const deadlineTime = new Date(groupDeadline).getTime();
  const closesAt = Number.isFinite(deadlineTime) ? Math.min(matchTime, deadlineTime) : matchTime;

  return now < closesAt ? "open" : "closed";
}
