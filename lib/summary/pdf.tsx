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
import type { WeeklyNarrative } from "@/lib/gemini/weekly-narrative";
import { speakingLevel } from "@/lib/format";

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

export type MetricAverages = {
  overall: number | null;
  confidence: number | null;
  clarity: number | null;
  structure: number | null;
  intonation: number | null;
  wpm: number | null;
  fillerWordCount: number | null;
};

export type SummarySession = {
  date: string; // ISO
  moduleTitle: string | null;
  category: string | null;
  durationSeconds: number | null;
  overall: number | null;
  clarity: number | null;
  structure: number | null;
  confidence: number | null;
  intonation: number | null;
  wpm: number | null;
  filler: number | null;
};

export type WeeklySummaryData = {
  userName: string;
  occupation: string | null;
  weekIndex: number;
  periodStart: Date;
  periodEnd: Date;

  /** Recording sessions that produced an AI report. */
  sessionCount: number;
  /** Client-side drills logged this week (no audio, no report). */
  drillCount: number;
  totalSeconds: number;
  /** Which of the seven days in the period had any activity. */
  activeDays: boolean[];
  streakCount: number;
  quotaUsedSeconds: number;
  quotaTotalSeconds: number;
  topupBalanceSeconds: number;

  averages: MetricAverages | null;
  previousAverages: MetricAverages | null;
  sessions: SummarySession[];
  /** Per-week overall averages across the user's whole history. */
  weeklyTrend: { label: string; value: number }[];

  focusCategories: string[];
  recommendedDrills: { category: string; title: string }[];

  narrative: WeeklyNarrative | null;
};

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
  levelPill: {
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
  para: { fontSize: 10, lineHeight: 1.6, marginBottom: 8, color: "#191c1e" },
  bulletRow: { flexDirection: "row", marginBottom: 7 },
  bulletDot: { width: 10, fontSize: 10, color: CYAN },
  bulletTitle: { fontSize: 10, fontWeight: 700, marginBottom: 1 },
  bulletDetail: { fontSize: 9.5, color: MUTED, lineHeight: 1.5 },
  bulletExtra: { fontSize: 9, color: BLUE, marginTop: 2 },
  // Bar chart
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  barLabel: { width: 86, fontSize: 8, color: MUTED },
  barTrack: { flex: 1, height: 11, backgroundColor: "#f1f4f7", borderRadius: 3 },
  barFill: { height: 11, backgroundColor: CYAN, borderRadius: 3 },
  barValue: { width: 30, fontSize: 8, textAlign: "right", color: MUTED },
  // Table
  tRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 5 },
  tHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NAVY, paddingBottom: 5 },
  th: { fontSize: 7.5, fontWeight: 700, color: NAVY },
  td: { fontSize: 8, color: "#191c1e" },
  // Day dots
  dayStrip: { flexDirection: "row", marginTop: 4 },
  day: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: LINE,
  },
  dayText: { fontSize: 7.5 },
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

const DAY_LETTERS = ["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"];

/**
 * A metric with its week-over-week delta. `lowerIsBetter` flips the colour
 * for filler words -- fewer of those is progress, not a regression.
 */
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
  /** For metrics with an ideal band rather than a direction (WPM): show the
   *  change, but don't call it good or bad. */
  neutral?: boolean;
}) {
  // `previous` left off entirely means this metric has no week-over-week
  // notion at all (session counts, streak) -- say nothing rather than print
  // "belum ada pembanding" under every tile on the activity card.
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
        <Text
          style={[styles.delta, { color: neutral ? MUTED : improved ? GOOD : BAD }]}
        >
          {diff > 0 ? "+" : ""}
          {round1(diff)} vs minggu lalu
        </Text>
      ) : diff === 0 ? (
        <Text style={[styles.delta, { color: MUTED }]}>sama seperti minggu lalu</Text>
      ) : (
        <Text style={[styles.delta, { color: MUTED }]}>belum ada pembanding</Text>
      )}
    </View>
  );
}

