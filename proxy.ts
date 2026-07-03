import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets; API routes still pass through so their session
  // cookies stay refreshed (each handler re-checks auth itself).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|design-reference|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
