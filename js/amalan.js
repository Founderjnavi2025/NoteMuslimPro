// js/amalan.js — Katalog & pencatatan amalan

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
function formatDateID(dateStr) {
  const d = new Date(dateStr + 'T00:00:00+07:00');
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
  }).format(d);
}

let state = {
  userId: null,
  catalog: [],          // semua amalan
  logsToday: new Map(), // amalan_id -> log row (hari ini)
  filterCat: 'all',
  search: '',
};

async function main() {
  const session = await requireAuth();
  if (!session) return;
  state.userId = session.user.id;

  const today = todayInTZ();
  $('todayBadge').textContent = formatDateID(today);

  try {
    await Promise.all([loadCatalog(), loadTodayLogs()]);
    render();
  } catch (err) {
    console.error(err);
    showError(err.message || 'Gagal memuat data.');
  }

  bindEvents();
}

function showError(msg) {
  const box = $('errorBox');
  box.textContent = msg;
  box.classList.add('show');
}
function clearError() {
  $('errorBox').classList.remove('show');
}

async function loadCatalog() {
  const { data, error } = await supabase
    .from('amalan')
    .select(`
      id, slug, name, description, amal_type, default_unit, is_negative, verification_status,
      category:category_id (id, slug, name, icon),
      refs:amal_references (id, reference_type, source_name, reference_detail, arabic_text, translation_text, grading, is_primary)
    `)
    .order('amal_type', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  state.catalog = data || [];
}

async function loadTodayLogs() {
  const today = todayInTZ();
  const { data, error } = await supabase
    .from('user_amalan_logs')
    .select('id, amalan_id, status, quantity, unit, note')
    .eq('user_id', state.userId)
    .eq('log_date', today);
  if (error) throw error;

  state.logsToday = new Map((data || []).map((r) => [r.amalan_id, r]));
}

// ---------- Render ----------
function filteredAmalan() {
  const q = state.search.trim().toLowerCase();
  return state.catalog.filter((a) => {
    if (state.filterCat !== 'all' && a.amal_type !== state.filterCat) return false;
    if (q) {
      const hay = (a.name + ' ' + (a.description || '')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function render() {
  const list = $('amalanList');
  const items = filteredAmalan();
  if (items.length === 0) {
    list.innerHTML = `<div class="empty"><div class="icon">🔍</div>Tidak ada amalan yang cocok.<br/>Coba kata kunci atau kategori lain.</div>`;
    return;
  }

  // Group by amal_type
  const groups = { wajib: [], sunah: [], akhlak: [], sosial: [], evaluasi: [] };
  items.forEach((a) => { (groups[a.amal_type] || groups.sunah).push(a); });

  const typeLabel = { wajib: 'Ibadah Wajib', sunah: 'Ibadah Sunah', akhlak: 'Akhlak', sosial: 'Sosial', evaluasi: 'Evaluasi Diri' };
  const typeIcon = { wajib: '🕌', sunah: '🌙', akhlak: '💎', sosial: '🤝', evaluasi: '🔍' };

  let html = '';
  for (const type of ['wajib', 'sunah', 'akhlak', 'sosial', 'evaluasi']) {
    if (!groups[type] || groups[type].length === 0) continue;
    html += `<div class="section-title"><h2>${typeIcon[type]} ${typeLabel[type]}</h2></div>`;
    html += groups[type].map((a) => renderItem(a)).join('');
  }
  list.innerHTML = html;

  // Bind click per item
  list.querySelectorAll('[data-amalan-id]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.log-btn')) {
        e.stopPropagation();
        const id = Number(el.dataset.amalanId);
        openLogModal(id);
        return;
      }
      const id = Number(el.dataset.amalanId);
      openDetailModal(id);
    });
  });
}

function renderItem(a) {
  const log = state.logsToday.get(a.id);
  const statusPill = (() => {
    if (!log) return `<span class="pill pill-muted">Belum dicatat</span>`;
    if (log.status === 'done') return `<span class="pill">✓ Selesai</span>`;
    if (log.status === 'partial') return `<span class="pill pill-gold">Sebagian</span>`;
    if (log.status === 'not_done') return `<span class="pill pill-muted">Belum</span>`;
    return `<span class="pill pill-muted">${esc(log.status)}</span>`;
  })();

  const warn = a.verification_status !== 'verified'
    ? `<span class="pill pill-gold" title="Sumber belum terverifikasi penuh">⚠ perlu verifikasi</span>`
    : '';

  const qty = log?.quantity != null ? ` • ${log.quantity} ${esc(log.unit || a.default_unit || '')}` : '';

  return `
    <div class="list-item" data-amalan-id="${a.id}" style="cursor:pointer">
      <div class="thumb">${a.is_negative ? '🔍' : (a.category?.icon || '•')}</div>
      <div class="body">
        <div class="title">${esc(a.name)}</div>
        <div class="meta">${esc(a.category?.name || '')}${qty}</div>
        ${log?.note ? `<div class="note">"${esc(log.note)}"</div>` : ''}
        <div class="mt-2" style="display:flex;gap:6px;flex-wrap:wrap">${statusPill}${warn}</div>
      </div>
      <button class="btn btn-secondary btn-sm log-btn" type="button">
        ${log ? 'Ubah' : 'Catat'}
      </button>
    </div>`;
}

// ---------- Modal: Catat ----------
function openLogModal(amalanId) {
  const a = state.catalog.find((x) => x.id === amalanId);
  if (!a) return;
  const existing = state.logsToday.get(amalanId);

  const modal = $('logModalContent');
  modal.innerHTML = `
    <h3>${esc(a.name)}</h3>
    <p class="text-muted" style="font-size:0.85rem;margin-top:-6px">
      ${esc(a.description || '')}
    </p>

    <div class="alert alert-error" id="modalError"></div>

    <div class="field">
      <label>Status</label>
      <select id="statusInput">
        <option value="done" ${existing?.status === 'done' ? 'selected' : ''}>Selesai</option>
        <option value="partial" ${existing?.status === 'partial' ? 'selected' : ''}>Sebagian</option>
        <option value="not_done" ${existing?.status === 'not_done' ? 'selected' : ''}>Belum dilakukan</option>
      </select>
    </div>

    <div class="field">
      <label>Jumlah / Durasi (${esc(a.default_unit || 'kali')})</label>
      <input type="number" id="quantityInput" min="0" step="0.5"
             value="${existing?.quantity ?? ''}" placeholder="Contoh: 2" />
    </div>

    <div class="field">
      <label>Catatan pribadi (opsional)</label>
      <textarea id="noteInput" rows="3" maxlength="500" placeholder="Contoh: lebih khusyuk hari ini">${esc(existing?.note || '')}</textarea>
    </div>

    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancelBtn" type="button">Batal</button>
      <button class="btn btn-primary" id="saveBtn" type="button">Simpan</button>
    </div>

    ${existing ? `<button class="btn btn-danger btn-sm mt-3" id="deleteBtn" type="button" style="width:100%">Hapus catatan hari ini</button>` : ''}
  `;

  $('logModal').classList.add('open');

    $('cancelBtn').addEventListener('click', closeLogModal);
  
  $('saveBtn').addEventListener('click', async () => {
    const status = $('statusInput').value;
    const qtyRaw = $('quantityInput').value.trim();
    const note = $('noteInput').value.trim();
    const quantity = qtyRaw === '' ? null : Number(qtyRaw);
    
    if (quantity !== null && (Number.isNaN(quantity) || quantity < 0)) {
      return showModalError('Jumlah harus berupa angka ≥ 0.');
    }
    if (note.length > 500) {
      return showModalError('Catatan maksimal 500 karakter.');
    }
    
    const saveBtn = $('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan…';
    
    try {
      const today = todayInTZ();
      const payload = {
        user_id: state.userId,
        amalan_id: amalanId,
        log_date: today,
        status,
        quantity,
        unit: a.default_unit || 'kali',
        note: note || null,
      };
      
      if (existing) {
        const { data, error } = await supabase
          .from('user_amalan_logs')
          .update({ status, quantity, note: note || null, unit: a.default_unit || 'kali' })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        state.logsToday.set(amalanId, data);
      } else {
        const { data, error } = await supabase
          .from('user_amalan_logs')
          .insert(payload)
          .select()
          .single();
        if (error) {
          if (error.code === '23505') {
            // unique violation — ambil ulang lalu update
            const { data: refetch } = await supabase
              .from('user_amalan_logs')
              .select('*')
              .eq('user_id', state.userId)
              .eq('amalan_id', amalanId)
              .eq('log_date', today)
              .single();
            if (refetch) {
              const { data: updated, error: upErr } = await supabase
                .from('user_amalan_logs')
                .update({ status, quantity, note: note || null })
                .eq('id', refetch.id)
                .select()
                .single();
              if (upErr) throw upErr;
              state.logsToday.set(amalanId, updated);
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        } else {
          state.logsToday.set(amalanId, data);
        }
      }
      
      closeLogModal();
      clearError();
      render();
    } catch (err) {
      console.error(err);
      showModalError(err.message || 'Gagal menyimpan catatan.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Simpan';
    }
  });
  
  const deleteBtn = $('deleteBtn');
  if (deleteBtn && existing) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Hapus catatan amalan ini untuk hari ini?')) return;
      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Menghapus…';
      try {
        const { error } = await supabase
          .from('user_amalan_logs')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        state.logsToday.delete(amalanId);
        closeLogModal();
        render();
      } catch (err) {
        console.error(err);
        showModalError(err.message || 'Gagal menghapus catatan.');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Hapus catatan hari ini';
      }
    });
  }
  
  function showModalError(msg) {
    const box = $('modalError');
    box.textContent = msg;
    box.classList.add('show');
  }
  }
  
  function closeLogModal() {
    $('logModal').classList.remove('open');
    $('logModalContent').innerHTML = '';
  }
  
  // ---------- Modal: Detail Dalil ----------
  function openDetailModal(amalanId) {
    const a = state.catalog.find((x) => x.id === amalanId);
    if (!a) return;
    
    const refs = (a.refs || []).sort((x, y) => Number(y.is_primary) - Number(x.is_primary));
    const verified = refs.filter((r) => r.reference_type === 'quran' || r.reference_type === 'hadith');
    const others = refs.filter((r) => !['quran', 'hadith'].includes(r.reference_type));
    
    const modal = $('detailModalContent');
    modal.innerHTML = `
    <h3>${esc(a.name)}</h3>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      <span class="pill">${esc(a.category?.name || '')}</span>
      <span class="pill pill-gold">${esc(a.amal_type)}</span>
      ${a.verification_status === 'verified'
        ? `<span class="pill">✓ terverifikasi</span>`
        : `<span class="pill pill-gold">⚠ ${esc(a.verification_status)}</span>`}
    </div>
    <p class="text-muted" style="font-size:0.9rem">${esc(a.description || '')}</p>

    ${verified.length === 0 ? `
      <div class="alert alert-info show" style="display:block">
        Dalil untuk amalan ini belum tercatat di katalog. Rujuk kepada guru/ulama untuk keterangan lebih lanjut.
      </div>` : ''}

    ${verified.map((r) => `
      <div class="card mt-2" style="background:var(--bg);padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <strong style="color:var(--gold);font-size:0.88rem">${esc(r.source_name)}</strong>
          <span class="pill pill-gold">${esc(r.reference_detail || '—')}</span>
        </div>
        ${r.arabic_text ? `<div class="arabic">${esc(r.arabic_text)}</div>` : ''}
        ${r.translation_text ? `<p style="font-size:0.88rem;margin:8px 0 0;color:var(--text)">"${esc(r.translation_text)}"</p>` : ''}
        ${r.grading ? `<p class="text-muted" style="font-size:0.75rem;margin:6px 0 0">Derajat: ${esc(r.grading)}</p>` : ''}
      </div>
    `).join('')}

    ${others.length > 0 ? `
      <p class="text-muted mt-3" style="font-size:0.78rem">Referensi tambahan:</p>
      ${others.map((r) => `<p class="text-muted" style="font-size:0.8rem;margin:2px 0">• ${esc(r.source_name)}${r.reference_detail ? ' — ' + esc(r.reference_detail) : ''}</p>`).join('')}
    ` : ''}

    <div class="alert alert-info mt-3" style="display:block;font-size:0.75rem;line-height:1.6">
      Catatan: konten dalil di atas bersumber dari referensi yang dapat diperiksa. Aplikasi tidak menilai keabsahan amal Anda.
    </div>

    <div class="modal-actions">
      <button class="btn btn-secondary" id="closeDetailBtn" type="button">Tutup</button>
      <button class="btn btn-primary" id="logFromDetailBtn" type="button">Catat</button>
    </div>
  `;
    
    $('detailModal').classList.add('open');
    $('closeDetailBtn').addEventListener('click', closeDetailModal);
    $('logFromDetailBtn').addEventListener('click', () => {
      closeDetailModal();
      openLogModal(amalanId);
    });
  }
  
  function closeDetailModal() {
    $('detailModal').classList.remove('open');
    $('detailModalContent').innerHTML = '';
  }
  
  // ---------- Events ----------
  function bindEvents() {
    // Search
    $('searchInput').addEventListener('input', (e) => {
      state.search = e.target.value;
      render();
    });
    
    // Category chips
    $('categoryChips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('#categoryChips .chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.filterCat = chip.dataset.cat;
      render();
    });
    
    // Close modals on backdrop click
    $('logModal').addEventListener('click', (e) => {
      if (e.target.id === 'logModal') closeLogModal();
    });
    $('detailModal').addEventListener('click', (e) => {
      if (e.target.id === 'detailModal') closeDetailModal();
    });
    
    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeLogModal();
        closeDetailModal();
      }
    });
  }
  
  main();
