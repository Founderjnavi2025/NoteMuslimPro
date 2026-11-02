// js/riwayat.js — Kalender mini + daftar riwayat per tanggal

import { supabase } from './supabase.js';
import { requireAuth } from './auth.js';

const TZ = 'Asia/Jakarta';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function todayInTZ() {
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

const state = {
  userId: null,
  selectedDate: todayInTZ(),
};

async function main() {
  const session = await requireAuth();
  if (!session) return;
  state.userId = session.user.id;

  $('todayBadge').textContent = formatDateID(todayInTZ());
  $('dateInput').value = state.selectedDate;
  $('dateInput').max = todayInTZ();

  bindEvents();

  try {
    await Promise.all([loadLogsForDate(state.selectedDate), loadMiniCalendar()]);
  } catch (err) {
    console.error(err);
    showError(err.message || 'Gagal memuat riwayat.');
  }
}

function showError(msg) {
  const box = $('errorBox');
  box.textContent = msg;
  box.classList.add('show');
}

function bindEvents() {
  $('dateInput').addEventListener('change', async (e) => {
    const val = e.target.value;
    if (!val || val > todayInTZ()) return;
    state.selectedDate = val;
    try {
      await loadLogsForDate(state.selectedDate);
    } catch (err) {
      showError(err.message || 'Gagal memuat tanggal ini.');
    }
  });

  $('prevDayBtn').addEventListener('click', async () => {
    state.selectedDate = addDays(state.selectedDate, -1);
    $('dateInput').value = state.selectedDate;
    await loadLogsForDate(state.selectedDate).catch((e) => showError(e.message));
  });

  $('nextDayBtn').addEventListener('click', async () => {
    const next = addDays(state.selectedDate, 1);
    if (next > todayInTZ()) return;
    state.selectedDate = next;
    $('dateInput').value = state.selectedDate;
    await loadLogsForDate(state.selectedDate).catch((e) => showError(e.message));
  });
}

async function loadLogsForDate(dateStr) {
  $('selectedDateLabel').textContent = formatDateID(dateStr);

  const { data, error } = await supabase
    .from('user_amalan_logs')
    .select(`
      id, status, quantity, unit, note, created_at,
      amalan:amalan_id (id, name, amal_type, is_negative, default_unit)
    `)
    .eq('user_id', state.userId)
    .eq('log_date', dateStr)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const list = $('logsList');
  const rows = data || [];
  $('countLabel').textContent = `${rows.length} catatan`;

  if (rows.length === 0) {
    list.innerHTML = `<div class="empty"><div class="icon">📭</div>Tidak ada catatan pada tanggal ini.<br/>
      <span class="text-muted" style="font-size:0.78rem">Bukan berarti tidak dikerjakan — hanya belum tercatat.</span></div>`;
    return;
  }

  list.innerHTML = rows.map((r) => {
    const statusPill = r.status === 'done' ? `<span class="pill">✓</span>`
      : r.status === 'partial' ? `<span class="pill pill-gold">Sebagian</span>`
      : `<span class="pill pill-muted">Belum</span>`;
    const qty = r.quantity != null ? `${r.quantity} ${esc(r.unit || r.amalan?.default_unit || '')}` : '';
    return `
      <div class="list-item">
        <div class="thumb">${r.amalan?.is_negative ? '🔍' : '✓'}</div>
        <div class="body">
          <div class="title">${esc(r.amalan?.name || 'Amalan')}</div>
          <div class="meta">${esc(capitalize(r.amalan?.amal_type || ''))}${qty ? ' • ' + qty : ''}</div>
          ${r.note ? `<div class="note">"${esc(r.note)}"</div>` : ''}
        </div>
        ${statusPill}
      </div>`;
  }).join('');
}

async function loadMiniCalendar() {
  const today = todayInTZ();
  const start = addDays(today, -13);

  const { data, error } = await supabase
    .from('user_amalan_logs')
    .select('log_date, status')
    .eq('user_id', state.userId)
    .gte('log_date', start)
    .lte('log_date', today);
  if (error) throw error;

  const counts = new Map();
  for (const l of data || []) {
    if (l.status === 'done' || l.status === 'partial') {
      counts.set(l.log_date, (counts.get(l.log_date) || 0) + 1);
    }
  }

  // Bangun 14 hari
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i);
    days.push({ date: d, count: counts.get(d) || 0 });
  }

  const max = Math.max(1, ...days.map((d) => d.count));

  $('miniCalendar').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">
      ${days.map((d) => {
        const pct = d.count / max;
        const bg = d.count === 0 ? 'var(--bg-elev-2)' : `rgba(16, 185, 129, ${0.15 + pct * 0.6})`;
        const dayNum = d.date.slice(-2);
        return `<div title="${d.date}: ${d.count} amalan" style="
          aspect-ratio:1;border-radius:8px;
          background:${bg};
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          font-size:0.72rem;color:var(--text-dim);border:1px solid var(--border)">
          <div style="font-weight:600;color:var(--text)">${dayNum}</div>
          <div style="font-size:0.62rem;color:${d.count > 0 ? 'var(--emerald)' : 'var(--text-muted)'}">${d.count}</div>
        </div>`;
      }).join('')}
    </div>
    <p class="text-muted" style="font-size:0.72rem;margin:10px 0 0">Angka = jumlah amalan tercatat selesai/sebagian. Warna makin terang = makin banyak.</p>
  `;
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

main();