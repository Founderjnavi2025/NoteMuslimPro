// js/supabase.js
// Inisialisasi klien Supabase — dipakai seluruh modul.
// GANTI dua konstanta di bawah dengan milik project Supabase Anda.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'amal-tracker-auth',
  },
});

// Helper: lempar error yang human-readable
export function handleSupabaseError(error) {
  if (!error) return null;
  console.error('[Supabase]', error);
  return {
    message: error.message || 'Terjadi kesalahan tidak terduga.',
    code: error.code,
  };
}
