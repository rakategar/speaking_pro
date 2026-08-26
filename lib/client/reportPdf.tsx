import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { speakingLevel } from "@/lib/format";
import type { CohortNarrative } from "@/lib/gemini/cohort-narrative";
import type {
  DayBucket,
  MetricAverages,
  ParticipantRow,
  SessionPoint,
} from "@/lib/client/analytics";
import type { Forecast } from "@/lib/client/forecast";

// The printable side of the B2B dashboard. Visual language deliberately
// matches lib/summary/pdf.tsx so a client receiving both recognises them as
// the same product -- and, like that file, it draws its own bars out of Views
// rather than pulling in a chart library react-pdf cannot render anyway.
//
// PRIVACY: no transcripts here either. Session rows carry module, duration
// and scores only.

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

const NAVY = "#0d1c32";
const BLUE = "#00629d";
const CYAN = "#00a2fd";
const MUTED = "#44474d";
const LINE = "#e0e3e7";
const GOOD = "#1e8e3e";
const BAD = "#c5221f";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 10,
    color: "#191c1e",
    fontFamily: "Helvetica",
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  logo: { width: 28, height: 32, marginRight: 10 },
  brand: { fontSize: 14, fontWeight: 700, color: "#000000" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4, color: NAVY },
  subtitle: { fontSize: 11, color: MUTED, marginBottom: 6 },
  orgPill: {
    alignSelf: "flex-start",
    backgroundColor: NAVY,
    color: "#ffffff",
    fontSize: 9,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: NAVY,
    marginTop: 6,
    marginBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 11, fontWeight: 700, marginBottom: 10, color: BLUE },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  metric: { width: "33.33%", marginBottom: 12, paddingRight: 6 },
  metricLabel: { fontSize: 8, color: MUTED, marginBottom: 2 },
  metricValue: { fontSize: 15, fontWeight: 700 },
  delta: { fontSize: 8, marginTop: 1 },
  para: { fontSize: 10, lineHeight: 1.6, marginBottom: 8 },
  bulletRow: { flexDirection: "row", marginBottom: 7 },
  bulletDot: { width: 10, fontSize: 10, color: CYAN },
  bulletTitle: { fontSize: 10, fontWeight: 700, marginBottom: 1 },
  bulletDetail: { fontSize: 9.5, color: MUTED, lineHeight: 1.5 },
  bulletExtra: { fontSize: 9, color: BLUE, marginTop: 2 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  barLabel: { width: 86, fontSize: 8, color: MUTED },
  barTrack: { flex: 1, height: 11, backgroundColor: "#f1f4f7", borderRadius: 3 },
  barFill: { height: 11, backgroundColor: CYAN, borderRadius: 3 },
  barValue: { width: 34, fontSize: 8, textAlign: "right", color: MUTED },
  tRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 5,
  },
  tHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: NAVY,
    paddingBottom: 5,
  },
  th: { fontSize: 7.5, fontWeight: 700, color: NAVY },
  td: { fontSize: 8 },
  placeholder: { fontSize: 11, textAlign: "center", color: MUTED, lineHeight: 1.7 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9aa0a6",
    textAlign: "center",
  },
});

const fmtDate = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
const round1 = (v: number | null) =>
  v == null ? "-" : (Math.round(v * 10) / 10).toLocaleString("id-ID");
const mmss = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};

