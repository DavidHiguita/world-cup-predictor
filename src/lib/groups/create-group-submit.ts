export type CreateGroupSubmitError = "auth" | "duplicate" | "invalid" | "generic";

export function resolveCreateGroupSubmitError(value: string | null | undefined): CreateGroupSubmitError | null {
  if (value === "auth" || value === "duplicate" || value === "invalid" || value === "generic") {
    return value;
  }

  return null;
}
