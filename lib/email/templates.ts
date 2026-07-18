// Inline-styled HTML for transactional emails -- email clients strip
// <style> blocks and Tailwind classes, so these can't reuse app/globals.css
// and instead hand-copy the brand's navy/aqua tokens directly.

const LOGO_URL = "https://app.speakingpro.online/logo.png";
const STICKER_BASE = "https://app.speakingpro.online/stickers/faisal-v2";

// Faisal sticker as a centered remote image. Email clients load remote
// images the same way they load LOGO_URL above, so this stays a plain <img>
// rather than an inline attachment.
function sticker(name: string): string {
  return `<div style="text-align:center;margin:0 0 16px;"><img src="${STICKER_BASE}/${name}.png" alt="Faisal" width="120" style="width:120px;height:auto;" /></div>`;
}

function layout(previewText: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f9fb;font-family:Arial,Helvetica,sans-serif;">
    <span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="background:#0d1c32;padding:24px 32px;">
                <img src="${LOGO_URL}" alt="Speaking Pro" height="28" style="display:block;" />
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#191c1e;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f2f4f6;color:#64748b;font-size:12px;">
                Speaking Pro &middot; Coaching komunikasi bersama Faisal
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#00a2fd;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:bold;font-size:14px;">${label}</a>`;
}

const APP_URL = "https://app.speakingpro.online";

export function subscriptionActivatedEmail(
  name: string | null,
  renewsAt: Date,
): { subject: string; html: string } {
  const displayName = name?.trim() || "Sobat Speaking Pro";
  const renewsAtStr = renewsAt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    subject: "Langganan Premium Anda aktif 🎉",
    html: layout(
      "Langganan Premium Anda aktif",
      `${sticker("celebrating")}
       <p>Halo ${displayName},</p>
       <p>Terima kasih! Langganan <strong>Speaking Pro Premium</strong> Anda sudah aktif dan berlaku hingga <strong>${renewsAtStr}</strong>.</p>
       <p>Anda sekarang punya akses penuh ke rekaman mingguan tanpa batas, analisis AI lengkap, ringkasan mingguan, dan sertifikat pencapaian bulanan.</p>
       <p>Bukti transaksi Anda terlampir pada email ini sebagai berkas PDF.</p>
       ${button("Buka Speaking Pro", APP_URL)}`,
    ),
  };
}

export function paymentFailedEmail(name: string | null): {
  subject: string;
  html: string;
} {
  const displayName = name?.trim() || "Sobat Speaking Pro";
  return {
    subject: "Pembayaran langganan tidak berhasil",
    html: layout(
      "Pembayaran langganan tidak berhasil",
      `<p>Halo ${displayName},</p>
       <p>Pembayaran untuk langganan <strong>Speaking Pro Premium</strong> Anda belum berhasil diproses. Ini bisa terjadi karena saldo, batas kartu, atau pembayaran dibatalkan.</p>
       <p>Anda bisa coba lagi kapan saja dari halaman langganan.</p>
       ${button("Coba Lagi", `${APP_URL}/subscription/renew`)}`,
    ),
  };
}

export function renewalReminderEmail(
  name: string | null,
  renewsAt: Date,
): { subject: string; html: string } {
  const displayName = name?.trim() || "Sobat Speaking Pro";
  const renewsAtStr = renewsAt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    subject: "Langganan Premium Anda akan berakhir",
    html: layout(
      "Langganan Premium Anda akan berakhir",
      `${sticker("tip-mic")}
       <p>Halo ${displayName},</p>
       <p>Langganan <strong>Speaking Pro Premium</strong> Anda akan berakhir pada <strong>${renewsAtStr}</strong>. Perpanjang sekarang supaya latihan mingguan, analisis AI, dan sertifikat bulanan Anda tidak terputus.</p>
       ${button("Perpanjang Langganan", `${APP_URL}/subscription/renew`)}`,
    ),
  };
}

