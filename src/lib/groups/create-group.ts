import { z } from "zod";

export const EXACT_SCORE_SCORING_MODE = "exact_score" as const;
export const DEFAULT_GROUP_RULES = "Exact score predictions · Exact score = 3 points · Correct outcome = 1 point.";

export const createGroupSteps = ["setup", "review"] as const;

export type CreateGroupStep = (typeof createGroupSteps)[number];

export const createGroupFormSchema = z.object({
  name: z.string().trim().min(3).max(50),
  rules: z.string().trim().min(10).max(200).default(DEFAULT_GROUP_RULES),
  deadline: z.string().min(1),
  maxPlayers: z.coerce.number().int().min(4).max(200),
  scoringMode: z.literal(EXACT_SCORE_SCORING_MODE).default(EXACT_SCORE_SCORING_MODE),
});

export type CreateGroupFormValues = z.infer<typeof createGroupFormSchema>;

export const defaultCreateGroupValues: CreateGroupFormValues = {
  name: "",
  rules: DEFAULT_GROUP_RULES,
  deadline: "2026-06-11T18:00",
  maxPlayers: 24,
  scoringMode: EXACT_SCORE_SCORING_MODE,
};

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
    rules: DEFAULT_GROUP_RULES,
    deadline: searchParams.deadline ?? defaultCreateGroupValues.deadline,
    maxPlayers: Number(searchParams.maxPlayers ?? defaultCreateGroupValues.maxPlayers),
    scoringMode: EXACT_SCORE_SCORING_MODE,
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
