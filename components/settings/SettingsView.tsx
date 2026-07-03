"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Toggle } from "@/components/ui/Toggle";
import { SignOutButton } from "@/components/profile/SignOutButton";
import { TopAppBar } from "@/components/layout/TopAppBar";

type Profile = {
  full_name: string;
  occupation: string;
  avatar_url: string | null;
  subscription_tier: string;
  subscription_renews_at: string | null;
};

type NotifPrefs = {
  push: boolean;
  digest: boolean;
  marketing: boolean;
};

const NOTIF_KEY = "speaking-pro:notif-prefs";

export function SettingsView({
  email,
  initialProfile,
}: {
  email: string;
  initialProfile: Profile;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(initialProfile.full_name);
  const [occupation, setOccupation] = useState(initialProfile.occupation);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<NotifPrefs>({
    push: true,
    digest: true,
    marketing: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (raw) setPrefs(JSON.parse(raw));
    } catch {}
  }, []);

  function setPref<K extends keyof NotifPrefs>(key: K, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  }

  async function saveProfile() {
    setSaving(true);
    setNotice(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName || null, occupation: occupation || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setNotice(`Gagal menyimpan: ${error.message}`);
      return;
    }
    setEditing(false);
    setNotice("Profil tersimpan.");
    router.refresh();
  }

  async function changePassword() {
    setNotice(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    });
    setNotice(
      error
        ? `Gagal mengirim email: ${error.message}`
        : `Link ganti password terkirim ke ${email}.`,
    );
  }

  const isPro = initialProfile.subscription_tier === "premium";
  const renews = initialProfile.subscription_renews_at
    ? new Date(initialProfile.subscription_renews_at).toLocaleDateString(
        "id-ID",
        { day: "numeric", month: "long", year: "numeric" },
      )
    : null;

  const displayName = fullName || email.split("@")[0];

  return (
    <div className="min-h-screen bg-background">
      <TopAppBar variant="back" title="Account Settings" />
      <main className="pt-[90px] pb-12 px-margin-mobile max-w-5xl mx-auto flex flex-col md:grid md:grid-cols-2 gap-bento-gap">
        {/* Account information */}
        <section className="md:col-span-2 bg-surface-card rounded-3xl p-6 shadow-soft border border-stroke-subtle/50 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <h2 className="font-title-lg text-title-lg text-primary">
              Informasi Akun
            </h2>
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="font-label-md text-label-md text-secondary bg-secondary/5 hover:bg-secondary/10 px-4 py-2 rounded-lg transition-colors border border-secondary/20"
            >
              {editing ? "Batal" : "Edit Profil"}
            </button>
          </div>

          {editing ? (
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <label
                  htmlFor="full_name"
                  className="block text-label-md font-label-md text-on-surface-variant mb-2"
                >
                  Nama Lengkap
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama Anda"
                  className="w-full rounded-2xl border border-outline-variant bg-surface-card py-3 px-4 text-body-md text-on-surface focus:border-secondary-container focus:outline-none focus:ring-2 focus:ring-secondary-container/30 transition"
                />
              </div>
              <div>
                <label
                  htmlFor="occupation"
                  className="block text-label-md font-label-md text-on-surface-variant mb-2"
                >
                  Pekerjaan
                </label>
                <input
                  id="occupation"
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="cth. Product Manager"
                  className="w-full rounded-2xl border border-outline-variant bg-surface-card py-3 px-4 text-body-md text-on-surface focus:border-secondary-container focus:outline-none focus:ring-2 focus:ring-secondary-container/30 transition"
                />
              </div>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="self-start bg-primary-container text-on-primary px-8 py-3 rounded-full font-label-md text-label-md hover:opacity-90 active:scale-95 transition disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mt-2">
              <div className="w-24 h-24 rounded-full border-4 border-surface shadow-sm bg-secondary-container flex items-center justify-center overflow-hidden shrink-0">
                {initialProfile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={initialProfile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-heading text-headline-md font-bold text-on-secondary">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <h3 className="font-headline-md text-headline-md-mobile text-headline-md text-primary">
                  {displayName}
                </h3>
                <p className="font-body-md text-body-md text-text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    mail
                  </span>
                  {email}
                </p>
                {occupation && (
                  <p className="font-body-md text-body-md text-text-secondary flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-[18px]">
                      work
                    </span>
                    {occupation}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 items-start sm:items-end">
                <span className="font-label-sm text-label-sm px-3 py-1 bg-tertiary-fixed/20 text-on-tertiary-container rounded-full border border-tertiary-fixed/30">
                  {isPro ? "Pro Tier Active" : "Free Tier"}
                </span>
                {isPro && renews && (
                  <span className="font-label-sm text-label-sm text-text-secondary">
                    Perpanjangan {renews}
                  </span>
                )}
              </div>
            </div>
          )}
          {notice && (
            <p
              role="status"
              className="rounded-2xl bg-secondary-fixed text-on-secondary-fixed px-4 py-3 text-label-md font-label-md"
            >
              {notice}
            </p>
          )}
        </section>

        {/* Notifications */}
        <section className="bg-surface-card rounded-3xl p-6 shadow-soft border border-stroke-subtle/50 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-stroke-subtle pb-4">
            <div className="w-10 h-10 rounded-full bg-secondary-container/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary">
                notifications
              </span>
            </div>
            <h2 className="font-title-lg text-title-lg text-primary">
              Notifikasi
            </h2>
          </div>
          <div className="flex flex-col gap-5">
            {(
              [
                {
                  key: "push",
                  title: "Push Notifications",
                  subtitle: "Pengingat latihan harian",
                },
                {
                  key: "digest",
                  title: "Email Digest",
                  subtitle: "Rapor progres mingguan",
                },
                {
                  key: "marketing",
                  title: "Marketing Emails",
                  subtitle: "Penawaran spesial dan berita",
                },
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-primary">
                    {item.title}
                  </span>
                  <span className="font-body-md text-text-secondary text-sm">
                    {item.subtitle}
                  </span>
                </div>
                <Toggle
                  checked={prefs[item.key]}
                  onChange={(v) => setPref(item.key, v)}
                  label={item.title}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Security & privacy */}
        <section className="bg-surface-card rounded-3xl p-6 shadow-soft border border-stroke-subtle/50 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-stroke-subtle pb-4">
            <div className="w-10 h-10 rounded-full bg-primary-container/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">
                lock
              </span>
            </div>
            <h2 className="font-title-lg text-title-lg text-primary">
              Keamanan &amp; Privasi
            </h2>
          </div>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={changePassword}
              className="flex items-center justify-between py-3 group hover:bg-surface-container-lowest -mx-2 px-2 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-text-secondary group-hover:text-primary transition-colors">
                  password
                </span>
                <span className="font-label-md text-label-md text-primary">
                  Ganti Password
                </span>
              </div>
              <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">
                chevron_right
              </span>
            </button>
            <div className="flex items-center justify-between py-3 -mx-2 px-2 opacity-60">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-text-secondary">
                  shield_person
                </span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-primary">
                    Two-Factor Authentication
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary">
                    Segera hadir
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 -mx-2 px-2 opacity-60">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-text-secondary">
                  devices
                </span>
                <span className="font-label-md text-label-md text-primary">
                  Perangkat Terhubung
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Help & support */}
        <section className="md:col-span-2 bg-surface-card rounded-3xl p-6 shadow-soft border border-stroke-subtle/50 flex flex-col gap-6">
          <h2 className="font-title-lg text-title-lg text-primary">
            Bantuan &amp; Dukungan
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "help", label: "FAQ & Artikel" },
              { icon: "support_agent", label: "Hubungi Support" },
              { icon: "menu_book", label: "Panduan Pengguna" },
              { icon: "bug_report", label: "Laporkan Masalah" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-start gap-3 p-4 rounded-xl border border-stroke-subtle hover:border-secondary-container hover:shadow-sm cursor-pointer transition-all bg-background/50 group"
              >
                <span className="material-symbols-outlined text-secondary text-[28px] group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="font-label-md text-label-md text-primary">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Sign out */}
        <div className="md:col-span-2 flex flex-col items-center justify-center pt-6 gap-2 pb-8">
          <SignOutButton variant="ghost" />
          <span className="font-label-sm text-label-sm text-text-secondary opacity-60">
            Speaking Pro™ v1.0.0
          </span>
        </div>
      </main>
    </div>
  );
}
