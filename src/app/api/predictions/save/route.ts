import { NextResponse, type NextRequest } from "next/server";

import { getPendingAccountDeletionRequest } from "@/lib/profile/account-deletion";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

function wantsJson(request: NextRequest) {
  return request.headers.get("x-requested-with") === "fetch";
}

function buildRedirectUrl(request: NextRequest, groupSlug: string, lang: string, code: string, groupId: string) {
  const url = new URL(`/groups/${groupSlug}/predictions`, request.url);
  url.searchParams.set("lang", lang);
  url.searchParams.set("status", code);
  if (groupId) {
    url.searchParams.set("groupId", groupId);
  }
  return url;
}

type PredictionInput = {
  matchId: string;
  predictedWinnerCode: string;
};

type SaveResponsePayload = {
  status: "saved" | "partial" | "closed" | "invalid" | "error";
  savedMatchIds?: string[];
  closedMatchIds?: string[];
};

function parsePredictionInputs(formData: FormData) {
  const predictionsValue = formData.get("predictions");

  if (typeof predictionsValue === "string" && predictionsValue) {
    try {
      const parsed = JSON.parse(predictionsValue) as unknown;

      if (!Array.isArray(parsed)) {
        return null;
      }

      const inputs = parsed.map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const matchId = "matchId" in item ? String(item.matchId ?? "") : "";
        const predictedWinnerCode = "predictedWinnerCode" in item ? String(item.predictedWinnerCode ?? "") : "";

        if (!matchId || !predictedWinnerCode) {
          return null;
        }

        return {
          matchId,
          predictedWinnerCode,
        } satisfies PredictionInput;
      });

      return inputs.every(Boolean) ? (inputs as PredictionInput[]) : null;
    } catch {
      return null;
    }
  }

  const matchId = String(formData.get("matchId") ?? "");
  const predictedWinnerCode = String(formData.get("predictedWinnerCode") ?? "");

  if (!matchId || !predictedWinnerCode) {
    return [];
  }

  return [
    {
      matchId,
      predictedWinnerCode,
    },
  ] satisfies PredictionInput[];
}

type GroupRow = {
  id: string;
  group_id: string;
  slug: string;
  deadline: string;
};

type MatchRow = {
  id: string;
  kickoff_at: string;
  home_team_code: string;
  away_team_code: string;
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const predictionInputs = parsePredictionInputs(formData);
  const groupId = String(formData.get("groupId") ?? "");
  const groupSlug = String(formData.get("groupSlug") ?? "");
  const lang = String(formData.get("lang") ?? "en");
  const response = NextResponse.next();
  const supabase = createSupabaseRouteHandlerClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const respond = (payload: SaveResponsePayload, status = 200) => {
    if (wantsJson(request)) {
      return NextResponse.json(payload, { status });
    }

    return NextResponse.redirect(buildRedirectUrl(request, groupSlug || "groups", lang, payload.status, groupId));
  };

  if (!user || !groupSlug || !predictionInputs || predictionInputs.length === 0) {
    return respond({ status: "invalid" }, 400);
  }

  const pendingAccountDeletion = await getPendingAccountDeletionRequest(supabase, user.id);

  if (pendingAccountDeletion) {
    return respond({ status: "error" }, 403);
  }

  let group: GroupRow | null = null;

  if (groupId) {
    const { data } = await supabase.from("groups").select("id, group_id, slug, deadline").eq("group_id", groupId).maybeSingle();
    group = (data as GroupRow | null) ?? null;
  }

  if (!group) {
    const { data } = await supabase.from("groups").select("id, group_id, slug, deadline").eq("slug", groupSlug).maybeSingle();
    group = (data as GroupRow | null) ?? null;
  }

  if (!group) {
    return respond({ status: "invalid" }, 404);
  }

  const dedupedInputs = Array.from(new Map(predictionInputs.map((input) => [input.matchId, input])).values());
  const matchIds = dedupedInputs.map((input) => input.matchId);
  const { data: matchesData } = await supabase
    .from("matches")
    .select("id, kickoff_at, home_team_code, away_team_code")
    .in("id", matchIds);
  const matches = (matchesData as MatchRow[] | null) ?? [];
  const matchesById = new Map(matches.map((match) => [match.id, match]));
  const closedMatchIds: string[] = [];
  const savedMatchIds: string[] = [];
  const upserts = dedupedInputs.map((input) => {
    const match = matchesById.get(input.matchId);

    if (!match || ![match.home_team_code, match.away_team_code].includes(input.predictedWinnerCode)) {
      return null;
    }

    const closesAt = Math.min(new Date(group.deadline).getTime(), new Date(match.kickoff_at).getTime());

    if (Date.now() >= closesAt) {
      closedMatchIds.push(match.id);
      return undefined;
    }

    savedMatchIds.push(match.id);

    return {
      group_id: group.id,
      match_id: match.id,
      user_id: user.id,
      predicted_winner_code: input.predictedWinnerCode,
      updated_at: new Date().toISOString(),
    };
  });

  if (upserts.includes(null)) {
    return respond({ status: "invalid" }, 400);
  }

  const rowsToSave = upserts.filter((row): row is NonNullable<(typeof upserts)[number]> => Boolean(row));

  if (rowsToSave.length === 0) {
    return respond({ status: "closed", closedMatchIds }, 409);
  }

  const { error } = await supabase.from("predictions").upsert(rowsToSave, { onConflict: "group_id,match_id,user_id" });

  if (error) {
    return respond({ status: "error" }, 500);
  }

  if (closedMatchIds.length > 0) {
    return respond({ status: "partial", savedMatchIds, closedMatchIds }, 207);
  }

  return respond({ status: "saved", savedMatchIds });
}
