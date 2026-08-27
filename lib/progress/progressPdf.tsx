// The printable version of /progress: a participant's whole practice history
// in one document, for saving or handing to a trainer.
//
// Visual language copied from lib/summary/pdf.tsx (same tokens, same Metric/
// Bar/table primitives) so the two PDFs a user can receive look like they came
// from the same product. Bars are drawn as <View>s -- @react-pdf has no chart
// renderer, and the weekly summary already solved this the same way.

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
import { MODULE_META } from "@/lib/modules";
import { fallbackReason } from "@/lib/mentor/plan";
import type { ProgressAnalysis } from "@/lib/progress/analytics";

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

const NAVY = "#0d1c32";
const BLUE = "#00629d";
const CYAN = "#00a2fd";
const PALE = "#b9d9f0";
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
  sectionTitle: { fontSize: 13, fontWeight: 700, color: NAVY, marginTop: 6, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 11, fontWeight: 700, marginBottom: 10, color: BLUE },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  metric: { width: "33.33%", marginBottom: 12, paddingRight: 6 },
  metricLabel: { fontSize: 8, color: MUTED, marginBottom: 2 },
  metricValue: { fontSize: 15, fontWeight: 700 },
  delta: { fontSize: 8, marginTop: 1 },
  para: { fontSize: 10, lineHeight: 1.6, marginBottom: 8, color: "#191c1e" },
  bulletRow: { flexDirection: "row", marginBottom: 6 },
  bulletDot: { width: 10, fontSize: 10, color: CYAN },
  bulletText: { flex: 1, fontSize: 9.5, color: MUTED, lineHeight: 1.5 },
  // Same look as bulletText but without flex:1 -- outside a row, flex makes
  // react-pdf size the block oddly and stacked lines can collide.
  bodyText: { fontSize: 9.5, color: MUTED, lineHeight: 1.5 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  barLabel: { width: 90, fontSize: 8, color: MUTED },
  barTrack: { flex: 1, height: 11, backgroundColor: "#f1f4f7", borderRadius: 3 },
  barFill: { height: 11, backgroundColor: CYAN, borderRadius: 3 },
  barValue: { width: 34, fontSize: 8, textAlign: "right", color: MUTED },
  tRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 5 },
  tHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: NAVY, paddingBottom: 5 },
  th: { fontSize: 7.5, fontWeight: 700, color: NAVY },
  td: { fontSize: 8, color: "#191c1e" },
  monthCol: { alignItems: "center", width: 44 },
  monthBarWrap: { height: 60, justifyContent: "flex-end" },
  monthBar: { width: 18, backgroundColor: CYAN, borderRadius: 2 },
  monthLabel: { fontSize: 7, color: MUTED, marginTop: 3 },
  monthValue: { fontSize: 7, color: NAVY, marginBottom: 2 },
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

function Metric({
  label,
  value,
  suffix = "",
  note,
  noteColor = MUTED,
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
  note?: string;
  noteColor?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value == null ? "-" : `${value}${suffix}`}
      </Text>
      {note ? <Text style={[styles.delta, { color: noteColor }]}>{note}</Text> : null}
    </View>
  );
}

/** Horizontal bar. `muted` draws the lifetime figure pale behind the recent one. */
function Bar({
  label,
  value,
  max = 100,
  muted = false,
  suffix = "",
}: {
  label: string;
  value: number;
  max?: number;
  muted?: boolean;
  suffix?: string;
}) {
  const pct = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[styles.barFill, { width: `${pct}%` }, muted ? { backgroundColor: PALE } : {}]}
        />
      </View>
      <Text style={styles.barValue}>
        {round1(value)}
        {suffix}
      </Text>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const COLS = [
  { label: "Tgl", w: "10%" },
  { label: "Modul", w: "30%" },
  { label: "Durasi", w: "12%" },
  { label: "Overall", w: "10%" },
  { label: "Clar", w: "9%" },
  { label: "Strukt", w: "10%" },
  { label: "Conf", w: "9%" },
  { label: "WPM", w: "10%" },
] as const;

export type ProgressPdfData = {
  userName: string;
  generatedAt: Date;
  analysis: ProgressAnalysis;
};

