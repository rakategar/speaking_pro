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

// The credential letter an admin hands to a B2B client: how to get in, what
// each screen is for, and what to do about the password. Written to be sent
// as-is, with no covering explanation needed.

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

const NAVY = "#0d1c32";
const BLUE = "#00629d";
const MUTED = "#44474d";
const LINE = "#e0e3e7";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10,
    color: "#191c1e",
    fontFamily: "Helvetica",
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  logo: { width: 28, height: 32, marginRight: 10 },
  brand: { fontSize: 14, fontWeight: 700, color: "#000000" },
  title: { fontSize: 21, fontWeight: 700, marginBottom: 4, color: NAVY },
  subtitle: { fontSize: 11, color: MUTED, marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: NAVY,
    marginTop: 14,
    marginBottom: 8,
  },
  para: { fontSize: 10, lineHeight: 1.6, marginBottom: 8 },
  credBox: {
    borderWidth: 1.5,
    borderColor: BLUE,
    borderRadius: 8,
    padding: 16,
    marginBottom: 6,
    backgroundColor: "#f5faff",
  },
  credRow: { flexDirection: "row", marginBottom: 8 },
  credLabel: { width: 108, fontSize: 9, color: MUTED },
  credValue: { flex: 1, fontSize: 12, fontWeight: 700, color: NAVY },
  credMono: {
    flex: 1,
    fontSize: 13,
    fontWeight: 700,
    color: BLUE,
    fontFamily: "Courier",
  },
  stepRow: { flexDirection: "row", marginBottom: 9 },
  stepNum: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: NAVY,
    color: "#ffffff",
    fontSize: 8,
    textAlign: "center",
    paddingTop: 3.5,
    marginRight: 8,
  },
  stepText: { flex: 1, fontSize: 10, lineHeight: 1.5 },
  menuRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 6,
  },
  menuName: { width: 96, fontSize: 10, fontWeight: 700, color: BLUE },
  menuDesc: { flex: 1, fontSize: 9.5, color: MUTED, lineHeight: 1.5 },
  noteBox: {
    borderWidth: 1,
    borderColor: "#f2c94c",
    backgroundColor: "#fffaeb",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  noteText: { fontSize: 9.5, lineHeight: 1.6, color: "#7a5c00", marginBottom: 4 },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 44,
    right: 44,
    fontSize: 8,
    color: "#9aa0a6",
    textAlign: "center",
  },
});

const MENUS: { name: string; desc: string }[] = [
  {
    name: "Ringkasan",
    desc: "Gambaran umum program: berapa peserta aktif, total sesi dan menit latihan, rata-rata skor, aktivitas harian, proyeksi, serta daftar peserta yang perlu perhatian.",
  },
  {
    name: "Peserta",
    desc: "Daftar seluruh peserta beserta jumlah sesi, menit, skor rata-rata, dan perubahannya. Bisa dicari, disaring per status, dan dipilih untuk dikirimi notifikasi. Klik nama peserta untuk melihat detailnya.",
  },
  {
    name: "Analitik AI",
    desc: "Ringkasan naratif otomatis: apa yang sudah berjalan baik, apa yang perlu diwaspadai, pembacaan tren, dan tiga langkah tindak lanjut yang disarankan.",
  },
  {
    name: "Notifikasi",
    desc: "Kirim pengingat atau pengumuman ke seluruh peserta atau ke peserta yang belum aktif, lengkap dengan riwayat pengiriman.",
  },
  {
    name: "Laporan",
    desc: "Unduh rekap program dalam bentuk PDF untuk periode 7, 30, atau 90 hari.",
  },
];

export type CredentialsData = {
  orgName: string;
  fullName: string | null;
  email: string;
  password: string;
  dashboardUrl: string;
  supportEmail: string;
  issuedAt: Date;
  /** True for a re-issue after a password reset, false for a new account. */
  isReset: boolean;
};

function Step({ n, children }: { n: number; children: string }) {
  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepNum}>{n}</Text>
      <Text style={styles.stepText}>{children}</Text>
    </View>
  );
}