export function welcomeEmail(name: string | null): {
  subject: string;
  html: string;
} {
  const displayName = name?.trim() || "Sobat Speaking Pro";
  return {
    subject: "Selamat datang di Speaking Pro! 👋",
    html: layout(
      "Selamat datang di Speaking Pro",
      `${sticker("waving-mic")}
       <p>Halo ${displayName},</p>
       <p>Selamat datang di <strong>Speaking Pro</strong>! Saya Faisal, coach komunikasi yang akan menemani perjalanan latihan bicara Anda.</p>
       <p>Mulai hari ini Anda mendapat <strong>uji coba gratis 7 hari</strong> — nikmati drill harian, rekaman latihan, dan analisis AI untuk mengasah kepercayaan diri berbicara.</p>
       ${button("Mulai Latihan", APP_URL)}
       <p style="margin-top:24px;color:#64748b;font-size:13px;">Ingin akses penuh tanpa batas setelah masa uji coba? <a href="${APP_URL}/subscription/renew" style="color:#00a2fd;">Upgrade ke Premium</a> kapan saja.</p>`,
    ),
  };
}

export function bookShippingConfirmationEmail(
  name: string | null,
  shipping: { address: string; city: string; postalCode: string },
): { subject: string; html: string } {
  const displayName = name?.trim() || "Sobat Speaking Pro";
  return {
    subject: "Pesanan Buku Speakingpro Anda dikonfirmasi 🎉",
    html: layout(
      "Pesanan Buku Speakingpro Anda dikonfirmasi",
      `${sticker("celebrating")}
       <p>Halo ${displayName},</p>
       <p>Terima kasih sudah membeli <strong>Buku Speakingpro</strong>! Pembayaran Anda sudah kami terima dan buku akan segera dikirim ke alamat berikut:</p>
       <p style="background:#f2f4f6;border-radius:12px;padding:12px 16px;margin:12px 0;">
         ${shipping.address}<br/>
         ${shipping.city}, ${shipping.postalCode}
       </p>
       <p>Tim kami akan menghubungi Anda melalui <strong>WhatsApp</strong> begitu paket dikirim beserta nomor resi.</p>
       <p style="margin-top:24px;color:#64748b;font-size:13px;">Bukti pembayaran terlampir pada email ini sebagai berkas PDF.</p>`,
    ),
  };
}

export function quotaTopupEmail(
  name: string | null,
  minutes: number,
): { subject: string; html: string } {
  const displayName = name?.trim() || "Sobat Speaking Pro";
  return {
    subject: `Kuota rekaman +${minutes} menit sudah aktif 🎉`,
    html: layout(
      `Kuota rekaman +${minutes} menit sudah aktif`,
      `${sticker("thumbs-up")}
       <p>Halo ${displayName},</p>
       <p>Terima kasih! Tambahan <strong>${minutes} menit</strong> durasi rekaman sudah masuk ke akun Anda dan bisa langsung dipakai.</p>
       <p>Menit tambahan ini <strong>tidak hangus</strong> saat kuota mingguan Anda direset tiap Senin — jadi aman dipakai kapan saja.</p>
       ${button("Mulai Merekam", `${APP_URL}/record`)}
       <p style="margin-top:24px;color:#64748b;font-size:13px;">Bukti pembayaran terlampir pada email ini sebagai berkas PDF.</p>`,
    ),
  };
}

