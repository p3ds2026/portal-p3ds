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

  // Mengubah teks biasa menjadi aman (escape HTML), mendukung format tebal (*teks*), miring (_teks_), garis bawah (__teks__), coret (~teks~), dan membuat tautan URL langsung bisa diklik/diunduh
  autoLink(text) {
    return this.formatRichText(text);
  },

  formatRichText(text) {
    if (!text) return "";
    let safe = this.escapeHtml(text);

    // Simpan URL sementara dengan token unik agar karakter seperti "_" atau "*" di dalam link tidak tertukar dengan format miring/tebal
    const urls = [];
    const urlRegex = /(https?:\/\/[^\s<]+)/gi;
    safe = safe.replace(urlRegex, function (rawUrl) {
      let url = rawUrl;
      let suffix = "";
      if (/[.,;:)]$/.test(url)) {
        suffix = url.slice(-1);
        url = url.slice(0, -1);
      }
      const isPdf = /\.pdf($|\?)/i.test(url);
      const isDoc = /\.(doc|docx|xls|xlsx|ppt|pptx|zip)($|\?)/i.test(url);
      const isImg = /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url);
      let html = "";
      if (isImg) {
        html = `<div style="margin:0.75rem 0; text-align:center;"><a href="${url}" target="_blank" rel="noopener noreferrer" title="Klik untuk memperbesar gambar"><img src="${url}" alt="Gambar Informasi" style="max-width:100%; max-height:480px; width:auto; border-radius:6px; border:1px solid #cbd5e1; object-fit:contain; cursor:zoom-in; box-shadow:0 1px 4px rgba(0,0,0,0.06);"></a><div style="font-size:0.75rem; color:#64748b; margin-top:0.25rem;">🔍 Klik gambar untuk memperbesar</div></div>`;
      } else if (isPdf || isDoc) {
        html = `<a href="${url}" target="_blank" rel="noopener noreferrer" download style="display:inline-flex; align-items:center; gap:0.35rem; background:#0b5ed7; color:#ffffff !important; font-weight:600; font-size:0.85rem; padding:0.22rem 0.65rem; border-radius:5px; text-decoration:none; vertical-align:middle; margin:0.15rem 0; line-height:1.3; box-shadow:0 1px 3px rgba(11,94,215,0.2);">📥 Unduh Formulir (${isPdf ? 'PDF' : 'Dokumen'}) &rarr;</a>`;
      } else {
        html = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#0b5ed7; font-weight:600; text-decoration:underline; word-break:break-all;">${url}</a>`;
      }
      const token = `@@@P3DSURL${urls.length}@@@`;
      urls.push(html + suffix);
      return token;
    });

    // 1. Format Tebal (Bold): **teks** atau *teks* (gaya WhatsApp)
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\*([^\s*][^*]*[^\s*]|\S)\*/g, '<strong>$1</strong>');

    // 2. Format Garis Bawah (Underline): __teks__
    safe = safe.replace(/__([^\s_][^_]*[^\s_]|\S)__/g, '<u>$1</u>');

    // 3. Format Miring (Italic): _teks_ (gaya WhatsApp)
    safe = safe.replace(/_([^\s_][^_]*[^\s_]|\S)_/g, '<em>$1</em>');

    // 4. Format Coret (Strikethrough): ~teks~
    safe = safe.replace(/~([^\s~][^~]*[^\s~]|\S)~/g, '<del>$1</del>');

    // Kembalikan token URL
    urls.forEach((u, i) => {
      safe = safe.replace(`@@@P3DSURL${i}@@@`, u);
    });

    return safe;
  },

  // Membantu textarea menerapkan format teks (tebal, miring, garis bawah, dll) secara instan
  applyFormatting(textarea, formatType) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end);

    let prefix = "";
    let suffix = "";
    let defaultText = "";

    if (formatType === "bold") {
      prefix = "*"; suffix = "*"; defaultText = "teks tebal";
    } else if (formatType === "italic") {
      prefix = "_"; suffix = "_"; defaultText = "teks miring";
    } else if (formatType === "underline") {
      prefix = "__"; suffix = "__"; defaultText = "teks garis bawah";
    } else if (formatType === "strike") {
      prefix = "~"; suffix = "~"; defaultText = "teks dicoret";
    } else if (formatType === "bullet") {
      prefix = "- "; suffix = ""; defaultText = "Poin penting";
    } else if (formatType === "number") {
      prefix = "1. "; suffix = ""; defaultText = "Poin pertama";
    } else if (formatType === "link") {
      if (selected) {
        if (/^https?:\/\//i.test(selected)) {
          return;
        }
        prefix = ""; suffix = " : http://pertalife.com/formulir.pdf";
      } else {
        prefix = "http://"; suffix = ""; defaultText = "pertalife.com/wp-content/uploads/2026/02/formulir-klaim.pdf";
      }
    }

    const replacement = selected ? (prefix + selected + suffix) : (prefix + defaultText + suffix);
    textarea.value = val.substring(0, start) + replacement + val.substring(end);
    textarea.focus();
    const selStart = start + prefix.length;
    const selEnd = start + prefix.length + (selected ? selected.length : defaultText.length);
    textarea.setSelectionRange(selStart, selEnd);
  },
};
