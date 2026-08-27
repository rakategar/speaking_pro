import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/recordings/[id]/audio[?download=1] -- streams the caller's own
// studio recording back: inline for playback on the analysis result page, or
// as an attachment when the user asks to keep a copy.
//
// A proxy rather than a signed URL: the "recordings" bucket is private, and
// server-side Supabase traffic goes to SUPABASE_INTERNAL_URL, so a signed URL
// minted here would carry an internal host that no browser can reach (the same
// trap publicStorageUrl() in lib/supabase/storage.ts exists to avoid).
//
// Unlike the summary/certificate download routes this one honours Range.
// <audio> issues a Range request the moment the user drags the scrubber, and a
// server that answers 200-with-everything makes seeking fail outright in
// Safari and behave erratically in Chrome.

const CONTENT_TYPES: Record<string, string> = {
  webm: "audio/webm",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  ogg: "audio/ogg",
  wav: "audio/wav",
};

/** Parses a single-range `bytes=a-b` header against a known size. */
function parseRange(
  header: string,
  size: number,
): { start: number; end: number } | "invalid" | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;

  let start: number;
  let end: number;
  if (rawStart === "") {
    // Suffix form: the last N bytes.
    const suffix = Number(rawEnd);
    if (!rawEnd || !Number.isFinite(suffix) || suffix <= 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return "invalid";
  if (start > end || start >= size) return "invalid";
  return { start, end: Math.min(end, size - 1) };
}

/** Safe on every OS the user might save this to. */
function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "rekaman"
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS already scopes this to the caller, but the explicit user_id filter
  // keeps the guarantee readable at the call site rather than one migration
  // away -- same belt-and-braces as the summary download route.
  const { data: recording } = await supabase
    .from("recordings")
    .select("storage_path, created_at, practice_modules(title)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  // A missing row and a row with no audio are the same thing to the caller:
  // there is nothing to play. Drill logs (status 'drill_completed') are
  // recordings rows with a null storage_path and land here.
  if (!recording?.storage_path) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const { data: file, error } = await supabase.storage
    .from("recordings")
    .download(recording.storage_path);
  if (error || !file) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal memuat rekaman" },
      { status: 500 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const size = buffer.byteLength;
  const ext = recording.storage_path.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  // Buffering the whole object is fine here: the bucket caps uploads at 25MB
  // and recordings are at most ~5 minutes.
  const download = new URL(request.url).searchParams.get("download") === "1";
  const moduleTitle =
    (recording.practice_modules as { title: string } | null)?.title ?? "rekaman-latihan";
  const dateKey = new Date(recording.created_at).toISOString().slice(0, 10);
  const filename = `${slugify(moduleTitle)}-${dateKey}.${ext || "webm"}`;

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Disposition": download
      ? `attachment; filename="${filename}"`
      : "inline",
    "Accept-Ranges": "bytes",
    // Private: this is one user's own audio and must never land in a shared
    // cache. The short max-age keeps scrubbing from re-fetching the file.
    "Cache-Control": "private, max-age=3600",
  };

  // A download wants the whole file in one response. Range still matters on
  // the playback path -- a server that answers 200-with-everything there makes
  // seeking fail outright in Safari.
  const rangeHeader = download ? null : request.headers.get("range");
  if (rangeHeader) {
    const range = parseRange(rangeHeader, size);
    if (range === "invalid") {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    if (range) {
      const chunk = buffer.subarray(range.start, range.end + 1);
      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
          "Content-Length": String(chunk.byteLength),
        },
      });
    }
    // Unparseable (e.g. a multi-range request): fall through to the full body,
    // which is a legal response to any Range request.
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: { ...headers, "Content-Length": String(size) },
  });
}