export function bookingConfirmationEmail(
  name: string | null,
  preferredDates: string[],
  topic: string | null,
): { subject: string; html: string } {
  const displayName = name?.trim() || "Sobat Speaking Pro";
  const dateItems = preferredDates
    .map((d) => {
      const parsed = new Date(d);
      const label = isNaN(parsed.getTime())
        ? d
        : parsed.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });
      return `<li>${label}</li>`;
    })
    .join("");
  return {
    subject: "Sesi 1-on-1 Anda berhasil dipesan 🎉",
    html: layout(
      "Sesi 1-on-1 Anda berhasil dipesan",
      `${sticker("approve-mic")}
       <p>Halo ${displayName},</p>
       <p>Terima kasih! Pembayaran untuk sesi <strong>1-on-1 bersama Coach Faisal</strong> sudah kami terima.</p>
       <p><strong>Pilihan tanggal Anda:</strong></p>
       <ul style="margin:8px 0 16px;padding-left:20px;">${dateItems}</ul>
       ${topic ? `<p><strong>Topik:</strong> ${topic}</p>` : ""}
       <p>Tim kami akan menghubungi Anda melalui <strong>WhatsApp</strong> untuk mengonfirmasi jadwal final dari pilihan tanggal di atas.</p>
       <p style="margin-top:24px;color:#64748b;font-size:13px;">Bukti pembayaran terlampir pada email ini sebagai berkas PDF.</p>`,
    ),
  };
}

export function saleNotificationEmail(info: {
  productTitle: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string | null;
  amountIdr: number;
  orderId: string;
  bookingInfo?: { preferredDates: string[]; domicile: string | null; topic: string | null };
  shippingInfo?: { address: string; city: string; postalCode: string };
}): { subject: string; html: string } {
  const amountStr = `Rp${info.amountIdr.toLocaleString("id-ID")}`;
  const bookingBlock = info.bookingInfo
    ? `<p style="margin-top:16px;"><strong>Detail Booking 1-on-1:</strong></p>
       <p>Domisili: ${info.bookingInfo.domicile ?? "-"}<br/>
       Topik: ${info.bookingInfo.topic ?? "-"}<br/>
       Pilihan tanggal: ${info.bookingInfo.preferredDates
         .map((d) => {
           const p = new Date(d);
           return isNaN(p.getTime())
             ? d
             : p.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
         })
         .join(", ")}</p>`
    : "";
  const shippingBlock = info.shippingInfo
    ? `<p style="margin-top:16px;"><strong>Alamat Pengiriman:</strong></p>
       <p>${info.shippingInfo.address}<br/>
       ${info.shippingInfo.city}, ${info.shippingInfo.postalCode}</p>`
    : "";
  return {
    subject: `💰 Penjualan baru: ${info.productTitle}`,
    html: layout(
      `Penjualan baru: ${info.productTitle}`,
      `<p><strong>Ada pembelian baru di Speaking Pro!</strong></p>
       <p>Produk: <strong>${info.productTitle}</strong><br/>
       Jumlah: <strong>${amountStr}</strong><br/>
       No. Pesanan: ${info.orderId}</p>
       <p style="margin-top:16px;"><strong>Pembeli:</strong></p>
       <p>Nama: ${info.customerName}<br/>
       Email: ${info.customerEmail}<br/>
       WhatsApp: ${info.customerWhatsapp ?? "-"}</p>
       ${bookingBlock}
       ${shippingBlock}`,
    ),
  };
}

export function trialExpiringEmail(
  name: string | null,
  endsAt: Date,
): { subject: string; html: string } {
  const displayName = name?.trim() || "Sobat Speaking Pro";
  const endsAtStr = endsAt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    subject: "Masa uji coba gratis Anda akan berakhir",
    html: layout(
      "Masa uji coba gratis Anda akan berakhir",
      `${sticker("tip-mic")}
       <p>Halo ${displayName},</p>
       <p>Masa uji coba gratis <strong>Speaking Pro</strong> Anda akan berakhir pada <strong>${endsAtStr}</strong>.</p>
       <p>Langganan Premium sekarang supaya Anda tetap bisa menikmati rekaman mingguan tanpa batas, analisis AI lengkap, ringkasan mingguan, dan sertifikat pencapaian bulanan.</p>
       ${button("Langganan Sekarang", `${APP_URL}/subscription/renew`)}`,
    ),
  };
}
