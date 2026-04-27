import { z } from "zod";

export const createGroupSteps = ["basics", "timing", "limits", "review"] as const;

export type CreateGroupStep = (typeof createGroupSteps)[number];

export const createGroupFormSchema = z.object({
  name: z.string().trim().min(3).max(50),
  rules: z.string().trim().min(10).max(200),
  deadline: z.string().min(1),
  maxPlayers: z.coerce.number().int().min(4).max(200),
  scoringMode: z.literal("winner_only"),
});

export type CreateGroupFormValues = z.infer<typeof createGroupFormSchema>;

export const defaultCreateGroupValues: CreateGroupFormValues = {
  name: "",
  rules: "Correct winner = 3 points. No exact-score picks.",
  deadline: "2026-06-11T18:00",
  maxPlayers: 24,
  scoringMode: "winner_only",
};

export function resolveCreateGroupStep(value: string | null | undefined): CreateGroupStep {
  if (value && createGroupSteps.includes(value as CreateGroupStep)) {
    return value as CreateGroupStep;
  }

  return "basics";
}

export function getCreateGroupStepIndex(step: CreateGroupStep) {
  return createGroupSteps.indexOf(step);
}

export function getCreateGroupValuesFromSearchParams(searchParams: Record<string, string | undefined>): CreateGroupFormValues {
  return {
    name: searchParams.name ?? defaultCreateGroupValues.name,
    rules: searchParams.rules ?? defaultCreateGroupValues.rules,
    deadline: searchParams.deadline ?? defaultCreateGroupValues.deadline,
    maxPlayers: Number(searchParams.maxPlayers ?? defaultCreateGroupValues.maxPlayers),
    scoringMode: "winner_only",
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
