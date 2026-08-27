import { createServiceRoleClient } from "@/lib/supabase/server";
import { listAnalystUsers } from "@/lib/analyst/users";
import { previousPeriod, type Period } from "@/lib/client/period";
import {
  DAY_MS,
  SELECT_RECORDINGS,
  avg,
  bucketByDay,
  metricAverages,
  toPoints,
  type DayBucket,
  type MetricAverages,
  type OrgOverview,
  type ParticipantRow,
  type ParticipantStatus,
  type RecordingRow,
  type SessionPoint,
} from "@/lib/analytics/shared";

// The pure shaping and averaging live in lib/analytics/shared.ts so the
// participant-facing /progress page can reuse them without pulling the
// service-role client into a user request. Re-exported here because this
// module is the established import site for these names.
export type { Period } from "@/lib/client/period";
export {
  bucketByDay,
  jakartaDayKey,
  metricAverages,
  type DayBucket,
  type MetricAverages,
  type OrgOverview,
  type ParticipantRow,
  type ParticipantStatus,
  type SessionPoint,
} from "@/lib/analytics/shared";


// Aggregation for the B2B dashboard. Server-only, service-role.
//
// THE RULE THIS FILE EXISTS TO ENFORCE: every exported function takes `orgId`
// first, and nothing that accepts a userId returns data without first proving
// that user belongs to that organization. One client seeing another client's
// participants is the worst failure this feature can have, so the check lives
// in one place (assertMember) rather than being repeated per route.
//
// PRIVACY: the client sees names, emails, scores and activity -- never
// transcripts and never audio. What a participant actually said is their own
// data, not the organization's. That is why the select below names its columns
// instead of using "*": reports.transcript and reports.ai_insights would
// otherwise ride along into a dashboard the employer can read.

/** Members of one organization, with emails. */
export async function listOrgMembers(
  orgId: string,
): Promise<{ id: string; name: string | null; email: string; joinedAt: string }[]> {
  const { items } = await listAnalystUsers();
  return (items ?? [])
    .filter((u) => u.client_org_id === orgId)
    .map((u) => ({
      id: u.id,
      name: u.full_name,
      email: u.email,
      joinedAt: u.created_at,
    }));
}

/**
 * The single gate to per-participant data. Returns false for a user in another
 * organization, a user with no organization, and a nonexistent id alike --
 * every /api/client route that accepts a userId must call this first.
 */
export async function assertMember(orgId: string, userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("client_org_id")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data && data.client_org_id === orgId);
}

async function fetchPoints(
  userIds: string[],
  since: Date,
  until?: Date,
): Promise<SessionPoint[]> {
  if (userIds.length === 0) return [];
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("recordings")
    .select(SELECT_RECORDINGS)
    .in("user_id", userIds)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });
  if (until) query = query.lt("created_at", until.toISOString());
  const { data } = await query;
  return toPoints((data ?? []) as unknown as RecordingRow[]);
}

/** Raw session points for one organization over the window. */
export async function orgSessionPoints(
  orgId: string,
  period: Period,
): Promise<SessionPoint[]> {
  const members = await listOrgMembers(orgId);
  return fetchPoints(members.map((m) => m.id), period.start, period.end);
}

export async function orgOverview(
  orgId: string,
  period: Period,
): Promise<OrgOverview> {
  const members = await listOrgMembers(orgId);
  const ids = members.map((m) => m.id);
  const previous = previousPeriod(period);

  const [points, prevPoints] = await Promise.all([
    fetchPoints(ids, period.start, period.end),
    fetchPoints(ids, previous.start, previous.end),
  ]);

  const activeIds = new Set(points.map((p) => p.userId));
  return {
    participants: members.length,
    activeParticipants: activeIds.size,
    sessions: points.filter((p) => !p.isDrill).length,
    drills: points.filter((p) => p.isDrill).length,
    minutes: Math.round(points.reduce((a, p) => a + p.durationSeconds, 0) / 60),
    averages: metricAverages(points),
    previousAverages: metricAverages(prevPoints),
    daily: bucketByDay(points, period.start, period.days),
  };
}

// A participant who has practised in the last 7 days is "aktif"; one who has
// practised in the window but not recently is "melambat"; one with nothing in
// the window at all is "tidak aktif". Deliberately blunt -- the client needs a
// list to act on, not a score.
function deriveStatus(lastActiveAt: string | null, now: Date): ParticipantStatus {
  if (!lastActiveAt) return "tidak aktif";
  const ageDays = (now.getTime() - new Date(lastActiveAt).getTime()) / DAY_MS;
  if (ageDays <= 7) return "aktif";
  if (ageDays <= 21) return "melambat";
  return "tidak aktif";
}

