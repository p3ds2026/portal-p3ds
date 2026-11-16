// Modul Berita & Pengumuman. Semua akses data tabel public.announcements ada di sini.
(function () {
  const { db, utils } = window.P3DS;
  const FIELDS = "id, title, summary, content, category, cover_url, visibility, status, published_at, created_at";

  // ----- Ambil data -----
  function latest(limit = 3) {
    return db.from("announcements").select(FIELDS)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
  }

  function listPublished(category) {
    let q = db.from("announcements").select(FIELDS)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false });
    if (category) q = q.eq("category", category);
    return q;
  }

  // Untuk pengurus/admin: RLS mengizinkan melihat semua, termasuk draft
  function listAll() {
    return db.from("announcements").select(FIELDS).order("created_at", { ascending: false });
  }

  function getById(id) {
    return db.from("announcements").select(FIELDS).eq("id", id).maybeSingle();
  }

  function countPublished() {
    return db.from("announcements").select("id", { count: "exact", head: true }).eq("status", "published");
  }

  // ----- Ubah data (hanya pengurus/admin, dijaga RLS) -----
  function create(values, authorId) {
    const row = { ...values, author_id: authorId };
    if (row.status === "published") row.published_at = new Date().toISOString();
    return db.from("announcements").insert(row).select("id").single();
  }

  async function update(id, values) {
    const row = { ...values };
    if (row.status === "published") {
      const { data } = await getById(id);
      if (!data || !data.published_at) row.published_at = new Date().toISOString();
    }
    return db.from("announcements").update(row).eq("id", id);
  }

  function remove(id) {
    return db.from("announcements").delete().eq("id", id);
  }

  // ----- Tampilan -----
  function cardHtml(item) {
    const cover = utils.safeUrl(item.cover_url);
    const coverHtml = cover
      ? `<img class="card-cover" src="${utils.escapeHtml(cover)}" alt="" loading="lazy">`
      : `<div class="card-cover placeholder">P3DS</div>`;
    const text = item.summary || utils.shorten(item.content, 140);
    const lock = item.visibility === "member" ? '<span class="badge">Khusus Anggota</span>' : "";
    return `
      <article class="card">
        ${coverHtml}
        <div class="card-body">
          <div class="meta"><span class="badge">${utils.escapeHtml(item.category)}</span>${lock}${utils.formatDate(item.published_at)}</div>
          <h3><a href="berita.html?id=${encodeURIComponent(item.id)}">${utils.escapeHtml(item.title)}</a></h3>
          <p>${utils.escapeHtml(utils.shorten(text, 140))}</p>
        </div>
      </article>`;
  }

  async function renderLatest(targetId, limit = 3) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const { data, error } = await latest(limit);
    if (error) { el.innerHTML = '<div class="empty">Berita belum dapat dimuat. Silakan coba lagi nanti.</div>'; return; }
    el.innerHTML = data.length ? data.map(cardHtml).join("") : '<div class="empty">Belum ada berita yang dipublikasikan.</div>';
  }

  window.P3DS.news = {
    latest, listPublished, listAll, getById, countPublished,
    create, update, remove, cardHtml, renderLatest,
  };
})();
