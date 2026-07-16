import fs from "node:fs";
import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

export type WeeklySummaryData = {
  userName: string;
  weekIndex: number;
  periodStart: Date;
  periodEnd: Date;
  sessionCount: number;
  streakCount: number;
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
  placeholder: { fontSize: 12, textAlign: "center", color: "#44474d", lineHeight: 1.6 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9aa0a6",
    textAlign: "center",
  },
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

function WeeklySummaryDocument({ data }: { data: WeeklySummaryData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={{ data: logoBuffer, format: "png" }} style={styles.logo} />
          <Text style={styles.brand}>Speaking Pro</Text>
        </View>

        <Text style={styles.title}>Ringkasan Mingguan #{data.weekIndex}</Text>
        <Text style={styles.subtitle}>
          {data.userName} · {fmtDate(data.periodStart)} - {fmtDate(data.periodEnd)}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aktivitas Minggu Ini</Text>
          <View style={styles.grid}>
            <Metric label="Sesi Latihan" value={data.sessionCount} />
            <Metric label="Streak Saat Ini" value={data.streakCount} suffix=" hari" />
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
            <Text style={styles.placeholder}>
              Belum ada latihan minggu ini.{"\n"}Yuk mulai sesi pertamamu!
            </Text>
          </View>
        )}

        <Text style={styles.footer}>
          Speaking Pro™ · Ringkasan ini dibuat otomatis setiap minggu sejak Anda berlangganan Premium.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderWeeklySummaryPdf(data: WeeklySummaryData): Promise<Buffer> {
  return renderToBuffer(<WeeklySummaryDocument data={data} />);
}
