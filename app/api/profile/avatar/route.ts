import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB, matches the avatars bucket limit
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

// POST /api/profile/avatar -- multipart: image (File). Uploads the user's
// profile photo to the public "avatars" bucket and stores its public URL on
// profiles.avatar_url. RLS applies via the SSR user-session client.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json(
      { error: "Gambar tidak ditemukan" },
      { status: 400 },
    );
  }
  if (!ALLOWED.has(image.type)) {
    return NextResponse.json(
      { error: "Format tidak didukung. Gunakan JPG, PNG, atau WebP." },
      { status: 400 },
    );
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Ukuran gambar maksimal 2 MB." },
      { status: 413 },
    );
  }

  const ext =
    image.type === "image/png"
      ? "png"
      : image.type === "image/webp"
        ? "webp"
        : "jpg";
  const storagePath = `${user.id}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(storagePath, image, {
      contentType: image.type,
      upsert: true,
    });
  if (uploadError) {
    return NextResponse.json(
      { error: `Upload gagal: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(storagePath);
  // Cache-bust so the CDN/browser fetch the freshly uploaded photo, since the
  // path (avatar.<ext>) is stable across replacements.
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ avatar_url: avatarUrl });
}
