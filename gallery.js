// Logika halaman galeri.html: daftar album atau isi satu album (?id=...)
(function () {
  const { gallery, utils } = window.P3DS;

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
    document.title = album.title + " – PORTAL P3DS";

    const { data: items } = await gallery.listMedia(album.id);
    const urls = await gallery.mediaUrls(items || [], album);

    const grid = (items || []).map(function (m, i) {
      const url = utils.safeUrl(urls[i]);
      if (!url) return "";
      const isVideo = m.media_type === "video";
      const cap = m.caption ? `<div class="media-caption">${utils.escapeHtml(m.caption)}</div>` : "";
      const filename = `P3DS_${album.title.replace(/\s+/g, "_")}_${i + 1}.${isVideo ? "mp4" : "jpg"}`;

      const media = isVideo
        ? `<video controls preload="metadata" src="${utils.escapeHtml(url)}"></video>`
        : `<a href="${utils.escapeHtml(url)}" target="_blank" rel="noopener"><img src="${utils.escapeHtml(url)}" alt="${utils.escapeHtml(m.caption || album.title)}" loading="lazy"></a>`;

      return `
        <div class="media-item">
          ${media}
          ${cap}
          <div style="padding:0.5rem;text-align:center;background:#fafbfc;border-top:1px solid #dbe2ec;">
            <button class="btn btn-small btn-download" type="button" style="width:100%;background:#0b2545;color:#fff;" data-url="${utils.escapeHtml(url)}" data-filename="${utils.escapeHtml(filename)}">
              ⬇ Unduh ${isVideo ? "Video" : "Foto"}
            </button>
          </div>
        </div>`;
    }).join("");

    box.innerHTML = `
      <p><a href="galeri.html">&larr; Kembali ke galeri</a></p>
      <h1>${utils.escapeHtml(album.title)}</h1>
      <p class="meta">${utils.formatDate(album.created_at)}</p>
      <p>${utils.escapeHtml(album.description || "")}</p>
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
