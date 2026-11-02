-- ============================================================
-- AMAL TRACKER — SCHEMA
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Enable UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Jakarta',
  hijri_offset integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil pengguna, 1:1 dengan auth.users';

-- Trigger: auto-create profile saat user mendaftar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. AMAL_CATEGORIES
-- ============================================================
create table public.amal_categories (
  id serial primary key,
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. AMALAN (Katalog amalan)
-- ============================================================
create table public.amalan (
  id serial primary key,
  category_id integer not null references public.amal_categories(id) on delete restrict,
  slug text not null unique,
  name text not null,
  description text,
  amal_type text not null check (amal_type in ('wajib', 'sunah', 'akhlak', 'sosial', 'evaluasi')),
  default_unit text default 'kali',  -- 'kali', 'menit', 'ayat', 'halaman', dll
  is_negative boolean not null default false,  -- true untuk perilaku yang dievaluasi (ghibah, dll)
  verification_status text not null default 'unverified'
    check (verification_status in ('verified', 'unverified', 'needs_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_amalan_category on public.amalan(category_id);
create index idx_amalan_type on public.amalan(amal_type);

-- ============================================================
-- 4. AMAL_REFERENCES (Dalil)
-- ============================================================
create table public.amal_references (
  id serial primary key,
  amalan_id integer not null references public.amalan(id) on delete cascade,
  reference_type text not null check (reference_type in ('quran', 'hadith', 'scholar', 'educational')),
  source_name text not null,          -- "Qur'an", "Sahih Bukhari", "Tafsir Ibnu Katsir"
  reference_detail text,              -- "QS. Al-Baqarah: 43" atau "HR. Bukhari no. 8"
  arabic_text text,
  translation_text text,
  grading text,                       -- "Sahih", "Hasan", "Dhaif" (untuk hadis)
  url text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_amal_ref_amalan on public.amal_references(amalan_id);

-- ============================================================
-- 5. USER_AMALAN_LOGS (Catatan harian pengguna)
-- ============================================================
create table public.user_amalan_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amalan_id integer not null references public.amalan(id) on delete restrict,
  log_date date not null,             -- tanggal lokal (Asia/Jakarta)
  status text not null default 'done'
    check (status in ('done', 'not_done', 'partial', 'skipped')),
  quantity numeric,                   -- jumlah/durasi
  unit text,                          -- unit kustom jika berbeda dari default
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Satu catatan per amalan per hari per user (mencegah duplikasi)
  constraint uq_user_amalan_date unique (user_id, amalan_id, log_date)
);

create index idx_logs_user_date on public.user_amalan_logs(user_id, log_date desc);
create index idx_logs_user_amalan on public.user_amalan_logs(user_id, amalan_id);

comment on table public.user_amalan_logs is 'Satu baris = satu amalan pada satu tanggal untuk satu pengguna';

-- Trigger update timestamp
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_logs_updated_at
  before update on public.user_amalan_logs
  for each row execute function public.set_updated_at();

create trigger trg_amalan_updated_at
  before update on public.amalan
  for each row execute function public.set_updated_at();

-- ============================================================
-- 6. DAILY_EVALUATIONS (Evaluasi otomatis tersimpan)
-- ============================================================
create table public.daily_evaluations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eval_date date not null,
  period_days integer not null check (period_days in (1, 7, 30, 90, 365)),
  report_json jsonb not null,         -- hasil evaluasi terstruktur
  created_at timestamptz not null default now(),

  constraint uq_eval_user_date_period unique (user_id, eval_date, period_days)
);

create index idx_eval_user on public.daily_evaluations(user_id, eval_date desc);

-- ============================================================
-- 7. USER_SETTINGS
-- ============================================================
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hijri_offset integer not null default 0,
  show_unverified_refs boolean not null default false,
  reminder_enabled boolean not null default true,
  reminder_time time default '04:30',
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 8. REMINDERS
-- ============================================================
create table public.reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amalan_id integer references public.amalan(id) on delete cascade,
  reminder_time time not null,
  days_of_week integer[] default '{0,1,2,3,4,5,6}',  -- 0=Ahad..6=Sabtu
  is_active boolean not null default true,
  message text,
  created_at timestamptz not null default now()
);

create index idx_reminders_user on public.reminders(user_id) where is_active = true;