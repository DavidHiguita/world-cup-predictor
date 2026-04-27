import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AccountDeletionDueRow = {
  user_id: string;
  scheduled_purge_at: string;
};

export type AccountPurgeResult = {
  purgedUserIds: string[];
  retainedUserIds: string[];
  failedUserIds: string[];
  processedAt: string;
};

export async function purgeDueAccountDeletions(): Promise<AccountPurgeResult> {
  const admin = createSupabaseAdminClient();
  const processedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("account_deletion_requests")
    .select("user_id, scheduled_purge_at")
    .eq("status", "pending")
    .lte("scheduled_purge_at", processedAt)
    .order("scheduled_purge_at", { ascending: true });

  if (error) {
    console.error(JSON.stringify({ event: "account_purge_failed", stage: "load_requests", message: error.message }));
    throw error;
  }

  const dueRequests = (data as AccountDeletionDueRow[] | null) ?? [];
  const purgedUserIds: string[] = [];
  const failedUserIds: string[] = [];

  for (const request of dueRequests) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(request.user_id);

    if (deleteError) {
      failedUserIds.push(request.user_id);
      console.error(
        JSON.stringify({
          event: "account_purge_failed",
          stage: "delete_user",
          userId: request.user_id,
          message: deleteError.message,
        }),
      );
      continue;
    }

    purgedUserIds.push(request.user_id);
  }

  return {
    purgedUserIds,
    retainedUserIds: dueRequests.filter((request) => !purgedUserIds.includes(request.user_id)).map((request) => request.user_id),
    failedUserIds,
    processedAt,
  };
}
