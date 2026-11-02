import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPrivatePath } from "@/lib/seo";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (isPrivatePath(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key || process.env.DRIVERSVOICE_MODE === "demo") return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|illustrations|icon).*)"],
};
