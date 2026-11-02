// js/profil.js — Edit profil, password, pengingat, logout

import { supabase } from './supabase.js';
import { requireAuth, signOut, updateProfile, changePassword } from './auth.js';

const TZ = 'Asia/Jakarta';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const state = {
  userId: null,
  user: null,
  catalog: [],
};

async function main() {
  const session = await requireAuth();
  if (!session) return;
  state.userId = session.user.id;
  state.user = session.user;

  $('hijriBadge').textContent = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ,
  }).format(new Date());

  const displayName = state.user.user_metadata?.display_name || state.user.email?.split('@')[0] || 'Sahabat';
  $('displayNameLabel').textContent = displayName;
  $('emailLabel').textContent = state.user.email;
  $('displayName').value = displayName;

  bindEvents();

  try {
    await Promise.all([loadCatalog(), loadReminders()]);
  } catch (err) {
    console.error(err);
    showError(err.message || 'Gagal memuat data profil.');
  }
}

function showError(msg) {
  const b = $('errorBox'); b.textContent = msg; b.classList.add('show');
  $('successBox').classList.remove('show');
  setTimeout(() => b.classList.remove('show'), 6000);
}
function showSuccess(msg) {
  const b = $('successBox'); b.textContent = msg; b.classList.add('show');
  $('errorBox').classList.remove('show');
  setTimeout(() => b.classList.remove('show'), 5000);
}

function bindEvents() {
  $('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('displayName').value.trim();
    if (!name) return showError('Nama tidak boleh kosong.');
    if (name.length > 60) return showError('Nama maksimal 60 karakter.');

    const btn = $('saveProfileBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan…';
    try {
      await updateProfile({ displayName: name });
      $('displayNameLabel').textContent = name;
      showSuccess('Profil berhasil disimpan.');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Gagal menyimpan profil.');
    } finally {
      btn.disabled = false; btn.textContent = 'Simpan Profil';
    }
  });

  $('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = $('newPassword').value;
    if (pass.length < 6) return showError('Password minimal 6 karakter.');

    const btn = $('savePasswordBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan…';
    try {
      await changePassword(pass);
      $('newPassword').value = '';
      showSuccess('Password berhasil diubah.');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Gagal mengubah password.');
    } finally {
      btn.disabled = false; btn.textContent = 'Ubah Password';
    }
  });

  $('logoutBtn').addEventListener('click', async () => {
    if (!confirm('Keluar dari akun?')) return;
    await signOut();
  });
}

async function loadCatalog() {
  const { data, error } = await supabase
    .from('amalan')
    .select('id, name, amal_type')
    .in('amal_type', ['wajib', 'sunah', 'akhlak', 'sosial'])
    .order('name', { ascending: true });
  if (error) throw error;
  state.catalog = data || [];
}

async function loadReminders() {
  const { data, error } = await supabase
    .from('reminders')
    .select('id, reminder_time, message, is_active, amalan:amalan_id (name)')
    .eq('user_id', state.userId)
    .order('reminder_time', { ascending: true });
  if (error) throw error;

  const rows = data || [];
  const box = $('remindersBox');

  const options = state.catalog
    .map((a) => `<option value="${a.id}">${esc(a.name)}</option>`)
    .join('');

  box.innerHTML = `
    ${rows.length === 0
      ? `<div class="empty" style="padding:8px 0"><div class="icon">⏰</div>Belum ada pengingat.</div>`
      : rows.map((r) => `
        <div class="list-item">
          <div class="thumb">⏰</div>
          <div class="body">
            <div class="title">${esc((r.reminder_time || '').slice(0, 5))}</div>
            <div class="meta">${esc(r.amalan?.name || r.message || 'Pengingat')}</div>
          </div>
          <button class="btn btn-secondary btn-sm" data-del="${r.id}" type="button">Hapus</button>
        </div>
      `).join('')}

    <hr class="hr" />

    <div class="field">
      <label>Amalan</label>
      <select id="reminderAmalan">${options}</select>
    </div>
    <div class="field">
      <label>Jam (HH:MM)</label>
      <input type="time" id="reminderTime" value="04:30" />
    </div>
    <button type="button" class="btn btn-primary" id="addReminderBtn">Tambah Pengingat</button>
  `;

  box.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.del;
      if (!confirm('Hapus pengingat ini?')) return;
      try {
        const { error } = await supabase.from('reminders').delete().eq('id', id).eq('user_id', state.userId);
        if (error) throw error;
        await loadReminders();
      } catch (err) {
        console.error(err);
        showError(err.message || 'Gagal menghapus pengingat.');
      }
    });
  });

  $('addReminderBtn').addEventListener('click', async () => {
    const amalanId = Number($('reminderAmalan').value);
    const time = $('reminderTime').value;
    if (!amalanId || !time) return showError('Pilih amalan dan jam.');

    const btn = $('addReminderBtn');
    btn.disabled = true; btn.textContent = 'Menyimpan…';
    try {
      const { error } = await supabase.from('reminders').insert({
        user_id: state.userId,
        amalan_id: amalanId,
        reminder_time: time + ':00',
      });
      if (error) throw error;
      await loadReminders();
      showSuccess('Pengingat ditambahkan.');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Gagal menambah pengingat.');
    } finally {
      btn.disabled = false; btn.textContent = 'Tambah Pengingat';
    }
  });
}

main();