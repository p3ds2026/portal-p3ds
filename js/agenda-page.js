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
    document.title = data.title + " – PORTAL PPDS";

    const pageUrl = window.location.href;
    const waktuText = utils.formatDateTime(data.start_at) + (data.end_at ? " s.d. " + utils.formatDateTime(data.end_at) : "");
    const lokasiText = data.location ? `\n📍 Tempat: ${data.location}` : "";
    const shareText = `🗓️ *[AGENDA PPDS]*\n*${data.title}*\nPensiunan Pertamina Dumai – Sei Pakning\n\n⏰ Waktu: ${waktuText}${lokasiText}\n\nRincian agenda selengkapnya di portal resmi:\n${pageUrl}`;
    const waShareUrl = "https://api.whatsapp.com/send?text=" + encodeURIComponent(shareText);

    const shareBoxHtml = `
      <div class="share-wa-card" style="margin: 1.5rem 0; padding: 1rem 1.25rem; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.85rem;">
        <div>
          <div style="font-weight: 600; color: #166534; font-size: 0.98rem;">📲 Bagikan Agenda ke Grup WhatsApp</div>
          <div style="color: #15803d; font-size: 0.85rem; margin-top: 0.2rem;">Ajak rekan pensiunan untuk menghadiri agenda kegiatan ini.</div>
        </div>
        <a href="${waShareUrl}" target="_blank" rel="noopener noreferrer" class="btn" style="background: #25d366; color: #ffffff; border-color: #20b858; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 600; padding: 0.55rem 1.15rem; font-size: 0.92rem; text-decoration: none;">
          💬 Bagikan ke WhatsApp
        </a>
      </div>`;

    box.innerHTML = `
      <article class="article">
        <p><a href="agenda.html">&larr; Kembali ke daftar agenda</a></p>
        <h1>${utils.escapeHtml(data.title)}</h1>
        <p class="meta"><strong>Waktu:</strong> ${utils.formatDateTime(data.start_at)}
          ${data.end_at ? " s.d. " + utils.formatDateTime(data.end_at) : ""}<br>
          ${data.location ? "<strong>Tempat:</strong> " + utils.escapeHtml(data.location) : ""}</p>
        ${cover ? `<img class="article-cover" src="${utils.escapeHtml(cover)}" alt="">` : ""}
        <div class="article-content">${utils.escapeHtml(data.description || "")}</div>
        ${shareBoxHtml}
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
