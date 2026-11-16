// Logika halaman agenda.html: daftar agenda atau detail satu agenda (?id=...)
(function () {
  const { events, utils } = window.P3DS;

  async function showDetail(id) {
    const box = document.getElementById("detail");
    document.getElementById("list-section").classList.add("is-hidden");
    box.classList.remove("is-hidden");
    box.innerHTML = '<div class="loading">Memuat agenda...</div>';

    const { data, error } = await events.getById(id);
    if (error || !data || data.status !== "published") {
      box.innerHTML = '<div class="empty">Agenda tidak ditemukan atau Anda belum berhak melihatnya. ' +
        '<a href="agenda.html">Kembali ke daftar agenda</a></div>';
      return;
    }
    const cover = utils.safeUrl(data.cover_url);
    document.title = data.title + " – PORTAL P3DS";
    box.innerHTML = `
      <article class="article">
        <p><a href="agenda.html">&larr; Kembali ke daftar agenda</a></p>
        <h1>${utils.escapeHtml(data.title)}</h1>
        <p class="meta"><strong>Waktu:</strong> ${utils.formatDateTime(data.start_at)}
          ${data.end_at ? " s.d. " + utils.formatDateTime(data.end_at) : ""}<br>
          ${data.location ? "<strong>Tempat:</strong> " + utils.escapeHtml(data.location) : ""}</p>
        ${cover ? `<img class="article-cover" src="${utils.escapeHtml(cover)}" alt="">` : ""}
        <div class="article-content">${utils.escapeHtml(data.description || "")}</div>
      </article>`;
  }

  async function showList(scope) {
    const el = document.getElementById("events-list");
    el.innerHTML = '<div class="loading">Memuat agenda...</div>';
    const { data, error } = await events.listPublished(scope);
    if (error) { el.innerHTML = '<div class="empty">Agenda belum dapat dimuat. Silakan coba lagi nanti.</div>'; return; }
    el.innerHTML = data.length
      ? data.map(events.itemHtml).join("")
      : '<div class="empty">' + (scope === "past" ? "Belum ada agenda yang sudah lewat." : "Belum ada agenda mendatang.") + "</div>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) { showDetail(id); return; }
    const select = document.getElementById("filter-scope");
    select.addEventListener("change", function () { showList(select.value); });
    showList("upcoming");
  });
})();
