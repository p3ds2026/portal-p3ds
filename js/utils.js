// Fungsi bantu umum. Dipakai oleh semua modul lewat window.P3DS.utils
window.PPDS = window.P3DS = window.P3DS || {};
window.P3DS.utils = {
  // Mencegah penyisipan kode berbahaya (XSS) pada teks dari database
  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  // Hanya izinkan alamat gambar https
  safeUrl(url) {
    return typeof url === "string" && url.startsWith("https://") ? url : "";
  },

  formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric", month: "long", year: "numeric",
    });
  },

  formatDateTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    }) + " WIB";
  },

  shorten(text, max = 140) {
    const t = String(text ?? "");
    return t.length > max ? t.slice(0, max).trim() + "..." : t;
  },
};
