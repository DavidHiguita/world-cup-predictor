import { NextResponse, type NextRequest } from "next/server";

import { getOptionalServerEnv } from "@/lib/env";
import { purgeDueAccountDeletions } from "@/lib/profile/purge-accounts";
import { hasSupabaseAdminEnv } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const env = getOptionalServerEnv();
  const requestSecret = request.headers.get("x-account-purge-secret") ?? "";

  if (!env?.ACCOUNT_PURGE_CRON_SECRET || requestSecret !== env.ACCOUNT_PURGE_CRON_SECRET) {
    return NextResponse.json({ status: "forbidden" }, { status: 403 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      {
        status: "unsupported",
        purgedUserIds: [],
        retainedUserIds: [],
        failedUserIds: [],
        processedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  try {
    const result = await purgeDueAccountDeletions();

    return NextResponse.json({
      status: result.failedUserIds.length > 0 ? "partial" : "ok",
      purgedUserIds: result.purgedUserIds,
      retainedUserIds: result.retainedUserIds,
      failedUserIds: result.failedUserIds,
      processedAt: result.processedAt,
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        purgedUserIds: [],
        retainedUserIds: [],
        failedUserIds: [],
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