function ProgressDocument({ data }: { data: ProgressPdfData }) {
  const a = data.analysis;
  const growth =
    a.overallFirst !== null && a.overallLatest !== null
      ? a.overallLatest - a.overallFirst
      : null;
  const monthPeak = Math.max(1, ...a.monthly.map((m) => m.sessions + m.drills));

  // Most recent first: the table is read top-down and the latest session is
  // what a reader looks for.
  const tableRows = [...a.points].reverse().slice(0, 60);

  return (
    <Document
      title={`Analisis Menyeluruh - ${data.userName}`}
      author="Speaking Pro"
      language="id-ID"
    >
      {/* ── Page 1: the journey ────────────────────────────────────────── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoBuffer} style={styles.logo} />
          <Text style={styles.brand}>Speaking Pro</Text>
        </View>

        <Text style={styles.title}>Analisis Menyeluruh</Text>
        <Text style={styles.subtitle}>
          {data.userName}
          {a.firstSessionAt && a.lastSessionAt
            ? ` · ${fmtDate(new Date(a.firstSessionAt))} – ${fmtDate(new Date(a.lastSessionAt))}`
            : ""}
        </Text>
        <Text style={styles.levelPill}>{speakingLevel(a.overallLatest)}</Text>

        {!a.hasData ? (
          <View style={styles.card}>
            <Text style={styles.placeholder}>
              Belum ada latihan yang tercatat. Selesaikan satu rekaman analisis
              dan laporan ini akan terisi dengan perjalanan Anda.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Perjalanan Skor</Text>
              <View style={styles.grid}>
                <Metric label="Skor pertama" value={a.overallFirst} />
                <Metric label="Skor terakhir" value={a.overallLatest} />
                <Metric
                  label="Perubahan"
                  value={growth === null ? null : `${growth > 0 ? "+" : ""}${growth}`}
                  note={growth === null ? "belum ada pembanding" : "sejak sesi pertama"}
                  noteColor={growth === null ? MUTED : growth >= 0 ? GOOD : BAD}
                />
                <Metric label="Skor terbaik" value={a.overallBest} />
                <Metric label="Sesi analisis" value={a.totalSessions} />
                <Metric label="Drill selesai" value={a.totalDrills} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Volume Latihan</Text>
              <View style={styles.grid}>
                <Metric label="Total menit" value={a.totalMinutes} />
                <Metric label="Hari aktif" value={a.activeDays} />
                <Metric
                  label="Runtun terpanjang"
                  value={a.bestStreakDays}
                  suffix=" hari"
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Rincian Per Metrik</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Rata-rata 5 sesi terakhir (biru tua) vs seumur waktu (biru muda)
              </Text>
              {a.metricTrends.map((t) => (
                <View key={t.key}>
                  {t.recent !== null && (
                    <Bar
                      label={t.label}
                      value={t.recent}
                      max={t.max}
                      suffix={t.key === "wpm" ? "" : ""}
                    />
                  )}
                  {t.lifetime !== null && (
                    <Bar label="" value={t.lifetime} max={t.max} muted />
                  )}
                </View>
              ))}
              {a.metricTrends.every((t) => t.recent === null) && (
                <Text style={styles.placeholder}>
                  Belum ada sesi bernilai untuk dirinci.
                </Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>Kekuatan &amp; Yang Perlu Ditingkatkan</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Kekuatan</Text>
              {a.strengths.length === 0 ? (
                <Text style={styles.bodyText}>
                  Belum ada metrik yang menonjol. Konsistensi dulu, keunggulan menyusul.
                </Text>
              ) : (
                a.strengths.map((s, i) => <Bullet key={i} text={s} />)
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Perlu Ditingkatkan</Text>
              {a.weaknesses.length === 0 ? (
                <Text style={styles.bodyText}>
                  Tidak ada metrik yang berada di bawah ambang. Pertahankan.
                </Text>
              ) : (
                a.weaknesses.map((s, i) => <Bullet key={i} text={s} />)
              )}
            </View>
          </>
        )}

        <Text style={styles.footer} fixed>
          Speaking Pro · Analisis menyeluruh dicetak {fmtDate(data.generatedAt)}
        </Text>
      </Page>

      {/* ── Page 2: activity, projection, recommendations ──────────────── */}
      {a.hasData && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Aktivitas Bulanan</Text>
          <View style={styles.card}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {a.monthly.map((m) => {
                const total = m.sessions + m.drills;
                return (
                  <View key={m.month} style={styles.monthCol}>
                    <Text style={styles.monthValue}>
                      {m.avgOverall === null ? "-" : Math.round(m.avgOverall)}
                    </Text>
                    <View style={styles.monthBarWrap}>
                      <View
                        style={[
                          styles.monthBar,
                          { height: Math.max(3, Math.round((total / monthPeak) * 58)) },
                        ]}
                      />
                    </View>
                    <Text style={styles.monthLabel}>{m.label}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={[styles.bodyText, { marginTop: 8 }]}>
              Tinggi bar = jumlah latihan bulan itu. Angka di atas = rata-rata skor.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Performa Per Kategori</Text>
          <View style={styles.card}>
            {a.byCategory.length === 0 ? (
              <Text style={styles.bodyText}>Belum ada data kategori.</Text>
            ) : (
              a.byCategory.map((c) => (
                <View key={c.category} style={styles.tRow}>
                  <Text style={[styles.td, { width: "50%" }]}>{c.category}</Text>
                  <Text style={[styles.td, { width: "22%" }]}>{c.sessions} latihan</Text>
                  <Text style={[styles.td, { width: "14%" }]}>{c.minutes} mnt</Text>
                  <Text style={[styles.td, { width: "14%", textAlign: "right" }]}>
                    {round1(c.avgOverall)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <Text style={styles.sectionTitle}>Proyeksi 30 Hari</Text>
          <View style={styles.card}>
            {a.forecast.projected === null ? (
              <Text style={styles.para}>
                Data belum cukup untuk memproyeksikan skor
                {a.forecast.points > 0 ? ` (baru ${a.forecast.points} sesi bernilai)` : ""}.
                Diperlukan minimal 4 sesi analisis agar garis trennya layak dipercaya.
              </Text>
            ) : (
              <>
                <View style={styles.grid}>
                  <Metric label="Skor sekarang" value={round1(a.forecast.current)} />
                  <Metric label="Proyeksi 30 hari" value={round1(a.forecast.projected)} />
                  <Metric
                    label="Laju"
                    value={`${a.forecast.slopePerWeek >= 0 ? "+" : ""}${round1(a.forecast.slopePerWeek)}`}
                    suffix=" /minggu"
                  />
                </View>
                <Text style={styles.para}>
                  Tingkat keyakinan: {a.forecast.confidence} (dihitung dari{" "}
                  {a.forecast.points} sesi bernilai).
                  {a.forecast.confidence === "lemah" &&
                    " Angka ini masih berupa indikasi awal, bukan kepastian."}
                </Text>
              </>
            )}
          </View>

          <Text style={styles.sectionTitle}>Latihan Yang Direkomendasikan</Text>
          <View style={styles.card}>
            {a.recommendations.map((pick, i) => (
              <View key={pick.slug} style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: NAVY }}>
                  {i + 1}. {pick.category}
                </Text>
                <Text style={[styles.bodyText, { marginTop: 2 }]}>
                  {fallbackReason(pick)}
                </Text>
                <Text style={[styles.bodyText, { color: BLUE, marginTop: 2 }]}>
                  {MODULE_META[pick.slug]?.description.split(".")[0] ?? pick.slug}.
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.footer} fixed>
            Speaking Pro · Analisis menyeluruh dicetak {fmtDate(data.generatedAt)}
          </Text>
        </Page>
      )}

      {/* ── Page 3: the session log ────────────────────────────────────── */}
      {a.hasData && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>
            Riwayat Sesi {tableRows.length < a.points.length ? "(60 terbaru)" : ""}
          </Text>
          <View style={styles.tHead}>
            {COLS.map((c) => (
              <Text key={c.label} style={[styles.th, { width: c.w }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {tableRows.map((p) => (
            <View key={p.id} style={styles.tRow}>
              <Text style={[styles.td, { width: COLS[0].w }]}>{fmtShort(p.createdAt)}</Text>
              <Text style={[styles.td, { width: COLS[1].w }]}>
                {p.moduleTitle ?? (p.isDrill ? "Drill harian" : "Rekaman bebas")}
              </Text>
              <Text style={[styles.td, { width: COLS[2].w }]}>{mmss(p.durationSeconds)}</Text>
              <Text style={[styles.td, { width: COLS[3].w }]}>{p.overall ?? "-"}</Text>
              <Text style={[styles.td, { width: COLS[4].w }]}>{p.clarity ?? "-"}</Text>
              <Text style={[styles.td, { width: COLS[5].w }]}>{p.structure ?? "-"}</Text>
              <Text style={[styles.td, { width: COLS[6].w }]}>{p.confidence ?? "-"}</Text>
              <Text style={[styles.td, { width: COLS[7].w }]}>{p.wpm ?? "-"}</Text>
            </View>
          ))}

          <Text style={styles.footer} fixed>
            Speaking Pro · Analisis menyeluruh dicetak {fmtDate(data.generatedAt)}
          </Text>
        </Page>
      )}
    </Document>
  );
}

export async function renderProgressReport(data: ProgressPdfData): Promise<Buffer> {
  return renderToBuffer(<ProgressDocument data={data} />);
}
