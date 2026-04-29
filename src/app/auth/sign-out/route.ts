import { type NextRequest } from "next/server";

import { seeOther } from "@/lib/http/redirects";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const lang = String(formData.get("lang") ?? "en");
  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("lang", lang);
  const response = seeOther(redirectUrl);

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
