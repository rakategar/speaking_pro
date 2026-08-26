// Auth cookie name, pinned instead of derived.
//
// supabase-js defaults the auth storage key to
// `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`. That made the
// cookie name a hidden dependency of NEXT_PUBLIC_SUPABASE_URL: when the app
// moved off `speakingpro.online` (cookie `sb-speakingpro-auth-token`) onto
// `app.speakingpro.online`, the derived name would silently become
// `sb-app-auth-token` and every already-signed-in user would be bounced to
// /login with no error and no way to tell why.
//
// Pinning it keeps existing sessions valid across that move and makes the
// Supabase origin a free variable we can point anywhere. Do not change this
// string -- it is the literal cookie name live in users' browsers.
export const SUPABASE_AUTH_COOKIE_NAME = "sb-speakingpro-auth-token";
