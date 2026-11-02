// js/dashboard.js — Logika halaman beranda.

import { supabase } from './supabase.js';
import { requireAuth } from './auth.js';

// ---------- Util tanggal (timezone Asia/Jakarta) ----------
const TZ = 'Asia/Jakarta';

function todayInTZ() {
  // 'YYYY-MM-DD' di Asia/Jakarta
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

function formatDateID(dateStr) {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
  }).format(d);
}

function formatDateTimeID(isoStr) {
  const d = new Date(isoStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ,
  }).format(d);
}

// ---------- Hijriah (Intl) ----------
function hijriString(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
    }).format(date);
  } catch {
    return '—';
  }
}

// ---------- Escape HTML ----------
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const $ = (id) => document.getElementById(id);

// ---------- Main ----------
async function main() {
  const session = await requireAuth();
  if (!session) return;

  const user = session.user;
  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Sahabat';

  // Greeting
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: TZ }).format(new Date()));
  let greeting = 'Assalamu\'alaikum';
  if (hour < 11) greeting = 'Selamat pagi,';
  else if (hour < 15) greeting = 'Selamat siang,';
  else if (hour < 18) greeting = 'Selamat sore,';
  else greeting = 'Selamat malam,';

  $('greetingTitle').textContent = `${greeting} ${displayName}`;
  $('dateLine').textContent = formatDateID(todayInTZ());
  $('hijriBadge').textContent = hijriString(new Date());

  try {
    await Promise.all([
      loadTodayStats(user.id),
      loadWeekStats(user.id),
      loadMonthStats(user.id),
      loadRecent(user.id),
      loadReminders(user.id),
      loadAutoEvaluation(user.id),
    ]);
  } catch (err) {
    console.error(err);
    const box = $('errorBox');
    box.textContent = err.message || 'Gagal memuat data dashboard.';
    box.classList.add('show');
  }
}

// ---------- Stats ----------
async function loadTodayStats(userId) {
  const today = todayInTZ();

  // Ambil log hari ini join ke amalan
  const { data: logs, error } = await supabase
    .from('user_amalan_logs')
    .select('id, status, quantity, unit, note, amalan:amalan_id (id, name, amal_type, default_unit, slug)')
    .eq('user_id', userId)
    .eq('log_date', today);
  if (error) throw error;

  const done = (logs || []).filter((l) => l.status === 'done' || l.status === 'partial');
  const wajibDone = done.filter((l) => l.amalan?.amal_type === 'wajib');
  const quranLogs = (logs || []).filter((l) => l.amalan?.amal_type === 'sunah' && l.amalan?.slug?.startsWith('tilawah') || l.amalan?.slug === 'tilawah' || l.amalan?.slug === 'tadabbur' || l.amalan?.slug === 'murajaah' || l.amalan?.slug === 'hafalan' || l.amalan?.slug === 'tajwid');
  const quranSum = quranLogs.reduce((s, l) => s + Number(l.quantity || 0), 0);
  const withNotes = (logs || []).filter((l) => l.note && l.note.trim().length > 0);

  $('statDoneToday').textContent = done.length;
  $('statWajibToday').textContent = wajibDone.length;
  $('statQuranToday').textContent = quranSum || '0';
  $('statNotesToday').textContent = withNotes.length;

  // Progress: hitung terhadap amalan wajib total (5 salat) + kira-kira 3 sunah kunci
  const targetDaily = 8;
  const pct = Math.min(100, Math.round((done.length / targetDaily) * 100));
  $('progressBar').style.width = pct + '%';
  $('todayProgressText').textContent = `${done.length} amalan tercatat`;
}

async function loadWeekStats(userId) {
  const today = todayInTZ();
  const start = addDays(today, -6);

  const { data: logs, error } = await supabase
    .from('user_amalan_logs')
    .select('log_date, status, amalan:amalan_id (amal_type, is_negative)')
    .eq('user_id', userId)
    .gte('log_date', start)
    .lte('log_date', today);
  if (error) throw error;

  const arr = logs || [];
  const activeDates = new Set(arr.filter((l) => l.status === 'done' || l.status === 'partial').map((l) => l.log_date));
  const perAmalan = new Map();
  arr.forEach((l) => {
    if (l.status !== 'done' && l.status !== 'partial') return;
    const key = l.amalan?.amal_type;
    perAmalan.set(key, (perAmalan.get(key) || 0) + 1);
  });
  const consistent = [...perAmalan.values()].filter((v) => v >= 3).length;
  const negatives = arr.filter((l) => l.amalan?.is_negative && l.status !== 'not_done').length;

  $('weekTotal').textContent = arr.length;
  $('weekActiveDays').textContent = activeDates.size;
  $('weekConsistent').textContent = consistent;
  $('weekNegative').textContent = negatives;
}

