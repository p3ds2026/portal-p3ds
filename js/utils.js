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
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" download style="display:inline-flex; align-items:center; gap:0.35rem; background:#0b5ed7; color:#ffffff !important; font-weight:600; font-size:0.85rem; padding:0.22rem 0.65rem; border-radius:5px; text-decoration:none; vertical-align:middle; margin:0.15rem 0; line-height:1.3; box-shadow:0 1px 3px rgba(11,94,215,0.2);">📥 Unduh Formulir (${isPdf ? 'PDF' : 'Dokumen'}) &rarr;</a>` + suffix;
      }
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0b5ed7; font-weight:600; text-decoration:underline; word-break:break-all;">${url}</a>` + suffix;
    });
  },
};