function CredentialsDocument({ data }: { data: CredentialsData }) {
  const fmtDate = data.issuedAt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`Kredensial Dashboard - ${data.orgName}`}
      author="Speaking Pro"
      creator="Speaking Pro"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoBuffer} style={styles.logo} />
          <View>
            <Text style={styles.brand}>Speaking Pro</Text>
            <Text style={{ fontSize: 8, color: MUTED }}>Dashboard Client B2B</Text>
          </View>
        </View>

        <Text style={styles.title}>
          {data.isReset ? "Kredensial Baru" : "Akses Dashboard Monitoring"}
        </Text>
        <Text style={styles.subtitle}>
          {data.orgName} · diterbitkan {fmtDate}
        </Text>

        <Text style={styles.para}>
          {data.fullName ? `Yth. ${data.fullName},` : "Yth. Bapak/Ibu,"}
        </Text>
        <Text style={styles.para}>
          {data.isReset
            ? "Berikut kredensial baru untuk masuk ke dashboard monitoring peserta training Speaking Pro. Password lama sudah tidak berlaku."
            : "Berikut kredensial untuk masuk ke dashboard monitoring peserta training Speaking Pro. Melalui dashboard ini Anda dapat memantau perkembangan seluruh peserta dari organisasi Anda, mengirim pengingat, dan mengunduh laporan program."}
        </Text>

        <View style={styles.credBox}>
          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Alamat dashboard</Text>
            <Text style={styles.credValue}>{data.dashboardUrl}</Text>
          </View>
          <View style={styles.credRow}>
            <Text style={styles.credLabel}>Email</Text>
            <Text style={styles.credValue}>{data.email}</Text>
          </View>
          <View style={[styles.credRow, { marginBottom: 0 }]}>
            <Text style={styles.credLabel}>Password sementara</Text>
            <Text style={styles.credMono}>{data.password}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 8.5, color: MUTED, marginBottom: 6 }}>
          Password ditulis dengan huruf besar-kecil yang dibedakan. Karakter yang
          mudah tertukar (angka nol, huruf O, angka satu, huruf i) sengaja tidak
          digunakan.
        </Text>

        <Text style={styles.sectionTitle}>Cara Masuk</Text>
        <Step n={1}>
          Buka alamat dashboard di atas melalui peramban (Chrome, Edge, atau
          Safari) di komputer maupun ponsel.
        </Step>
        <Step n={2}>
          Masukkan email dan password sementara persis seperti tertulis pada
          kotak di atas, lalu tekan Masuk.
        </Step>
        <Step n={3}>
          Anda akan langsung diminta mengganti password. Buat password baru
          minimal 10 karakter yang hanya Anda ketahui, lalu simpan.
        </Step>
        <Step n={4}>
          Dashboard terbuka pada halaman Ringkasan. Gunakan menu di bagian atas
          untuk berpindah antar halaman.
        </Step>

        <Text style={styles.sectionTitle}>Isi Dashboard</Text>
        {MENUS.map((m) => (
          <View key={m.name} style={styles.menuRow}>
            <Text style={styles.menuName}>{m.name}</Text>
            <Text style={styles.menuDesc}>{m.desc}</Text>
          </View>
        ))}

        <View style={styles.noteBox}>
          <Text style={[styles.noteText, { fontWeight: 700 }]}>Catatan penting</Text>
          <Text style={styles.noteText}>
            • Password sementara di atas wajib diganti pada saat pertama masuk dan
            tidak dapat digunakan lagi setelahnya.
          </Text>
          <Text style={styles.noteText}>
            • Jangan membagikan kredensial ini. Bila ada rekan yang juga perlu
            akses, hubungi kami agar dibuatkan akun tersendiri.
          </Text>
          <Text style={styles.noteText}>
            • Sesi berakhir otomatis setelah 8 jam; Anda cukup masuk kembali.
          </Text>
          <Text style={styles.noteText}>
            • Dashboard menampilkan nama, skor, dan aktivitas latihan peserta.
            Rekaman suara maupun transkrip ucapan peserta tidak dapat diakses dari
            dashboard ini.
          </Text>
          <Text style={styles.noteText}>
            • Lupa password atau kredensial hilang? Hubungi {data.supportEmail} untuk
            penerbitan ulang.
          </Text>
        </View>

        <Text style={styles.footer}>
          Speaking Pro · Kredensial dashboard {data.orgName} · {fmtDate}
        </Text>
      </Page>
    </Document>
  );
}

export function renderCredentialsPdf(data: CredentialsData): Promise<Buffer> {
  return renderToBuffer(<CredentialsDocument data={data} />);
}
