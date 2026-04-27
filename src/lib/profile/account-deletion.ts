import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountDeletionRequest = {
  requestedAt: string;
  scheduledPurgeAt: string;
  excludeFromMarketing: boolean;
  status: "pending" | "canceled" | "completed";
};

type AccountDeletionRequestRow = {
  requested_at: string;
  scheduled_purge_at: string;
  exclude_from_marketing: boolean;
  status: string;
};

export const ACCOUNT_DELETION_PENDING_NOTICE = "deletion-pending";

export function mapAccountDeletionRequestRow(data: AccountDeletionRequestRow): AccountDeletionRequest {
  return {
    requestedAt: data.requested_at,
    scheduledPurgeAt: data.scheduled_purge_at,
    excludeFromMarketing: data.exclude_from_marketing,
    status: data.status === "canceled" || data.status === "completed" ? data.status : "pending",
  };
}

export async function getPendingAccountDeletionRequest(supabase: Pick<SupabaseClient, "from">, userId: string) {
  const { data } = await supabase
    .from("account_deletion_requests")
    .select("requested_at, scheduled_purge_at, exclude_from_marketing, status")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  return data ? mapAccountDeletionRequestRow(data as AccountDeletionRequestRow) : null;
}
