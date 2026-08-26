import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/analyst/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// CRUD for B2B client organizations, used by the analyst dashboard to mint the
// badge that marks a user as belonging to a client program.
//
// Middleware exempts /api/analyst entirely, so isAuthorized is the ONLY guard
// on these routes -- same as the ticket and user endpoints. Do not remove it.
//
// GET    -- list organizations with a member count
// POST   -- create {name, short_name?, accent_color?}
// PATCH  -- update {id, name?, short_name?, accent_color?, active?}
// DELETE -- remove {id}; profiles.client_org_id is ON DELETE SET NULL, so
//           members lose the badge but keep their accounts

const HEX = /^#[0-9a-fA-F]{6}$/;

function readName(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceRoleClient();

  const [{ data: orgs, error }, { data: members }] = await Promise.all([
    supabase
      .from("client_organizations")
      .select("id, name, short_name, accent_color, active, created_at")
      .order("name"),
    supabase.from("profiles").select("client_org_id").not("client_org_id", "is", null),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Counted in JS rather than with a grouped query: the member list is small
  // and this keeps the endpoint to two plain selects.
  const counts = new Map<string, number>();
  for (const row of members ?? []) {
    if (row.client_org_id) {
      counts.set(row.client_org_id, (counts.get(row.client_org_id) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    items: (orgs ?? []).map((o) => ({ ...o, member_count: counts.get(o.id) ?? 0 })),
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const name = readName(body.name);
  const shortName = readName(body.short_name);
  const accentColor = readName(body.accent_color);

  if (!name) {
    return NextResponse.json({ error: "Nama client wajib diisi" }, { status: 400 });
  }
  if (accentColor && !HEX.test(accentColor)) {
    return NextResponse.json(
      { error: "Warna harus format hex, contoh #00629d" },
      { status: 400 },
    );
  }

  const { data, error } = await createServiceRoleClient()
    .from("client_organizations")
    .insert({
      name,
      short_name: shortName || null,
      ...(accentColor ? { accent_color: accentColor } : {}),
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation on the case-insensitive name index.
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "Client dengan nama itu sudah ada."
            : error.message,
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id wajib" }, { status: 400 });
  }

  const patch: {
    name?: string;
    short_name?: string | null;
    accent_color?: string;
    active?: boolean;
  } = {};

  if (body.name !== undefined) {
    const name = readName(body.name);
    if (!name) {
      return NextResponse.json({ error: "Nama client wajib diisi" }, { status: 400 });
    }
    patch.name = name;
  }
  if (body.short_name !== undefined) {
    patch.short_name = readName(body.short_name) || null;
  }
  if (body.accent_color !== undefined) {
    const accentColor = readName(body.accent_color);
    if (!accentColor || !HEX.test(accentColor)) {
      return NextResponse.json(
        { error: "Warna harus format hex, contoh #00629d" },
        { status: 400 },
      );
    }
    patch.accent_color = accentColor;
  }
  if (typeof body.active === "boolean") {
    patch.active = body.active;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
  }

  const { error } = await createServiceRoleClient()
    .from("client_organizations")
    .update(patch)
    .eq("id", id);
  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "Client dengan nama itu sudah ada."
            : error.message,
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id wajib" }, { status: 400 });
  }

  const { error } = await createServiceRoleClient()
    .from("client_organizations")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