async function loadMonthStats(userId) {
  const today = todayInTZ();
  const start = addDays(today, -29);

  const { data: logs, error } = await supabase
    .from('user_amalan_logs')
    .select('log_date, status, amalan:amalan_id (name, amal_type)')
    .eq('user_id', userId)
    .gte('log_date', start)
    .lte('log_date', today);
  if (error) throw error;

  const arr = logs || [];
  const activeDates = new Set(arr.filter((l) => l.status === 'done' || l.status === 'partial').map((l) => l.log_date));

  const perCat = new Map();
  arr.forEach((l) => {
    if (l.status !== 'done' && l.status !== 'partial') return;
    const key = l.amalan?.amal_type;
    if (!key) return;
    perCat.set(key, (perCat.get(key) || 0) + 1);
  });
  const topCat = [...perCat.entries()].sort((a, b) => b[1] - a[1])[0];

  $('monthTotal').textContent = arr.length;
  $('monthActiveDays').textContent = activeDates.size;
  $('monthTopCat').textContent = topCat ? capitalize(topCat[0]) : '—';
  $('monthAvg').textContent = activeDates.size ? (arr.length / activeDates.size).toFixed(1) : '0';
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// ---------- Recent amalan ----------
async function loadRecent(userId) {
  const { data, error } = await supabase
    .from('user_amalan_logs')
    .select('id, log_date, status, quantity, unit, note, created_at, amalan:amalan_id (id, name, amal_type, default_unit, is_negative)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;

  const box = $('recentList');
  if (!data || data.length === 0) {
    box.innerHTML = `<div class="empty"><div class="icon">🕌</div>Belum ada catatan amal.<br/><a href="amalan.html">Mulai catat sekarang</a></div>`;
    return;
  }

  box.innerHTML = data.map((row) => {
    const badge = row.amalan?.is_negative
      ? `<span class="pill pill-danger">Evaluasi</span>`
      : row.status === 'done' ? `<span class="pill">Selesai</span>`
      : row.status === 'partial' ? `<span class="pill pill-gold">Sebagian</span>`
      : `<span class="pill pill-muted">Belum</span>`;
    const qty = row.quantity != null ? `${row.quantity} ${esc(row.unit || row.amalan?.default_unit || '')}` : '';
    return `
      <div class="list-item">
        <div class="thumb">${row.amalan?.is_negative ? '🔍' : '✓'}</div>
        <div class="body">
          <div class="title">${esc(row.amalan?.name || 'Amalan')}</div>
          <div class="meta">${esc(row.log_date)} • ${esc(capitalize(row.amalan?.amal_type || ''))} ${qty ? ' • ' + qty : ''}</div>
          ${row.note ? `<div class="note">"${esc(row.note)}"</div>` : ''}
        </div>
        ${badge}
      </div>`;
  }).join('');
}

// ---------- Reminders ----------
async function loadReminders(userId) {
  const { data, error } = await supabase
    .from('reminders')
    .select('id, reminder_time, message, is_active, amalan:amalan_id (name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('reminder_time', { ascending: true })
    .limit(5);
  if (error) throw error;

  const box = $('remindersBox');
  if (!data || data.length === 0) {
    box.innerHTML = `<div class="empty" style="padding:16px">
      <div class="icon">⏰</div>Belum ada pengingat.<br/>
      <a href="profil.html">Atur pengingat di Profil</a>
    </div>`;
    return;
  }

  box.innerHTML = data.map((r) => `
    <div class="list-item" style="margin:0 0 6px">
      <div class="thumb">⏰</div>
      <div class="body">
        <div class="title">${esc(r.reminder_time?.slice(0, 5) || '—')}</div>
        <div class="meta">${esc(r.amalan?.name || r.message || 'Pengingat umum')}</div>
      </div>
    </div>
  `).join('');
}

async function loadAutoEvaluation(userId) {
  const today = todayInTZ();
  const start7 = addDays(today, -6);
  
  // 1) Ambil katalog amalan WAJIB + SUNAH yang non-negatif (prioritas evaluasi)
  const { data: catalog, error: catErr } = await supabase
    .from('amalan')
    .select('id, name, amal_type, is_negative')
    .in('amal_type', ['wajib', 'sunah'])
    .eq('is_negative', false)
    .order('amal_type', { ascending: true })
    .order('name', { ascending: true });
  if (catErr) throw catErr;
  
  // 2) Ambil log 7 hari
  const { data: logs, error: logErr } = await supabase
    .from('user_amalan_logs')
    .select('amalan_id, log_date, status')
    .eq('user_id', userId)
    .gte('log_date', start7)
    .lte('log_date', today);
  if (logErr) throw logErr;
  
  // 3) Hitung hari per amalan
  const perAmalan = new Map();
  for (const l of logs || []) {
    if (l.status !== 'done' && l.status !== 'partial') continue;
    if (!perAmalan.has(l.amalan_id)) perAmalan.set(l.amalan_id, new Set());
    perAmalan.get(l.amalan_id).add(l.log_date);
  }
  
  // 4) Bangun laporan untuk SETIAP amalan di katalog
  const report = (catalog || []).map((a) => {
    const days = perAmalan.get(a.id)?.size || 0;
    return { ...a, days };
  });
  
  const never = report.filter((r) => r.days === 0);
  const low = report.filter((r) => r.days > 0 && r.days < 3);
  
  const box = $('autoEvalBox');
  const lines = [];
  if (never.length > 0) {
    never.slice(0, 3).forEach((m) =>
      lines.push(`<li><strong>${esc(m.name)}</strong> belum ada catatan selama 7 hari.</li>`)
    );
  }
  if (low.length > 0) {
    low.slice(0, 3).forEach((m) =>
      lines.push(`<li><strong>${esc(m.name)}</strong> tercatat ${m.days} dari 7 hari.</li>`)
    );
  }
  
  if (lines.length === 0) {
    box.innerHTML = `<p class="text-muted" style="font-size:0.9rem;margin:0 0 8px">
      Tidak ada amalan wajib/sunah yang terlewat minggu ini. Alhamdulillah.
    </p>
    <p class="text-muted" style="font-size:0.75rem;margin:0">
      Ini bukan penilaian pahala/iman.
    </p>`;
    return;
  }
  
  box.innerHTML = `
    <ul style="margin:0 0 8px;padding-left:18px;font-size:0.9rem;line-height:1.7">
      ${lines.join('')}
    </ul>
    <p class="text-muted" style="font-size:0.75rem;margin:0">
      Laporan berbasis catatan Anda saja. Tidak dicatat bukan berarti tidak dikerjakan.
      <a href="evaluasi.html">Buka evaluasi lengkap →</a>
    </p>
  `;
}


main();
