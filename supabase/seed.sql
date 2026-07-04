-- Speaking Pro — seed catalog data (practice modules, coach, products).
-- Slugs MUST match lib/modules.ts (aiueo-drill, dynamic-pitch,
-- breathing-control, free-recording) so the Library links to the drills.

insert into public.practice_modules (slug, title, category, difficulty, duration_minutes, is_ai_recommended) values
  ('aiueo-drill',       'Latihan Artikulasi AIUEO',   'Artikulasi', 'beginner', 3, true),
  ('dynamic-pitch',     'Intonasi Dinamis',           'Intonasi',   'medium',   5, false),
  ('breathing-control', 'Kontrol Pernapasan 4-4-8',   'Pernapasan', 'beginner', 4, true),
  ('free-recording',    'Rekaman Bebas (Simulasi)',   'Simulasi',   'hard',     5, false)
on conflict (slug) do nothing;

insert into public.coaches (id, name, headline) values
  ('11111111-1111-1111-1111-111111111111', 'Coach Faisal Maulana', 'Certified Public Speaking & Vocal Coach')
on conflict (id) do nothing;

insert into public.coaching_products (coach_id, title, type, description, price_idr) values
  ('11111111-1111-1111-1111-111111111111', 'E-Book: 50 Pembuka Pidato Memukau', 'ebook',         'Kumpulan 50 template pembuka pidato yang langsung bisa dipakai untuk berbagai acara.', 49000),
  ('11111111-1111-1111-1111-111111111111', 'Video Course: Teknik Vokal Profesional', 'video_course', 'Kelas video 3 jam tentang proyeksi suara, artikulasi, dan kontrol napas untuk berbicara di depan umum.', 299000),
  ('11111111-1111-1111-1111-111111111111', 'Sesi 1-on-1 dengan Coach Faisal',   '1on1',          'Sesi coaching privat 60 menit untuk membedah dan meningkatkan kemampuan public speaking Anda.', 750000),
  ('11111111-1111-1111-1111-111111111111', 'Speaking Pro Premium (Bulanan)',    'subscription',  'Akses penuh semua modul latihan, analisis AI tanpa batas, dan laporan mendalam.', 99000);