function Header({ orgName }: { orgName: string }) {
  return (
    <View style={styles.header}>
      <Image src={logoBuffer} style={styles.logo} />
      <View>
        <Text style={styles.brand}>Speaking Pro</Text>
        <Text style={{ fontSize: 8, color: MUTED }}>{orgName}</Text>
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  previous,
  suffix = "",
  lowerIsBetter = false,
  neutral = false,
}: {
  label: string;
  value: number | null;
  previous?: number | null;
  suffix?: string;
  lowerIsBetter?: boolean;
  neutral?: boolean;
}) {
  const comparable = previous !== undefined;
  const diff =
    value != null && previous != null ? Math.round((value - previous) * 10) / 10 : null;
  const improved = diff == null ? null : lowerIsBetter ? diff < 0 : diff > 0;
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value == null ? "-" : `${round1(value)}${suffix}`}
      </Text>
      {!comparable ? null : diff != null && diff !== 0 ? (
        <Text style={[styles.delta, { color: neutral ? MUTED : improved ? GOOD : BAD }]}>
          {diff > 0 ? "+" : ""}
          {round1(diff)} vs periode sebelumnya
        </Text>
      ) : diff === 0 ? (
        <Text style={[styles.delta, { color: MUTED }]}>sama seperti sebelumnya</Text>
      ) : (
        <Text style={[styles.delta, { color: MUTED }]}>belum ada pembanding</Text>
      )}
    </View>
  );
}

