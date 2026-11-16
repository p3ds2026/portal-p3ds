// Membuat koneksi ke Supabase. Dipakai oleh semua modul lewat window.P3DS.db
window.P3DS = window.P3DS || {};
window.P3DS.db = window.supabase.createClient(
  window.P3DS_CONFIG.SUPABASE_URL,
  window.P3DS_CONFIG.SUPABASE_KEY
);
