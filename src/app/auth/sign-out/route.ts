import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));

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

  await supabase.auth.signOut();

  return response;
}