function Bar({
  label,
  value,
  max = 100,
  muted = false,
}: {
  label: string;
  value: number;
  max?: number;
  muted?: boolean;
}) {
  const pct = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${pct}%` },
            muted ? { backgroundColor: "#b9d9f0" } : {},
          ]}
        />
      </View>
      <Text style={styles.barValue}>{Math.round(value)}</Text>
    </View>
  );
}

function Bullet({
  title,
  detail,
  extra,
}: {
  title: string;
  detail?: string;
  extra?: string;
}) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.bulletTitle}>{title}</Text>
        {detail ? <Text style={styles.bulletDetail}>{detail}</Text> : null}
        {extra ? <Text style={styles.bulletExtra}>{extra}</Text> : null}
      </View>
    </View>
  );
}

function ForecastCard({ forecast }: { forecast: Forecast }) {
  const arah =
    forecast.slopePerWeek > 0.2
      ? "naik"
      : forecast.slopePerWeek < -0.2
        ? "turun"
        : "datar";
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        Proyeksi {forecast.horizonDays} Hari ke Depan
      </Text>
      {forecast.projected == null ? (
        <Text style={styles.bulletDetail}>
          Data belum cukup untuk membuat proyeksi yang dapat dipertanggungjawabkan
          (baru {forecast.points} sesi bernilai). Dibutuhkan minimal 4 sesi.
        </Text>
      ) : (
        <>
          <View style={styles.grid}>
            <Metric label="Skor terakhir" value={forecast.current} />
            <Metric label="Proyeksi" value={forecast.projected} />
            <Metric label="Perubahan / minggu" value={forecast.slopePerWeek} />
          </View>
          <Text style={styles.bulletDetail}>
            Arah tren {arah}. Tingkat keyakinan: {forecast.confidence} (r² ={" "}
            {round1(forecast.r2)}, {forecast.points} sesi). Proyeksi adalah
            perpanjangan garis tren, bukan jaminan hasil.
          </Text>
        </>
      )}
    </View>
  );
}

const PARTICIPANT_COLS = [
  { label: "Nama", w: "26%" },
  { label: "Sesi", w: "8%" },
  { label: "Drill", w: "8%" },
  { label: "Menit", w: "9%" },
  { label: "Rata2", w: "10%" },
  { label: "Terakhir", w: "11%" },
  { label: "Delta", w: "10%" },
  { label: "Status", w: "18%" },
] as const;

export type CohortReportData = {
  orgName: string;
  periodDays: number;
  periodStart: Date;
  periodEnd: Date;
  participants: ParticipantRow[];
  totals: {
    participants: number;
    activeParticipants: number;
    sessions: number;
    drills: number;
    minutes: number;
  };
  averages: MetricAverages | null;
  previousAverages: MetricAverages | null;
  daily: DayBucket[];
  forecast: Forecast;
  risky: { row: ParticipantRow; flags: string[] }[];
  narrative: CohortNarrative | null;
};

function CohortDocument({ data }: { data: CohortReportData }) {
  const avg = data.averages;
  const prev = data.previousAverages;
  const n = data.narrative;
  const activeDays = data.daily.filter((d) => d.sessions > 0 || d.drills > 0);

  return (
    <Document
      title={`Rekap Program - ${data.orgName}`}
      author="Speaking Pro"
      creator="Speaking Pro"
    >
      <Page size="A4" style={styles.page}>
        <Header orgName={data.orgName} />
        <Text style={styles.title}>Rekap Program Latihan</Text>
        <Text style={styles.subtitle}>
          {fmtDate(data.periodStart)} – {fmtDate(data.periodEnd)} · {data.periodDays} hari
        </Text>
        <Text style={styles.orgPill}>
          {data.orgName} · {data.totals.participants} peserta
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ringkasan Periode</Text>
          <View style={styles.grid}>
            <Metric label="Peserta terdaftar" value={data.totals.participants} />
            <Metric label="Peserta aktif" value={data.totals.activeParticipants} />
            <Metric label="Hari ada aktivitas" value={activeDays.length} />
            <Metric label="Total sesi" value={data.totals.sessions} />
            <Metric label="Total drill" value={data.totals.drills} />
            <Metric label="Total menit" value={data.totals.minutes} />
          </View>
          {avg?.overall != null ? (
            <Text style={styles.bulletDetail}>
              Rata-rata skor keseluruhan {round1(avg.overall)} — level{" "}
              {speakingLevel(avg.overall)}.
            </Text>
          ) : (
            <Text style={styles.bulletDetail}>
              Belum ada sesi bernilai pada periode ini.
            </Text>
          )}
        </View>

        {avg ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rata-rata per Metrik</Text>
            <View style={styles.grid}>
              <Metric label="Keseluruhan" value={avg.overall} previous={prev?.overall ?? null} />
              <Metric label="Kejelasan" value={avg.clarity} previous={prev?.clarity ?? null} />
              <Metric label="Kepercayaan diri" value={avg.confidence} previous={prev?.confidence ?? null} />
              <Metric label="Struktur" value={avg.structure} previous={prev?.structure ?? null} />
              <Metric label="Intonasi" value={avg.intonation} previous={prev?.intonation ?? null} />
              <Metric
                label="Kecepatan (WPM)"
                value={avg.wpm}
                previous={prev?.wpm ?? null}
                neutral
              />
              <Metric
                label="Kata pengisi"
                value={avg.fillerWordCount}
                previous={prev?.fillerWordCount ?? null}
                lowerIsBetter
              />
            </View>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Speaking Pro · Rekap program {data.orgName} · dibuat{" "}
          {fmtDate(data.periodEnd)}
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Header orgName={data.orgName} />
        <Text style={styles.sectionTitle}>Aktivitas Harian</Text>
        <View style={styles.card}>
          {activeDays.length === 0 ? (
            <Text style={styles.placeholder}>
              Belum ada aktivitas latihan pada periode ini.
            </Text>
          ) : (
            activeDays
              .slice(-20)
              .map((d) => (
                <Bar
                  key={d.date}
                  label={fmtShort(d.date)}
                  value={d.minutes}
                  max={Math.max(10, ...activeDays.map((x) => x.minutes))}
                />
              ))
          )}
          <Text style={[styles.bulletDetail, { marginTop: 6 }]}>
            Menit latihan per hari (maksimal 20 hari terakhir yang ada aktivitas).
          </Text>
        </View>

        <ForecastCard forecast={data.forecast} />

        {data.risky.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Peserta yang Perlu Perhatian ({data.risky.length})
            </Text>
            {data.risky.slice(0, 12).map((r) => (
              <Bullet
                key={r.row.userId}
                title={r.row.name ?? r.row.email}
                detail={r.flags.join(" · ")}
              />
            ))}
          </View>
        ) : null}

        <Text style={styles.footer}>
          Speaking Pro · Rekap program {data.orgName}
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Header orgName={data.orgName} />
        <Text style={styles.sectionTitle}>Rincian Peserta</Text>
        <View style={styles.tHead}>
          {PARTICIPANT_COLS.map((c) => (
            <Text key={c.label} style={[styles.th, { width: c.w }]}>
              {c.label}
            </Text>
          ))}
        </View>
        {data.participants.map((p) => (
          <View key={p.userId} style={styles.tRow} wrap={false}>
            <Text style={[styles.td, { width: "26%" }]}>{p.name ?? p.email}</Text>
            <Text style={[styles.td, { width: "8%" }]}>{p.sessions}</Text>
            <Text style={[styles.td, { width: "8%" }]}>{p.drills}</Text>
            <Text style={[styles.td, { width: "9%" }]}>{p.minutes}</Text>
            <Text style={[styles.td, { width: "10%" }]}>{round1(p.avgOverall)}</Text>
            <Text style={[styles.td, { width: "11%" }]}>{round1(p.latestOverall)}</Text>
            <Text
              style={[
                styles.td,
                { width: "10%" },
                p.deltaOverall == null
                  ? { color: MUTED }
                  : { color: p.deltaOverall >= 0 ? GOOD : BAD },
              ]}
            >
              {p.deltaOverall == null
                ? "-"
                : `${p.deltaOverall > 0 ? "+" : ""}${round1(p.deltaOverall)}`}
            </Text>
            <Text style={[styles.td, { width: "18%" }]}>{p.status}</Text>
          </View>
        ))}
        {data.participants.length === 0 ? (
          <Text style={[styles.placeholder, { marginTop: 20 }]}>
            Belum ada peserta yang terdaftar di organisasi ini.
          </Text>
        ) : null}
        <Text style={styles.footer}>
          Speaking Pro · Rekap program {data.orgName}
        </Text>
      </Page>

      {n ? (
        <Page size="A4" style={styles.page}>
          <Header orgName={data.orgName} />
          <Text style={styles.sectionTitle}>Analisis &amp; Rekomendasi</Text>
          {n.executive_summary.map((p, i) => (
            <Text key={i} style={styles.para}>
              {p}
            </Text>
          ))}
          {n.cohort_strengths.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Yang Sudah Berjalan Baik</Text>
              {n.cohort_strengths.map((s, i) => (
                <Bullet key={i} title={s.title} detail={s.detail} />
              ))}
            </View>
          ) : null}
          {n.cohort_risks.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Yang Perlu Diwaspadai</Text>
              {n.cohort_risks.map((s, i) => (
                <Bullet key={i} title={s.title} detail={s.detail} extra={s.affected} />
              ))}
            </View>
          ) : null}
          {n.trend_reading ? <Text style={styles.para}>{n.trend_reading}</Text> : null}
          {n.forecast_reading ? (
            <Text style={styles.para}>{n.forecast_reading}</Text>
          ) : null}
          {n.trainer_actions.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Langkah Berikutnya</Text>
              {n.trainer_actions.map((a, i) => (
                <Bullet key={i} title={a.action} detail={a.why} extra={a.who} />
              ))}
            </View>
          ) : null}
          {n.closing_note ? <Text style={styles.para}>{n.closing_note}</Text> : null}
          <Text style={styles.footer}>
            Analisis disusun otomatis dari data latihan peserta · Speaking Pro
          </Text>
        </Page>
      ) : null}
    </Document>
  );
}

export function renderCohortReport(data: CohortReportData): Promise<Buffer> {
  return renderToBuffer(<CohortDocument data={data} />);
}

export type ParticipantReportData = {
  orgName: string;
  participant: ParticipantRow;
  periodDays: number;
  periodStart: Date;
  periodEnd: Date;
  averages: MetricAverages | null;
  previousAverages: MetricAverages | null;
  points: SessionPoint[];
  forecast: Forecast;
  flags: string[];
};

const SESSION_COLS = [
  { label: "Tgl", w: "12%" },
  { label: "Modul", w: "32%" },
  { label: "Durasi", w: "12%" },
  { label: "Overall", w: "11%" },
  { label: "Clar", w: "11%" },
  { label: "Conf", w: "11%" },
  { label: "WPM", w: "11%" },
] as const;

function ParticipantDocument({ data }: { data: ParticipantReportData }) {
  const p = data.participant;
  const avg = data.averages;
  const prev = data.previousAverages;
  const scored = data.points.filter((s) => !s.isDrill);

  return (
    <Document
      title={`Rekap Peserta - ${p.name ?? p.email}`}
      author="Speaking Pro"
      creator="Speaking Pro"
    >
      <Page size="A4" style={styles.page}>
        <Header orgName={data.orgName} />
        <Text style={styles.title}>{p.name ?? p.email}</Text>
        <Text style={styles.subtitle}>
          {fmtDate(data.periodStart)} – {fmtDate(data.periodEnd)} · {data.periodDays} hari
        </Text>
        <Text style={styles.orgPill}>
          {data.orgName} · status: {p.status}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ringkasan</Text>
          <View style={styles.grid}>
            <Metric label="Sesi" value={p.sessions} />
            <Metric label="Drill" value={p.drills} />
            <Metric label="Menit" value={p.minutes} />
            <Metric label="Skor rata-rata" value={p.avgOverall} />
            <Metric label="Skor terakhir" value={p.latestOverall} />
            <Metric label="Perubahan" value={p.deltaOverall} />
          </View>
          {p.avgOverall != null ? (
            <Text style={styles.bulletDetail}>
              Level saat ini: {speakingLevel(p.avgOverall)}.
            </Text>
          ) : null}
          {data.flags.length > 0 ? (
            <Text style={[styles.bulletDetail, { color: BAD, marginTop: 4 }]}>
              Perlu perhatian: {data.flags.join(" · ")}
            </Text>
          ) : null}
        </View>

        {avg ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rata-rata per Metrik</Text>
            <View style={styles.grid}>
              <Metric label="Keseluruhan" value={avg.overall} previous={prev?.overall ?? null} />
              <Metric label="Kejelasan" value={avg.clarity} previous={prev?.clarity ?? null} />
              <Metric label="Kepercayaan diri" value={avg.confidence} previous={prev?.confidence ?? null} />
              <Metric label="Struktur" value={avg.structure} previous={prev?.structure ?? null} />
              <Metric label="Intonasi" value={avg.intonation} previous={prev?.intonation ?? null} />
              <Metric
                label="Kecepatan (WPM)"
                value={avg.wpm}
                previous={prev?.wpm ?? null}
                neutral
              />
              <Metric
                label="Kata pengisi"
                value={avg.fillerWordCount}
                previous={prev?.fillerWordCount ?? null}
                lowerIsBetter
              />
            </View>
          </View>
        ) : null}

        <ForecastCard forecast={data.forecast} />

        <Text style={styles.sectionTitle}>Riwayat Sesi</Text>
        {scored.length === 0 ? (
          <Text style={styles.placeholder}>
            Belum ada sesi bernilai pada periode ini.
          </Text>
        ) : (
          <>
            <View style={styles.tHead}>
              {SESSION_COLS.map((c) => (
                <Text key={c.label} style={[styles.th, { width: c.w }]}>
                  {c.label}
                </Text>
              ))}
            </View>
            {scored.map((s) => (
              <View key={s.id} style={styles.tRow} wrap={false}>
                <Text style={[styles.td, { width: "12%" }]}>{fmtShort(s.createdAt)}</Text>
                <Text style={[styles.td, { width: "32%" }]}>
                  {s.moduleTitle ?? "Rekaman bebas"}
                </Text>
                <Text style={[styles.td, { width: "12%" }]}>{mmss(s.durationSeconds)}</Text>
                <Text style={[styles.td, { width: "11%" }]}>{round1(s.overall)}</Text>
                <Text style={[styles.td, { width: "11%" }]}>{round1(s.clarity)}</Text>
                <Text style={[styles.td, { width: "11%" }]}>{round1(s.confidence)}</Text>
                <Text style={[styles.td, { width: "11%" }]}>{round1(s.wpm)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.footer}>
          Speaking Pro · Rekap peserta · {data.orgName}
        </Text>
      </Page>
    </Document>
  );
}

export function renderParticipantReport(
  data: ParticipantReportData,
): Promise<Buffer> {
  return renderToBuffer(<ParticipantDocument data={data} />);
}
