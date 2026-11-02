-- ============================================================
-- AMAL TRACKER — ROW LEVEL SECURITY
-- ============================================================

-- ---- PROFILES ----
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---- AMAL_CATEGORIES (public read) ----
alter table public.amal_categories enable row level security;

create policy "Anyone can read categories"
  on public.amal_categories for select
  to anon, authenticated
  using (true);

-- ---- AMALAN (public read, admin write) ----
alter table public.amalan enable row level security;

create policy "Anyone can read amalan"
  on public.amalan for select
  to anon, authenticated
  using (true);

-- Admin write: hanya service_role yang bisa (bypass RLS).
-- Tidak ada policy INSERT/UPDATE/DELETE untuk authenticated = aman.

-- ---- AMAL_REFERENCES (public read) ----
alter table public.amal_references enable row level security;

create policy "Anyone can read references"
  on public.amal_references for select
  to anon, authenticated
  using (true);

-- ---- USER_AMALAN_LOGS ----
alter table public.user_amalan_logs enable row level security;

create policy "Users can view own logs"
  on public.user_amalan_logs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own logs"
  on public.user_amalan_logs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own logs"
  on public.user_amalan_logs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own logs"
  on public.user_amalan_logs for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---- DAILY_EVALUATIONS ----
alter table public.daily_evaluations enable row level security;

create policy "Users can view own evaluations"
  on public.daily_evaluations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own evaluations"
  on public.daily_evaluations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- ---- USER_SETTINGS ----
alter table public.user_settings enable row level security;

create policy "Users can view own settings"
  on public.user_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---- REMINDERS ----
alter table public.reminders enable row level security;

create policy "Users can manage own reminders"
  on public.reminders for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);