/** Horizontal bar, 0-100 scale. No chart library: react-pdf lays out Views. */
function Bar({
  label,
  value,
  max = 100,
  muted = false,
}: {
  label: string;
  value: number;
  max?: number;
  /** Last week's figure -- drawn pale so the pair reads as before/after. */
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

const COLS = [
  { key: "date", label: "Tgl", w: "9%" },
  { key: "module", label: "Modul", w: "26%" },
  { key: "dur", label: "Durasi", w: "11%" },
  { key: "overall", label: "Overall", w: "9%" },
  { key: "clarity", label: "Clar", w: "8%" },
  { key: "structure", label: "Strukt", w: "9%" },
  { key: "confidence", label: "Conf", w: "8%" },
  { key: "intonation", label: "Inton", w: "8%" },
  { key: "wpm", label: "WPM", w: "6%" },
  { key: "filler", label: "Filler", w: "6%" },
] as const;

function WeeklySummaryDocument({ data }: { data: WeeklySummaryData }) {
  const n = data.narrative;
  const avg = data.averages;
  const prev = data.previousAverages;
  const hasActivity = data.sessionCount > 0 || data.drillCount > 0;

  // Sections drop out when the data behind them is missing (no narrative, no
  // scored sessions), so the numbering is derived rather than hard-coded --
  // otherwise a report could open at "2." with no "1." anywhere.
  const present = {
    exec: Boolean(n && n.executive_summary.length > 0),
    aktivitas: true,
    skor: true,
    grafik: Boolean(avg),
    rincian: data.sessions.length > 0,
    kuat: Boolean(n && n.strengths.length > 0),
    perbaiki: Boolean(n && n.improvements.length > 0),
    resep: true,
    target: Boolean(n && n.next_week_goals.length > 0),
    catatan: Boolean(n?.coach_note),
  };
  const no: Record<keyof typeof present, number> = {} as Record<
    keyof typeof present,
    number
  >;
  let counter = 0;
  for (const key of Object.keys(present) as (keyof typeof present)[]) {
    if (present[key]) no[key] = ++counter;
  }

  const Footer = (
    <Text
      style={styles.footer}
      fixed
      render={({ pageNumber, totalPages }) =>
        `Speaking Pro™ · Ringkasan Mingguan #${data.weekIndex} · ${data.userName} · Halaman ${pageNumber} dari ${totalPages}`
      }
    />
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={{ data: logoBuffer, format: "png" }} style={styles.logo} />
          <Text style={styles.brand}>Speaking Pro</Text>
        </View>

        <Text style={styles.title}>Ringkasan Mingguan #{data.weekIndex}</Text>
        <Text style={styles.subtitle}>
          {data.userName}
          {data.occupation ? ` · ${data.occupation}` : ""} ·{" "}
          {fmtDate(data.periodStart)} - {fmtDate(data.periodEnd)}
        </Text>
        <Text style={styles.levelPill}>
          Speaking Level: {speakingLevel(avg?.overall ?? null)}
        </Text>

        {!hasActivity ? (
          <View style={styles.card}>
            <Text style={styles.placeholder}>
              Belum ada latihan di minggu ini.{"\n"}
              Satu sesi 30 detik sudah cukup untuk menghidupkan laporan minggu
              depan — dan streak Anda ikut jalan lagi.
            </Text>
          </View>
        ) : null}

        {/* ---- Ringkasan eksekutif -------------------------------------- */}
        {n && n.executive_summary.length > 0 ? (
          <>
            <Text style={styles.sectionTitle} minPresenceAhead={70}>{no.exec}. Ringkasan Eksekutif</Text>
            <View style={styles.card}>
              {n.executive_summary.map((p, i) => (
                <Text key={i} style={styles.para}>
                  {p}
                </Text>
              ))}
              {n.highlight_of_week ? (
                <Text style={[styles.para, { color: BLUE, marginBottom: 0 }]}>
                  ★ Sorotan minggu ini: {n.highlight_of_week}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}

        {/* ---- Aktivitas ------------------------------------------------ */}
        <Text style={styles.sectionTitle} minPresenceAhead={70}>{no.aktivitas}. Aktivitas Minggu Ini</Text>
        <View style={styles.card}>
          <View style={styles.grid}>
            <Metric label="Sesi Rekaman (dianalisis)" value={data.sessionCount} />
            <Metric label="Drill Diselesaikan" value={data.drillCount} />
            <Metric
              label="Total Waktu Bicara"
              value={Math.round((data.totalSeconds / 60) * 10) / 10}
              suffix=" mnt"
            />
            <Metric label="Streak Saat Ini" value={data.streakCount} suffix=" hari" />
            <Metric
              label="Hari Aktif"
              value={data.activeDays.filter(Boolean).length}
              suffix=" / 7"
            />
            <Metric
              label="Sisa Kuota Top-up"
              value={Math.round((data.topupBalanceSeconds / 60) * 10) / 10}
              suffix=" mnt"
            />
          </View>

          <Text style={[styles.metricLabel, { marginTop: 2 }]}>
            Kuota mingguan terpakai: {mmss(data.quotaUsedSeconds)} dari{" "}
            {mmss(data.quotaTotalSeconds)}
          </Text>
          <View style={[styles.barTrack, { marginTop: 4, marginBottom: 10 }]}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(
                    100,
                    data.quotaTotalSeconds > 0
                      ? (data.quotaUsedSeconds / data.quotaTotalSeconds) * 100
                      : 0,
                  )}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.metricLabel}>Pola latihan harian</Text>
          <View style={styles.dayStrip}>
            {data.activeDays.map((active, i) => (
              <View
                key={i}
                style={[
                  styles.day,
                  active ? { backgroundColor: CYAN, borderColor: CYAN } : {},
                ]}
              >
                <Text style={[styles.dayText, active ? { color: "#ffffff" } : {}]}>
                  {DAY_LETTERS[
                    (new Date(
                      data.periodStart.getTime() + i * 86_400_000,
                    ).getDay() +
                      6) %
                      7
                  ]}
                </Text>
              </View>
            ))}
          </View>
        </View>

      </Page>

      {/* =============================== halaman 2 ====================== */}
      <Page size="A4" style={styles.page}>
        {/* ---- Rata-rata skor ------------------------------------------- */}
        <Text style={styles.sectionTitle} minPresenceAhead={70}>{no.skor}. Rata-rata Skor & Perubahan</Text>
        {avg ? (
          <View style={styles.card} wrap={false}>
            <View style={styles.grid}>
              <Metric label="Overall" value={avg.overall} previous={prev?.overall} />
              <Metric label="Confidence" value={avg.confidence} previous={prev?.confidence} />
              <Metric label="Clarity" value={avg.clarity} previous={prev?.clarity} />
              <Metric label="Struktur" value={avg.structure} previous={prev?.structure} />
              <Metric label="Intonasi" value={avg.intonation} previous={prev?.intonation} />
              <Metric label="Kecepatan (WPM)" value={avg.wpm} previous={prev?.wpm} neutral />
              <Metric
                label="Kata Pengisi"
                value={avg.fillerWordCount}
                previous={prev?.fillerWordCount}
                lowerIsBetter
              />
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.placeholder}>
              Belum ada sesi yang dianalisis minggu ini, jadi belum ada skor
              untuk dirata-rata.
            </Text>
          </View>
        )}

        {avg ? (
          <>
          <Text style={styles.sectionTitle} minPresenceAhead={70}>{no.grafik}. Grafik Perkembangan</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Skor per sesi minggu ini</Text>
            {data.sessions.filter((s) => s.overall != null).length > 0 ? (
              data.sessions
                .filter((s) => s.overall != null)
                .map((s, i) => (
                  <Bar
                    key={i}
                    label={`${fmtShort(s.date)} · sesi ${i + 1}`}
                    value={s.overall as number}
                  />
                ))
            ) : (
              <Text style={styles.bulletDetail}>Belum ada sesi berskor.</Text>
            )}
          </View>

          {data.weeklyTrend.length > 1 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tren antar minggu (rata-rata overall)</Text>
              {data.weeklyTrend.map((w, i) => (
                <Bar key={i} label={w.label} value={w.value} />
              ))}
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Perbandingan aspek: minggu ini vs minggu lalu</Text>
            {(
              [
                ["Overall", avg.overall, prev?.overall],
                ["Confidence", avg.confidence, prev?.confidence],
                ["Clarity", avg.clarity, prev?.clarity],
                ["Struktur", avg.structure, prev?.structure],
                ["Intonasi", avg.intonation, prev?.intonation],
              ] as [string, number | null, number | null | undefined][]
            ).map(([label, now, before], i) => (
              <View key={i}>
                <Bar label={`${label} (kini)`} value={now ?? 0} />
                {before != null ? (
                  <Bar label={`${label} (lalu)`} value={before} muted />
                ) : null}
              </View>
            ))}
          </View>

          {n?.trend_reading ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pembacaan tren</Text>
              <Text style={[styles.para, { marginBottom: 0 }]}>{n.trend_reading}</Text>
            </View>
          ) : null}

          </>
        ) : null}

        {Footer}
      </Page>

      {/* =============================== halaman 3 ====================== */}
      {data.sessions.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle} minPresenceAhead={70}>{no.rincian}. Rincian Setiap Sesi</Text>
          <View style={styles.card}>
            <View style={styles.tHead}>
              {COLS.map((c) => (
                <Text key={c.key} style={[styles.th, { width: c.w }]}>
                  {c.label}
                </Text>
              ))}
            </View>
            {data.sessions.map((s, i) => (
              <View key={i} style={styles.tRow} wrap={false}>
                <Text style={[styles.td, { width: COLS[0].w }]}>{fmtShort(s.date)}</Text>
                <Text style={[styles.td, { width: COLS[1].w }]}>
                  {s.moduleTitle ?? "Latihan bebas"}
                  {s.category ? `\n${s.category}` : ""}
                </Text>
                <Text style={[styles.td, { width: COLS[2].w }]}>
                  {s.durationSeconds == null ? "-" : mmss(s.durationSeconds)}
                </Text>
                <Text style={[styles.td, { width: COLS[3].w, fontWeight: 700 }]}>
                  {s.overall ?? "-"}
                </Text>
                <Text style={[styles.td, { width: COLS[4].w }]}>{s.clarity ?? "-"}</Text>
                <Text style={[styles.td, { width: COLS[5].w }]}>{s.structure ?? "-"}</Text>
                <Text style={[styles.td, { width: COLS[6].w }]}>{s.confidence ?? "-"}</Text>
                <Text style={[styles.td, { width: COLS[7].w }]}>{s.intonation ?? "-"}</Text>
                <Text style={[styles.td, { width: COLS[8].w }]}>{s.wpm ?? "-"}</Text>
                <Text style={[styles.td, { width: COLS[9].w }]}>{s.filler ?? "-"}</Text>
              </View>
            ))}
          </View>
          {Footer}
        </Page>
      ) : null}

      {/* =============================== halaman 4 ====================== */}
      <Page size="A4" style={styles.page}>
        {n && n.strengths.length > 0 ? (
          <>
            <Text style={styles.sectionTitle} minPresenceAhead={70}>{no.kuat}. Yang Sudah Kuat</Text>
            <View style={styles.card}>
              {n.strengths.map((s, i) => (
                <Bullet key={i} title={s.title} detail={s.detail} />
              ))}
            </View>
          </>
        ) : null}

        {n && n.improvements.length > 0 ? (
          <>
            <Text style={styles.sectionTitle} minPresenceAhead={70}>{no.perbaiki}. Yang Perlu Diperbaiki</Text>
            <View style={styles.card}>
              {n.improvements.map((s, i) => (
                <Bullet
                  key={i}
                  title={s.title}
                  detail={s.detail}
                  extra={s.drill_suggestion ? `Latihan: ${s.drill_suggestion}` : undefined}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle} minPresenceAhead={70}>{no.resep}. Resep Latihan Minggu Depan</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {data.focusCategories.length > 0
              ? `Fokus utama: ${data.focusCategories.join(", ")}`
              : "Tidak ada area yang tertinggal jauh — pertahankan rotasi"}
          </Text>
          {data.recommendedDrills.length > 0 ? (
            data.recommendedDrills.map((d, i) => (
              <Bullet key={i} title={d.title} detail={`Kategori: ${d.category}`} />
            ))
          ) : (
            <Text style={styles.bulletDetail}>
              Belum cukup data untuk meresepkan drill spesifik.
            </Text>
          )}
        </View>

        {n && n.next_week_goals.length > 0 ? (
          <>
            <Text style={styles.sectionTitle} minPresenceAhead={70}>{no.target}. Target Minggu Depan</Text>
            <View style={styles.card}>
              {n.next_week_goals.map((g, i) => (
                <Bullet
                  key={i}
                  title={`${i + 1}. ${g.goal}`}
                  detail={g.why}
                  extra={g.how ? `Caranya: ${g.how}` : undefined}
                />
              ))}
            </View>
          </>
        ) : null}

        {n?.coach_note ? (
          <>
            <Text style={styles.sectionTitle} minPresenceAhead={70}>{no.catatan}. Catatan Pelatih</Text>
            <View style={styles.card}>
              <Text style={[styles.para, { marginBottom: 0 }]}>{n.coach_note}</Text>
            </View>
          </>
        ) : null}

        {!n ? (
          <View style={styles.card}>
            <Text style={styles.placeholder}>
              Catatan naratif tidak tersedia untuk minggu ini. Seluruh angka di
              laporan ini tetap lengkap dan akurat.
            </Text>
          </View>
        ) : null}

        {Footer}
      </Page>
    </Document>
  );
}

export async function renderWeeklySummaryPdf(data: WeeklySummaryData): Promise<Buffer> {
  return renderToBuffer(<WeeklySummaryDocument data={data} />);
}
