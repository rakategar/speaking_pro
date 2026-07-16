import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths reachable without a session. /analyst has its own password gate;
// manifest + service worker must be public or the PWA install breaks.
// The Midtrans webhook authenticates via sha512 signature, not a session.
const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/analyst",
  "/api/analyst",
  "/api/payments/midtrans-notify",
  "/manifest.json",
  "/sw.js",
  "/icons",
];

// Exempt from the onboarding gate below: the questionnaire page itself and
// the endpoint it submits to (which flips onboarding_completed to true).
const ONBOARDING_PATH = "/onboarding";
const ONBOARDING_API_PATH = "/api/onboarding";

// Exempt from the trial hard-block below: Settings (contains logout, which
// is a pure client-side supabase.auth.signOut() call with no server route)
// and everything needed to actually complete an upgrade.
const TRIAL_EXEMPT_PATHS = [
  "/settings",
  "/help",
  "/api/help",
  "/subscription/renew",
  "/checkout",
  "/api/checkout",
  "/api/payments/subscription",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isTrialExemptPath(pathname: string) {
  return TRIAL_EXEMPT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser() --
  // the call refreshes expired auth tokens onto the response cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && !isPublicPath(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, subscription_tier, trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();
    const onboarded = profile?.onboarding_completed ?? false;

    if (
      !onboarded &&
      pathname !== ONBOARDING_PATH &&
      pathname !== ONBOARDING_API_PATH
    ) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (onboarded && pathname === ONBOARDING_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Freemium 7-day trial hard block: once trial_ends_at has passed and
    // the user hasn't upgraded, every route is locked except Settings
    // (logout) and the upgrade flow itself.
    if (
      onboarded &&
      profile?.subscription_tier !== "premium" &&
      profile?.trial_ends_at &&
      new Date(profile.trial_ends_at) < new Date() &&
      !isTrialExemptPath(pathname)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/subscription/renew";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
