// js/evaluasi.js — Evaluasi otomatis multi-periode dengan perbandingan

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
  period: 7,
  catalog: [],
};

async function main() {
  const session = await requireAuth();
  if (!session) return;
  state.userId = session.user.id;

  $('todayBadge').textContent = formatDateID(todayInTZ());

  bindEvents();

  try {
    await loadCatalog();
    await runEvaluation();
  } catch (err) {
    console.error(err);
    const box = $('errorBox');
    box.textContent = err.message || 'Gagal memuat evaluasi.';
    box.classList.add('show');
  }
}

function bindEvents() {
  $('periodChips').addEventListener('click', async (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#periodChips .chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    state.period = Number(chip.dataset.period);
    try {
      await runEvaluation();
    } catch (err) {
      console.error(err);
      const box = $('errorBox');
      box.textContent = err.message || 'Gagal memuat evaluasi.';
      box.classList.add('show');
    }
  });
}

async function loadCatalog() {
  const { data, error } = await supabase
    .from('amalan')
    .select('id, slug, name, amal_type, is_negative, default_unit')
    .order('amal_type', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  state.catalog = data || [];
}

// ---------- Evaluasi Utama ----------
async function runEvaluation() {
  const today = todayInTZ();
  const period = state.period;
  const startCur = addDays(today, -(period - 1));
  const startPrev = addDays(today, -(period * 2 - 1));
  const endPrev = addDays(today, -period);

  // Fetch log periode saat ini + sebelumnya dalam satu query
  const { data: logs, error } = await supabase
    .from('user_amalan_logs')
    .select('amalan_id, log_date, status, quantity')
    .eq('user_id', state.userId)
    .gte('log_date', startPrev)
    .lte('log_date', today);
  if (error) throw error;

  // Klasifikasi log per periode
  const curLogs = [];
  const prevLogs = [];
  for (const l of logs || []) {
    if (l.log_date >= startCur) curLogs.push(l);
    else if (l.log_date >= startPrev && l.log_date <= endPrev) prevLogs.push(l);
  }

  // Map amalan_id -> Set tanggal (hanya status done/partial)
  const mapCur = new Map();
  const mapPrev = new Map();
  const addTo = (map, l) => {
    if (l.status !== 'done' && l.status !== 'partial') return;
    if (!map.has(l.amalan_id)) map.set(l.amalan_id, new Set());
    map.get(l.amalan_id).add(l.log_date);
  };
  curLogs.forEach((l) => addTo(mapCur, l));
  prevLogs.forEach((l) => addTo(mapPrev, l));

  // Susun laporan per amalan
  const report = state.catalog.map((a) => {
    const days = mapCur.get(a.id)?.size || 0;
    const prevDays = mapPrev.get(a.id)?.size || 0;
    let trend = 'flat';
    if (days > prevDays) trend = 'up';
    else if (days < prevDays) trend = 'down';
    return { ...a, days, prevDays, trend };
  });

  // Untuk periode 1 hari, "trend" tidak bermakna — biarkan flat
  renderSummary(report, curLogs, prevLogs, period);
  renderDetail(report);

  // Simpan ke daily_evaluations (fire-and-forget, upsert by unique key)
  saveEvaluation(today, period, { report, totals: summarize(report, curLogs, period) });
}

function summarize(report, logs, period) {
  const positive = report.filter((r) => !r.is_negative);
  const negative = report.filter((r) => r.is_negative);

  const active = new Set();
  logs.forEach((l) => {
    if (l.status === 'done' || l.status === 'partial') active.add(l.log_date);
  });

  const never = positive.filter((r) => r.days === 0);
  const low = positive.filter((r) => r.days > 0 && r.days < Math.ceil(period * 0.3));
  const consistent = positive.filter((r) => r.days >= Math.ceil(period * 0.7));
  const improving = positive.filter((r) => r.trend === 'up' && r.days > r.prevDays);
  const declining = positive.filter((r) => r.trend === 'down' && r.prevDays > r.days);

  const negTotal = logs.filter((l) => {
    const am = negative.find((r) => r.id === l.amalan_id);
    return am && (l.status === 'done' || l.status === 'partial');
  }).length;

  return {
    total_logs: logs.length,
    active_days: active.size,
    never_count: never.length,
    low_count: low.length,
    consistent_count: consistent.length,
    improving_count: improving.length,
    declining_count: declining.length,
    negative_total: negTotal,
    never,
    low,
    improving,
    declining,
  };
}

function renderSummary(report, curLogs, prevLogs, period) {
  const s = summarize(report, curLogs, period);
  const pctDays = Math.round((s.active_days / period) * 100);

  const card = $('summaryCard');
  card.innerHTML = `
    <div class="flex justify-between items-center" style="margin-bottom:12px">
      <strong style="font-size:1rem">Laporan ${period} Hari</strong>
      <span class="pill pill-gold">${s.active_days}/${period} hari aktif</span>
    </div>

    <div class="progress" style="margin-bottom:16px"><div style="width:${pctDays}%"></div></div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="label">Total Catatan</div>
        <div class="value">${s.total_logs}</div>
      </div>
      <div class="stat-card">
        <div class="label">Konsisten</div>
        <div class="value gold">${s.consistent_count}</div>
        <div class="sub">≥${Math.ceil(period * 0.7)} hari</div>
      </div>
      <div class="stat-card">
        <div class="label">Perlu Perhatian</div>
        <div class="value" style="color:var(--warning)">${s.never_count + s.low_count}</div>
        <div class="sub">amalan tertinggal</div>
      </div>
      <div class="stat-card">
        <div class="label">Evaluasi Diri</div>
        <div class="value" style="color:#fca5a5">${s.negative_total}</div>
        <div class="sub">perilaku tercatat</div>
      </div>
    </div>

    ${s.improving.length > 0 ? `
      <div class="mt-3">
        <div class="label text-muted" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em">Meningkat</div>
        <p style="font-size:0.88rem;margin:4px 0 0">
          ${s.improving.slice(0, 4).map((r) => `<strong>${esc(r.name)}</strong> (${r.prevDays}→${r.days})`).join(', ')}
        </p>
      </div>` : ''}

    ${s.declining.length > 0 ? `
      <div class="mt-3">
        <div class="label text-muted" style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em">Menurun</div>
        <p style="font-size:0.88rem;margin:4px 0 0">
          ${s.declining.slice(0, 4).map((r) => `<strong>${esc(r.name)}</strong> (${r.prevDays}→${r.days})`).join(', ')}
        </p>
      </div>` : ''}
  `;
}

function renderDetail(report) {
  const box = $('detailList');
  const groups = { wajib: [], sunah: [], akhlak: [], sosial: [], evaluasi: [] };
  report.forEach((r) => { (groups[r.amal_type] || groups.sunah).push(r); });

  const typeLabel = { wajib: 'Ibadah Wajib', sunah: 'Ibadah Sunah', akhlak: 'Akhlak', sosial: 'Sosial', evaluasi: 'Evaluasi Diri' };
  const typeIcon = { wajib: '🕌', sunah: '🌙', akhlak: '💎', sosial: '🤝', evaluasi: '🔍' };

  let html = '';
  for (const type of ['wajib', 'sunah', 'akhlak', 'sosial', 'evaluasi']) {
    const items = groups[type].filter((r) => r.days > 0 || r.prevDays > 0);
    if (items.length === 0) continue;

    html += `<div class="section-title" style="margin-top:16px"><h2>${typeIcon[type]} ${typeLabel[type]}</h2></div>`;
    html += items.map((r) => {
      let pill, pillClass;
      if (r.days === 0) { pill = 'belum tercatat'; pillClass = 'pill-muted'; }
      else if (r.days >= Math.ceil(state.period * 0.7)) { pill = 'konsisten'; pillClass = ''; }
      else if (r.days < Math.ceil(state.period * 0.3)) { pill = 'jarang'; pillClass = 'pill-gold'; }
      else { pill = 'cukup'; pillClass = 'pill-gold'; }

      const trendIcon = r.trend === 'up' ? '↑' : r.trend === 'down' ? '↓' : '';

      return `
        <div class="list-item">
          <div class="thumb">${r.is_negative ? '🔍' : (r.days > 0 ? '✓' : '·')}</div>
          <div class="body">
            <div class="title">${esc(r.name)} ${trendIcon ? `<span style="color:${r.trend === 'up' ? 'var(--emerald)' : '#fca5a5'};font-size:0.85rem">${trendIcon}</span>` : ''}</div>
            <div class="meta">${r.days}/${state.period} hari${r.prevDays !== 0 ? ` • periode lalu: ${r.prevDays}` : ''}</div>
          </div>
          <span class="pill ${pillClass}">${pill}</span>
        </div>`;
    }).join('');
  }

  box.innerHTML = html || `<div class="empty"><div class="icon">📊</div>Belum ada aktivitas dalam periode ini.<br/><a href="amalan.html">Mulai catat amalan</a></div>`;
}

async function saveEvaluation(evalDate, periodDays, reportJson) {
  try {
    const { error } = await supabase
      .from('daily_evaluations')
      .upsert(
        {
          user_id: state.userId,
          eval_date: evalDate,
          period_days: periodDays,
          report_json: reportJson,
        },
        { onConflict: 'user_id,eval_date,period_days' }
      );
    if (error) console.warn('Gagal menyimpan evaluasi:', error.message);
  } catch (err) {
    console.warn('saveEvaluation error:', err);
  }
}

main();
