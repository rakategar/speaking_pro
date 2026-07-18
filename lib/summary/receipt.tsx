import fs from "node:fs";
import path from "node:path";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

// Transaction receipt ("Bukti Transaksi") attached to the subscription
// activation email. Mirrors lib/summary/pdf.tsx: module-level logo buffer,
// same brand-color tokens, a render function returning a Buffer.

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));

export type ReceiptData = {
  orderId: string;
  amountIdr: number;
  paymentMethod: string | null;
  createdAt: Date;
  productTitle: string;
  customerName: string;
  // Subscription only -- one-off purchases (e-book, 1-on-1) have no validity
  // period, so the "Berlaku Hingga" row is hidden when this is absent.
  renewsAt?: Date;
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: { fontSize: 10, color: "#44474d" },
  value: { fontSize: 11, fontWeight: 700, textAlign: "right", maxWidth: "60%" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e3e7",
  },
  totalLabel: { fontSize: 12, fontWeight: 700, color: "#00629d" },
  totalValue: { fontSize: 18, fontWeight: 700, color: "#00629d" },
  paidBadge: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#e6f4ea",
    color: "#137333",
    fontSize: 11,
    fontWeight: 700,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
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

const fmtRupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function ReceiptDocument({ data }: { data: ReceiptData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={{ data: logoBuffer, format: "png" }} style={styles.logo} />
          <Text style={styles.brand}>Speaking Pro</Text>
        </View>

        <Text style={styles.title}>Bukti Transaksi</Text>
        <Text style={styles.subtitle}>
          {data.customerName} · {fmtDate(data.createdAt)}
        </Text>

        <View style={styles.card}>
          <Line label="No. Pesanan" value={data.orderId} />
          <Line label="Tanggal" value={fmtDate(data.createdAt)} />
          <Line label="Produk" value={data.productTitle} />
          <Line
            label="Metode Pembayaran"
            value={data.paymentMethod ?? "Midtrans"}
          />
          {data.renewsAt ? (
            <Line label="Berlaku Hingga" value={fmtDate(data.renewsAt)} />
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Dibayar</Text>
            <Text style={styles.totalValue}>{fmtRupiah(data.amountIdr)}</Text>
          </View>
          <Text style={styles.paidBadge}>LUNAS</Text>
        </View>

        <Text style={styles.footer}>
          Speaking Pro™ · Bukti transaksi ini dibuat otomatis. Simpan sebagai bukti pembayaran Anda.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument data={data} />);
}
