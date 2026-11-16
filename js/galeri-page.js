// Logika halaman galeri.html: daftar album atau isi satu album (?id=...)
(function () {
  const { gallery, utils } = window.P3DS;

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
      const cap = m.caption ? `<div class="media-caption">${utils.escapeHtml(m.caption)}</div>` : "";
      const media = m.media_type === "video"
        ? `<video controls preload="metadata" src="${utils.escapeHtml(url)}"></video>`
        : `<a href="${utils.escapeHtml(url)}" target="_blank" rel="noopener"><img src="${utils.escapeHtml(url)}" alt="${utils.escapeHtml(m.caption || album.title)}" loading="lazy"></a>`;
      return `<div class="media-item">${media}${cap}</div>`;
    }).join("");

    box.innerHTML = `
      <p><a href="galeri.html">&larr; Kembali ke galeri</a></p>
      <h1>${utils.escapeHtml(album.title)}</h1>
      <p class="meta">${utils.formatDate(album.created_at)}</p>
      <p>${utils.escapeHtml(album.description || "")}</p>
      <div class="media-grid">${grid || '<div class="empty">Album ini belum berisi foto atau video.</div>'}</div>`;
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