export async function listParticipants(
  orgId: string,
  period: Period,
  now = new Date(),
): Promise<ParticipantRow[]> {
  const members = await listOrgMembers(orgId);
  const ids = members.map((m) => m.id);
  const previous = previousPeriod(period);

  const [points, prevPoints] = await Promise.all([
    fetchPoints(ids, period.start, period.end),
    fetchPoints(ids, previous.start, previous.end),
  ]);

  const byUser = new Map<string, SessionPoint[]>();
  for (const p of points) {
    const list = byUser.get(p.userId);
    if (list) list.push(p);
    else byUser.set(p.userId, [p]);
  }
  const prevByUser = new Map<string, SessionPoint[]>();
  for (const p of prevPoints) {
    const list = prevByUser.get(p.userId);
    if (list) list.push(p);
    else prevByUser.set(p.userId, [p]);
  }

  return members
    .map((m) => {
      const mine = byUser.get(m.id) ?? [];
      const scored = mine.filter((p) => !p.isDrill);
      const avgOverall = avg(scored.map((p) => p.overall));
      const prevAvg = avg(
        (prevByUser.get(m.id) ?? []).filter((p) => !p.isDrill).map((p) => p.overall),
      );
      const lastActiveAt = mine.length > 0 ? mine[mine.length - 1].createdAt : null;
      const latest = [...scored].reverse().find((p) => p.overall != null);
      return {
        userId: m.id,
        name: m.name,
        email: m.email,
        joinedAt: m.joinedAt,
        lastActiveAt,
        sessions: scored.length,
        drills: mine.filter((p) => p.isDrill).length,
        minutes: Math.round(mine.reduce((a, p) => a + p.durationSeconds, 0) / 60),
        avgOverall,
        latestOverall: latest?.overall ?? null,
        deltaOverall:
          avgOverall != null && prevAvg != null
            ? Math.round((avgOverall - prevAvg) * 10) / 10
            : null,
        status: deriveStatus(lastActiveAt, now),
      };
    })
    .sort((a, b) => {
      // Inactive first: this table exists so the organizer can find who needs
      // a nudge, not to rank the top performers.
      const order: Record<ParticipantStatus, number> = {
        "tidak aktif": 0,
        melambat: 1,
        aktif: 2,
      };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return (a.name ?? a.email).localeCompare(b.name ?? b.email, "id");
    });
}

/**
 * Broadcasts this organization sent in the last 24 hours -- the same window
 * the notify route rate-limits on, so the UI and the limit never disagree.
 *
 * Lives here rather than in the page because reading the clock inside a
 * component body is flagged as impure (react-hooks/purity), even on the
 * server.
 */
export async function recentBroadcastCount(orgId: string): Promise<number> {
  const supabase = createServiceRoleClient();
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { count } = await supabase
    .from("client_notification_log")
    .select("id", { count: "exact", head: true })
    .eq("client_org_id", orgId)
    .gte("created_at", since);
  return count ?? 0;
}

export type ParticipantDetail = {
  member: { id: string; name: string | null; email: string; joinedAt: string };
  row: ParticipantRow;
  points: SessionPoint[];
  averages: MetricAverages | null;
  previousAverages: MetricAverages | null;
  daily: DayBucket[];
};

/** Null when the user is not a member -- callers turn that into a 404. */
export async function participantDetail(
  orgId: string,
  userId: string,
  period: Period,
  now = new Date(),
): Promise<ParticipantDetail | null> {
  if (!(await assertMember(orgId, userId))) return null;

  const members = await listOrgMembers(orgId);
  const member = members.find((m) => m.id === userId);
  if (!member) return null;

  const previous = previousPeriod(period);
  const [points, prevPoints, rows] = await Promise.all([
    fetchPoints([userId], period.start, period.end),
    fetchPoints([userId], previous.start, previous.end),
    listParticipants(orgId, period, now),
  ]);

  const row = rows.find((r) => r.userId === userId);
  if (!row) return null;

  return {
    member,
    row,
    points,
    averages: metricAverages(points),
    previousAverages: metricAverages(prevPoints),
    daily: bucketByDay(points, period.start, period.days),
  };
}
