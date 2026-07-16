import fs from "node:fs";
import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

export type BadgeTier = "bronze" | "silver" | "gold";

// Same score thresholds already used elsewhere (e.g. lib/queue/worker.ts's
// scoreSticker) for consistency across the app.
const BADGE_STICKER: Record<BadgeTier, string> = {
  gold: "celebrating.png",
  silver: "thumbs-up.png",
  bronze: "tip-mic.png",
};
const BADGE_LABEL: Record<BadgeTier, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};
const badgeBuffers: Record<BadgeTier, Buffer> = {
  gold: fs.readFileSync(
    path.join(process.cwd(), "public", "stickers", "faisal", BADGE_STICKER.gold),
  ),
  silver: fs.readFileSync(
    path.join(process.cwd(), "public", "stickers", "faisal", BADGE_STICKER.silver),
  ),
  bronze: fs.readFileSync(
    path.join(process.cwd(), "public", "stickers", "faisal", BADGE_STICKER.bronze),
  ),
};

export function badgeTierFromScore(averageScore: number | null): BadgeTier {
  if (averageScore != null && averageScore >= 85) return "gold";
  if (averageScore != null && averageScore >= 65) return "silver";
  return "bronze";
}

export type MonthlyCertificateData = {
  userName: string;
  periodStart: Date;
  periodEnd: Date;
  sessionCount: number;
  badgeTier: BadgeTier;
  averages: {
    overall: number | null;
    confidence: number | null;
    clarity: number | null;
    structure: number | null;
    intonation: number | null;
    wpm: number | null;
    fillerWordCount: number | null;
  } | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    color: "#191c1e",
    fontFamily: "Helvetica",
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  logo: { width: 28, height: 32, marginRight: 10 },
  brand: { fontSize: 14, fontWeight: 700, color: "#000000" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#44474d", marginBottom: 24 },
  card: {
    borderWidth: 1,
    borderColor: "#e0e3e7",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 12, fontWeight: 700, marginBottom: 10, color: "#00629d" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  metric: { width: "33%", marginBottom: 12 },
  metricLabel: { fontSize: 9, color: "#44474d", marginBottom: 2 },
  metricValue: { fontSize: 16, fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9aa0a6",
    textAlign: "center",
  },
  // Certificate page (page 1)
  certPage: {
    padding: 48,
    fontFamily: "Helvetica",
    borderWidth: 3,
    borderColor: "#00629d",
    margin: 24,
    height: "100%",
  },
  certCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  certEyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    color: "#44474d",
    marginBottom: 12,
  },
  certTitle: {
    fontSize: 26,
    fontWeight: 700,
    color: "#000000",
    marginBottom: 24,
  },
  certName: {
    fontSize: 30,
    fontWeight: 700,
    color: "#00629d",
    marginBottom: 24,
  },
  certBody: {
    fontSize: 12,
    color: "#191c1e",
    lineHeight: 1.6,
    maxWidth: 360,
    marginBottom: 24,
  },
  badgeImage: { width: 72, height: 72, marginBottom: 8 },
  badgeLabel: { fontSize: 14, fontWeight: 700, color: "#00629d" },
  certDates: { fontSize: 10, color: "#44474d", marginTop: 24 },
});

const fmtDate = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

function Metric({ label, value, suffix = "" }: { label: string; value: number | null; suffix?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value == null ? "-" : `${Math.round(value * 10) / 10}${suffix}`}
      </Text>
    </View>
  );
}

function MonthlyCertificateDocument({ data }: { data: MonthlyCertificateData }) {
  return (
    <Document>
      {/* Page 1: Certificate */}
      <Page size="A4" orientation="landscape">
        <View style={styles.certPage}>
          <View style={styles.certCenter}>
            <Image src={{ data: logoBuffer, format: "png" }} style={{ width: 28, height: 32, marginBottom: 16 }} />
            <Text style={styles.certEyebrow}>SPEAKING PRO PREMIUM</Text>
            <Text style={styles.certTitle}>Sertifikat Pencapaian</Text>
            <Text style={styles.certName}>{data.userName}</Text>
            <Text style={styles.certBody}>
              telah menyelesaikan 1 bulan latihan bersama Speaking Pro Premium,
              dengan {data.sessionCount} sesi latihan tercatat.
            </Text>
            <Image
              src={{ data: badgeBuffers[data.badgeTier], format: "png" }}
              style={styles.badgeImage}
            />
            <Text style={styles.badgeLabel}>{BADGE_LABEL[data.badgeTier]} Achiever</Text>
            <Text style={styles.certDates}>
              {fmtDate(data.periodStart)} - {fmtDate(data.periodEnd)}
            </Text>
          </View>
        </View>
      </Page>

      {/* Page 2: Monthly summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={{ data: logoBuffer, format: "png" }} style={styles.logo} />
          <Text style={styles.brand}>Speaking Pro</Text>
        </View>

        <Text style={styles.title}>Ringkasan Bulanan</Text>
        <Text style={styles.subtitle}>
          {data.userName} · {fmtDate(data.periodStart)} - {fmtDate(data.periodEnd)}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aktivitas 1 Bulan</Text>
          <View style={styles.grid}>
            <Metric label="Sesi Latihan" value={data.sessionCount} />
          </View>
        </View>

        {data.averages ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rata-rata Skor</Text>
            <View style={styles.grid}>
              <Metric label="Overall" value={data.averages.overall} />
              <Metric label="Confidence" value={data.averages.confidence} />
              <Metric label="Clarity" value={data.averages.clarity} />
              <Metric label="Struktur" value={data.averages.structure} />
              <Metric label="Intonasi" value={data.averages.intonation} />
              <Metric label="Kecepatan (WPM)" value={data.averages.wpm} />
              <Metric label="Kata Pengisi" value={data.averages.fillerWordCount} />
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={{ fontSize: 12, textAlign: "center", color: "#44474d" }}>
              Belum ada latihan tercatat pada bulan ini.
            </Text>
          </View>
        )}

        <Text style={styles.footer}>
          Speaking Pro™ · Sertifikat pencapaian 1 bulan Premium ini bersifat sekali seumur langganan.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderMonthlyCertificatePdf(
  data: MonthlyCertificateData,
): Promise<Buffer> {
  return renderToBuffer(<MonthlyCertificateDocument data={data} />);
}
