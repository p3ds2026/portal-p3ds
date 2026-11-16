// Logika halaman galeri.html: daftar album atau isi satu album (?id=...)
// Mendukung file dari Supabase Storage & Google Drive otomatis
(function () {
  const { gallery, utils } = window.P3DS;

  // Ekstrak Folder ID dari berbagai format link Google Drive
  function extractDriveFolderId(url) {
    if (!url) return null;
    const str = String(url).trim();
    const m1 = str.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    const m2 = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    if (/^[a-zA-Z0-9_-]{20,}$/.test(str)) return str;
    return null;
  }

  // Mengambil daftar file dari Google Drive via Google Apps Script
  async function fetchDriveFiles(folderId) {
    const scriptUrl = window.PPDS_CONFIG.GDRIVE_SCRIPT_URL;
    if (!scriptUrl || !folderId) return [];
    try {
      const res = await fetch(`${scriptUrl}?folderId=${encodeURIComponent(folderId)}`);
      const json = await res.json();
      return json.files || [];
    } catch (e) {
      console.warn("Gagal membaca Google Drive:", e);
      return [];
    }
  }

  // Fungsi unduh media (Foto / Video)
  async function downloadFile(url, filename) {
    try {
      const btn = event && event.target;
      const originalText = btn ? btn.textContent : "";
      if (btn) { btn.textContent = "Mengunduh..."; btn.disabled = true; }

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      if (btn) { btn.textContent = originalText; btn.disabled = false; }
    } catch (e) {
      // Fallback: buka langsung di tab baru
      window.open(url, "_blank");
    }
  }

  async function showAlbum(id) {
    const box = document.getElementById("detail");
    document.getElementById("list-section").classList.add("is-hidden");
    box.classList.remove("is-hidden");
    box.innerHTML = '<div class="loading">Memuat album...</div>';

    const { data: album, error } = await gallery.getAlbum(id);
    if (error || !album || album.status !== "published") {
      box.innerHTML = '<div class="empty">Album tidak ditemukan atau Anda belum berhak melihatnya. ' +
        '<a href="galeri.html">Kembali ke galeri</a></div>';
      return;
    }
    document.title = album.title + " – PORTAL PPDS";

    // 1. Ambil file dari Supabase Storage (jika ada)
    const { data: items } = await gallery.listMedia(album.id);
    const urls = await gallery.mediaUrls(items || [], album);
    const localMedia = (items || []).map(function (m, i) {
      const u = urls[i];
      if (!u) return null;
      return {
        type: m.media_type,
        caption: m.caption,
        thumbnailUrl: u,
        downloadUrl: u,
        filename: `PPDS_${album.title.replace(/\s+/g, "_")}_${i + 1}.${m.media_type === "video" ? "mp4" : "jpg"}`
      };
    }).filter(Boolean);

    // 2. Ambil file dari Google Drive (jika link folder diisi)
    const folderId = extractDriveFolderId(album.gdrive_url);
    let driveFiles = [];
    if (folderId) {
      box.innerHTML = '<div class="loading">Memuat foto dari Google Drive...</div>';
      driveFiles = await fetchDriveFiles(folderId);
    }

    const driveMedia = driveFiles.map(function (f, i) {
      return {
        type: f.type || "photo",
        caption: f.name,
        thumbnailUrl: f.thumbnailUrl,
        downloadUrl: f.downloadUrl,
        filename: f.name || `PPDS_Foto_${i + 1}.jpg`
      };
    });

    const allMedia = localMedia.concat(driveMedia);

    // Informasi jumlah media (tanpa tombol Google Drive eksternal)
    const mediaInfo = allMedia.length ? `
      <div style="margin: 1rem 0; padding: 0.6rem 1rem; background: #eef3f9; border-left: 4px solid var(--gold); border-radius: 6px; font-size: 0.95rem; color: var(--navy); font-weight: 600;">
        Menampilkan ${allMedia.length} dokumentasi foto & video
      </div>` : "";

    const grid = allMedia.map(function (m) {
      const isVideo = m.type === "video";
      const cap = m.caption ? `<div class="media-caption">${utils.escapeHtml(m.caption)}</div>` : "";
      const media = isVideo
        ? `<video controls preload="metadata" src="${utils.escapeHtml(m.downloadUrl)}"></video>`
        : `<a href="${utils.escapeHtml(m.downloadUrl)}" target="_blank" rel="noopener"><img src="${utils.escapeHtml(m.thumbnailUrl)}" alt="${utils.escapeHtml(m.caption || album.title)}" loading="lazy"></a>`;

      return `
        <div class="media-item">
          ${media}
          ${cap}
          <div style="padding:0.5rem;text-align:center;background:#fafbfc;border-top:1px solid #dbe2ec;">
            <button class="btn btn-small btn-download" type="button" style="width:100%;background:#0b2545;color:#fff;border-radius:6px;padding:8px;font-weight:bold;cursor:pointer;" data-url="${utils.escapeHtml(m.downloadUrl)}" data-filename="${utils.escapeHtml(m.filename)}">
              ⬇ Unduh ${isVideo ? "Video" : "Foto"} (Ukuran Asli)
            </button>
          </div>
        </div>`;
    }).join("");

    box.innerHTML = `
      <p><a href="galeri.html">&larr; Kembali ke galeri</a></p>
      <h1>${utils.escapeHtml(album.title)}</h1>
      <p class="meta">${utils.formatDate(album.created_at)}</p>
      <p>${utils.escapeHtml(album.description || "")}</p>
      ${mediaInfo}
      <div class="media-grid">${grid || '<div class="empty">Album ini belum berisi foto atau video.</div>'}</div>`;

    box.querySelectorAll(".btn-download").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const u = btn.dataset.url;
        const f = btn.dataset.filename;
        downloadFile(u, f);
      });
    });
  }

  async function showList() {
    const el = document.getElementById("album-list");
    const { data, error } = await gallery.listPublished();
    if (error) { el.innerHTML = '<div class="empty">Galeri belum dapat dimuat. Silakan coba lagi nanti.</div>'; return; }
    el.innerHTML = data.length ? data.map(gallery.cardHtml).join("") : '<div class="empty">Belum ada album dokumentasi.</div>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) showAlbum(id); else showList();
  });
})();
