import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { publicStorageUrl } from "@/lib/supabase/storage";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB, matches the bucket limit
const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);
const CATEGORIES = new Set(["bug", "pembayaran", "akun", "saran", "lainnya"]);

// POST /api/help/report -- multipart: category, message, screenshot? (File).
// Inserts a problem_reports row (visible in the analyst inbox) and, if a
// screenshot is attached, uploads it to the report-attachments bucket.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const category = String(form.get("category") ?? "").toLowerCase();
  const message = String(form.get("message") ?? "").trim();
  const screenshot = form.get("screenshot");

  if (!CATEGORIES.has(category)) {
    return NextResponse.json(
      { error: "Kategori tidak valid." },
      { status: 400 },
    );
  }
  if (message.length < 10) {
    return NextResponse.json(
      { error: "Mohon jelaskan masalah minimal 10 karakter." },
      { status: 400 },
    );
  }

  let screenshotUrl: string | null = null;
  if (screenshot instanceof File && screenshot.size > 0) {
    if (!ALLOWED_IMAGE.has(screenshot.type)) {
      return NextResponse.json(
        { error: "Screenshot harus berupa JPG, PNG, atau WebP." },
        { status: 400 },
      );
    }
    if (screenshot.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Ukuran screenshot maksimal 2 MB." },
        { status: 413 },
      );
    }
    const ext =
      screenshot.type === "image/png"
        ? "png"
        : screenshot.type === "image/webp"
          ? "webp"
          : "jpg";
    const path = `${user.id}/${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("report-attachments")
      .upload(path, screenshot, { contentType: screenshot.type });
    if (uploadError) {
      return NextResponse.json(
        { error: `Upload screenshot gagal: ${uploadError.message}` },
        { status: 500 },
      );
    }
    screenshotUrl = publicStorageUrl("report-attachments", path);
  }

  const { error: insertError } = await supabase.from("problem_reports").insert({
    user_id: user.id,
    category,
    message,
    screenshot_url: screenshotUrl,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
