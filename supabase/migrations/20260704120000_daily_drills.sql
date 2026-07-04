-- 18 Poin Daily Speaking Practice: seed the 15 new client-side drill
-- modules (engines live in the app; the DB only catalogs them), plus a
-- coach_feedback column on reports for manual coach notes.

insert into public.practice_modules (slug, title, category, difficulty, duration_minutes) values
  ('articulation-exercise',    'Artikulasi Konsonan',       'Artikulasi',       'beginner', 5),
  ('pronunciation-practice',   'Latihan Pengucapan',        'Artikulasi',       'beginner', 5),
  ('pause-technique',          'Teknik Jeda',               'Tempo',            'medium',   5),
  ('rhythm-training',          'Rhythm Training',           'Tempo',            'medium',   5),
  ('confidence-drill',         'Confidence Drill',          'Kepercayaan Diri', 'beginner', 4),
  ('self-recording-practice',  'Rekam & Evaluasi Mandiri',  'Kepercayaan Diri', 'medium',   6),
  ('guided-speaking',          'Latihan Bicara Terpandu',   'Kepercayaan Diri', 'medium',   5),
  ('vocal-variety',            'Vocal Variety',             'Intonasi',         'medium',   5),
  ('emphasis-training',        'Emphasis Training',         'Intonasi',         'beginner', 4),
  ('energy-control',           'Kontrol Energi',            'Intonasi',         'medium',   5),
  ('pause-mastery',            'Pause Mastery (Anti-Eee)',  'Filler Words',     'medium',   5),
  ('structured-thinking',      'Structured Thinking',       'Filler Words',     'medium',   5),
  ('speaking-awareness',       'Speaking Awareness',        'Filler Words',     'medium',   6),
  ('story-structure',          'Story Structure',           'Struktur',         'medium',   6),
  ('framework-speaking',       'Framework P.R.E.P',         'Struktur',         'medium',   5),
  ('opening-closing',          'Opening & Closing',         'Struktur',         'hard',     5)
on conflict (slug) do nothing;

alter table public.reports add column if not exists coach_feedback text;
