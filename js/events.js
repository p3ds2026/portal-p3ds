// Modul Agenda Kegiatan. Semua akses data tabel public.events ada di sini.
(function () {
  const { db, utils } = window.P3DS;
  const FIELDS = "id, title, description, location, start_at, end_at, cover_url, visibility, status, created_at";

  // ----- Ambil data -----
  function upcoming(limit = 4) {
    return db.from("events").select(FIELDS)
      .eq("status", "published")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(limit);
  }

  // scope: "upcoming" (mendatang) atau "past" (sudah lewat)
  function listPublished(scope) {
    const now = new Date().toISOString();
    let q = db.from("events").select(FIELDS).eq("status", "published");
    if (scope === "past") q = q.lt("start_at", now).order("start_at", { ascending: false });
    else q = q.gte("start_at", now).order("start_at", { ascending: true });
    return q;
  }

  // Untuk pengurus/admin: RLS mengizinkan melihat semua, termasuk draft
  function listAll() {
    return db.from("events").select(FIELDS).order("start_at", { ascending: false });
  }

  function getById(id) {
    return db.from("events").select(FIELDS).eq("id", id).maybeSingle();
  }

  function countUpcoming() {
    return db.from("events").select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("start_at", new Date().toISOString());
  }

  // ----- Ubah data (hanya pengurus/admin, dijaga RLS) -----
  function create(values, userId) {
    return db.from("events").insert({ ...values, created_by: userId }).select("id").single();
  }

  function update(id, values) {
    return db.from("events").update(values).eq("id", id);
  }

  function remove(id) {
    return db.from("events").delete().eq("id", id);
  }

  // ----- Tampilan -----
  function itemHtml(ev) {
    const d = new Date(ev.start_at);
    const day = d.getDate();
    const month = d.toLocaleDateString("id-ID", { month: "short" });
    const lock = ev.visibility === "member" ? '<span class="badge">Khusus Anggota</span>' : "";
    return `
      <article class="card event-item">
        <div class="event-date"><div class="day">${day}</div><div class="month">${utils.escapeHtml(month)}</div></div>
        <div>
          <h3><a href="agenda.html?id=${encodeURIComponent(ev.id)}">${utils.escapeHtml(ev.title)}</a></h3>
          <div class="meta">${lock}${utils.formatDateTime(ev.start_at)}${ev.location ? " · " + utils.escapeHtml(ev.location) : ""}</div>
        </div>
      </article>`;
  }

  async function renderUpcoming(targetId, limit = 4) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const { data, error } = await upcoming(limit);
    if (error) { el.innerHTML = '<div class="empty">Agenda belum dapat dimuat. Silakan coba lagi nanti.</div>'; return; }
    el.innerHTML = data.length ? data.map(itemHtml).join("") : '<div class="empty">Belum ada agenda mendatang.</div>';
  }

  window.P3DS.events = {
    upcoming, listPublished, listAll, getById, countUpcoming,
    create, update, remove, itemHtml, renderUpcoming,
  };
})();
