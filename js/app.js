// js/app.js — bootstrap untuk halaman publik (index, login, register)

import { getSession } from './auth.js';

async function boot() {
  const loading = document.getElementById('loadingCard');
  const welcome = document.getElementById('welcomeCard');
  if (!loading || !welcome) return;
  
  try {
    const session = await getSession();
    if (session) {
      // Sudah login → langsung ke dashboard
      window.location.href = 'dashboard.html';
      return;
    }
    loading.style.display = 'none';
    welcome.style.display = 'block';
  } catch (err) {
    console.error(err);
    loading.style.display = 'none';
    welcome.style.display = 'block';
  }
}

boot();
