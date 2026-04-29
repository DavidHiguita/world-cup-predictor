import { z } from "zod";

import {
  buildGroupRulesText,
  CORRECT_OUTCOME_POINTS,
  EXACT_SCORE_POINTS,
  MAX_SCORING_POINTS,
  MIN_CORRECT_OUTCOME_POINTS,
  MIN_EXACT_SCORE_POINTS,
  type GroupScoringSettings,
} from "@/lib/predictions/scoring";

export const EXACT_SCORE_SCORING_MODE = "exact_score" as const;

export const createGroupSteps = ["setup", "review"] as const;

export type CreateGroupStep = (typeof createGroupSteps)[number];

const scoringSettingsSchema = z
  .object({
    exactScorePoints: z.coerce.number().int().min(MIN_EXACT_SCORE_POINTS).max(MAX_SCORING_POINTS),
    correctOutcomePoints: z.coerce.number().int().min(MIN_CORRECT_OUTCOME_POINTS).max(MAX_SCORING_POINTS),
  })
  .refine((value) => value.exactScorePoints >= value.correctOutcomePoints, {
    message: "Exact-score points must be greater than or equal to correct-outcome points.",
    path: ["exactScorePoints"],
  });

export const createGroupFormSchema = z.object({
  name: z.string().trim().min(3).max(50),
  deadline: z.string().min(1),
  maxPlayers: z.coerce.number().int().min(4).max(200),
  scoringMode: z.literal(EXACT_SCORE_SCORING_MODE).default(EXACT_SCORE_SCORING_MODE),
  exactScorePoints: scoringSettingsSchema.shape.exactScorePoints,
  correctOutcomePoints: scoringSettingsSchema.shape.correctOutcomePoints,
}).refine((value) => value.exactScorePoints >= value.correctOutcomePoints, {
  message: "Exact-score points must be greater than or equal to correct-outcome points.",
  path: ["exactScorePoints"],
});

export type CreateGroupFormValues = z.infer<typeof createGroupFormSchema>;

export const defaultCreateGroupValues: CreateGroupFormValues = {
  name: "",
  deadline: "2026-06-11T18:00",
  maxPlayers: 24,
  scoringMode: EXACT_SCORE_SCORING_MODE,
  exactScorePoints: EXACT_SCORE_POINTS,
  correctOutcomePoints: CORRECT_OUTCOME_POINTS,
};

export function getCreateGroupRules(values: Pick<CreateGroupFormValues, "exactScorePoints" | "correctOutcomePoints"> | GroupScoringSettings) {
  return buildGroupRulesText({
    exactScorePoints: values.exactScorePoints,
    correctOutcomePoints: values.correctOutcomePoints,
  });
}

export function resolveCreateGroupStep(value: string | null | undefined): CreateGroupStep {
  if (value && createGroupSteps.includes(value as CreateGroupStep)) {
    return value as CreateGroupStep;
  }

  return "setup";
}

export function getCreateGroupStepIndex(step: CreateGroupStep) {
  return createGroupSteps.indexOf(step);
}

export function getCreateGroupValuesFromSearchParams(searchParams: Record<string, string | undefined>): CreateGroupFormValues {
  return {
    name: searchParams.name ?? defaultCreateGroupValues.name,
    deadline: searchParams.deadline ?? defaultCreateGroupValues.deadline,
    maxPlayers: Number(searchParams.maxPlayers ?? defaultCreateGroupValues.maxPlayers),
    scoringMode: EXACT_SCORE_SCORING_MODE,
    exactScorePoints: Number(searchParams.exactScorePoints ?? defaultCreateGroupValues.exactScorePoints),
    correctOutcomePoints: Number(searchParams.correctOutcomePoints ?? defaultCreateGroupValues.correctOutcomePoints),
  };
}

export function getCreateGroupValidation(values: CreateGroupFormValues) {
  return createGroupFormSchema.safeParse(values);
}

export function slugifyGroupName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "new-group";
}

export function createGroupArtifacts(values: CreateGroupFormValues) {
  const slug = slugifyGroupName(values.name);
  const normalized = slug.replace(/-/g, "").toUpperCase();
  const groupId = `${normalized.slice(0, 3).padEnd(3, "X")}${String(values.maxPlayers).padStart(3, "0")}`;
  const shareCode = `${groupId}-${slug.slice(0, 6).toUpperCase().padEnd(6, "X")}`;

  return {
    slug,
    groupId,
    shareCode,
  };
}
