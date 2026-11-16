// Membuat koneksi ke Supabase. Dipakai oleh semua modul lewat window.P3DS.db
window.PPDS = window.P3DS = window.P3DS || {};
window.P3DS.db = window.supabase.createClient(
  window.PPDS_CONFIG.SUPABASE_URL,
  window.PPDS_CONFIG.SUPABASE_KEY
);
