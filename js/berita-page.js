// Logika halaman berita.html: daftar berita atau detail satu berita (?id=...)
(function () {
  const { news, utils } = window.P3DS;

  async function showDetail(id) {
    const box = document.getElementById("detail");
    document.getElementById("list-section").classList.add("is-hidden");
    box.classList.remove("is-hidden");
    box.innerHTML = '<div class="loading">Memuat berita...</div>';

    const { data, error } = await news.getById(id);
    if (error || !data || data.status !== "published") {
      box.innerHTML = '<div class="empty">Berita tidak ditemukan atau Anda belum berhak melihatnya. ' +
        '<a href="berita.html">Kembali ke daftar berita</a></div>';
      return;
    }
    const cover = utils.safeUrl(data.cover_url);
    document.title = data.title + " – PORTAL P3DS";
    box.innerHTML = `
      <article class="article">
        <p><a href="berita.html">&larr; Kembali ke daftar berita</a></p>
        <div class="meta"><span class="badge">${utils.escapeHtml(data.category)}</span>${utils.formatDate(data.published_at)}</div>
        <h1>${utils.escapeHtml(data.title)}</h1>
        ${cover ? `<img class="article-cover" src="${utils.escapeHtml(cover)}" alt="">` : ""}
        <div class="article-content">${utils.escapeHtml(data.content)}</div>
      </article>`;
  }

  async function showList(category) {
    const el = document.getElementById("news-list");
    el.innerHTML = '<div class="loading">Memuat berita...</div>';
    const { data, error } = await news.listPublished(category);
    if (error) { el.innerHTML = '<div class="empty">Berita belum dapat dimuat. Silakan coba lagi nanti.</div>'; return; }
    el.innerHTML = data.length ? data.map(news.cardHtml).join("") : '<div class="empty">Belum ada berita pada kategori ini.</div>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) { showDetail(id); return; }
    const select = document.getElementById("filter-category");
    select.addEventListener("change", function () { showList(select.value); });
    showList("");
  });
})();
