// The app's public origin.
//
// Do NOT derive this from `new URL(request.url).origin` in a route handler:
// behind nginx the Host header reaching Next.js is 127.0.0.1:3300, so that
// origin redirects the visitor to https://localhost:3300 -- a dead address on
// their machine. Anything a user's browser or inbox has to follow must be
// built from this constant instead.
export const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://app.speakingpro.online";
