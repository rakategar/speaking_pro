import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/appUrl";

// Password reset, step 2: turn the token_hash from the email into a session.
//
// Separate from ./callback: that route exchanges a PKCE code, which only works
// in the browser that started the flow. A reset link is routinely opened on a
// different device, where no code verifier exists -- verifyOtp is the form
// that survives that.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type === "recovery") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${APP_URL}/reset-password`);
    }
  }

  // Expired, already used, or tampered with -- all the same to the visitor.
  return NextResponse.redirect(`${APP_URL}/forgot-password?error=expired`);
}
