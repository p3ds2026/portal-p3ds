// Logika halaman kegiatan-sosial.html: daftar kegiatan atau detail (?id=...)
(function () {
  const { social, utils } = window.P3DS;

  async function showDetail(id) {
    const box = document.getElementById("detail");
    document.getElementById("list-section").classList.add("is-hidden");
    box.classList.remove("is-hidden");
    box.innerHTML = '<div class="loading">Memuat kegiatan...</div>';

    const { data, error } = await social.getById(id);
    if (error || !data || data.status !== "published") {
      box.innerHTML = '<div class="empty">Kegiatan tidak ditemukan atau Anda belum berhak melihatnya. ' +
        '<a href="kegiatan-sosial.html">Kembali ke daftar kegiatan</a></div>';
      return;
    }
    document.title = data.title + " – PORTAL P3DS";
    const cover = utils.safeUrl(data.cover_url);

    const { data: ups } = await social.listUpdates(data.id);
    const timeline = (ups || []).map(function (u) {
      const img = utils.safeUrl(u.media_url);
      return `<div class="timeline-item">
        <div class="meta">${utils.formatDate(u.created_at)}</div>
        <h3>${utils.escapeHtml(u.title)}</h3>
        <div class="article-content">${utils.escapeHtml(u.content)}</div>
        ${img ? `<img class="article-cover" src="${utils.escapeHtml(img)}" alt="" loading="lazy">` : ""}
      </div>`;
    }).join("");

    box.innerHTML = `
      <article class="article">
        <p><a href="kegiatan-sosial.html">&larr; Kembali ke daftar kegiatan</a></p>
        <div class="meta"><span class="badge">${utils.escapeHtml(social.STATUS_LABEL[data.activity_status] || "")}</span>
          ${utils.formatDate(data.activity_date)}${data.location ? " · " + utils.escapeHtml(data.location) : ""}</div>
        <h1>${utils.escapeHtml(data.title)}</h1>
        ${cover ? `<img class="article-cover" src="${utils.escapeHtml(cover)}" alt="">` : ""}
        <div class="article-content">${utils.escapeHtml(data.description || "")}</div>
        <h2 style="margin-top:1.5rem">Perkembangan Kegiatan</h2>
        ${timeline || '<div class="empty">Belum ada catatan perkembangan.</div>'}
      </article>`;
  }

  async function showList() {
    const el = document.getElementById("social-list");
    const { data, error } = await social.listPublished();
    if (error) { el.innerHTML = '<div class="empty">Kegiatan belum dapat dimuat. Silakan coba lagi nanti.</div>'; return; }
    el.innerHTML = data.length ? data.map(social.cardHtml).join("") : '<div class="empty">Belum ada kegiatan sosial yang dipublikasikan.</div>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) showDetail(id); else showList();
  });
})();
