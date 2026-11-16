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

  // Mengubah teks biasa menjadi aman (escape HTML) dan membuat semua link/URL (termasuk link download PDF) bisa langsung diklik
  autoLink(text) {
    if (!text) return "";
    let safe = this.escapeHtml(text);
    const urlRegex = /(https?:\/\/[^\s<]+)/gi;
    return safe.replace(urlRegex, function (rawUrl) {
      let url = rawUrl;
      let suffix = "";
      if (/[.,;:)]$/.test(url)) {
        suffix = url.slice(-1);
        url = url.slice(0, -1);
      }
      const isPdf = /\.pdf($|\?)/i.test(url);
      const isDoc = /\.(doc|docx|xls|xlsx|ppt|pptx|zip)($|\?)/i.test(url);
      if (isPdf || isDoc) {
        return `
<span class="doc-download-box" style="display:inline-block; margin:0.4rem 0;">
  <a href="${url}" target="_blank" rel="noopener noreferrer" download class="btn btn-small" style="background:#0b5ed7; color:#ffffff !important; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:0.4rem; padding:0.45rem 1rem; border-radius:6px; box-shadow:0 2px 4px rgba(11,94,215,0.25);">
    📥 Klik untuk Unduh Formulir (${isPdf ? 'PDF' : 'Dokumen'})
  </a>
  <span style="display:block; font-size:0.82rem; color:#64748b; margin-top:0.25rem; word-break:break-all;">
    Tautan: <a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0b5ed7; text-decoration:underline;">${url}</a>
  </span>
</span>` + suffix;
      }
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0b5ed7; font-weight:600; text-decoration:underline; word-break:break-all;">${url}</a>` + suffix;
    });
  },
};
