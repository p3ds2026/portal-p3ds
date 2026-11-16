// Modul Kegiatan Sosial. Akses tabel social_activities dan social_updates.
(function () {
  const { db, utils } = window.P3DS;

  const FIELDS = "id, title, description, location, activity_date, cover_url, activity_status, visibility, status, created_at";
  const UPDATE_FIELDS = "id, activity_id, author_id, title, content, media_url, created_at";

  const STATUS_LABEL = {
    planned: "Direncanakan", ongoing: "Berlangsung", completed: "Selesai", cancelled: "Dibatalkan",
  };

  // ----- Kegiatan -----
  function listPublished() {
    return db.from("social_activities").select(FIELDS)
      .eq("status", "published")
      .order("activity_date", { ascending: false, nullsFirst: false });
  }
  function listAll() {
    return db.from("social_activities").select(FIELDS).order("created_at", { ascending: false });
  }
  function getById(id) {
    return db.from("social_activities").select(FIELDS).eq("id", id).maybeSingle();
  }
  function countPublished() {
    return db.from("social_activities").select("id", { count: "exact", head: true }).eq("status", "published");
  }
  function create(values, userId) {
    return db.from("social_activities").insert({ ...values, created_by: userId }).select("id").single();
  }
  function update(id, values) {
    return db.from("social_activities").update(values).eq("id", id);
  }
  function remove(id) {
    return db.from("social_activities").delete().eq("id", id);
  }

  // ----- Perkembangan kegiatan -----
  function listUpdates(activityId) {
    return db.from("social_updates").select(UPDATE_FIELDS)
      .eq("activity_id", activityId).order("created_at", { ascending: false });
  }
  function addUpdate(values, userId) {
    return db.from("social_updates").insert({ ...values, author_id: userId });
  }
  function removeUpdate(id) {
    return db.from("social_updates").delete().eq("id", id);
  }

  // ----- Tampilan -----
  function cardHtml(a) {
    const cover = utils.safeUrl(a.cover_url);
    const coverHtml = cover
      ? `<img class="card-cover" src="${utils.escapeHtml(cover)}" alt="" loading="lazy">`
      : `<div class="card-cover placeholder">Sosial</div>`;
    const lock = a.visibility === "member" ? '<span class="badge">Khusus Anggota</span>' : "";
    return `
      <article class="card">
        ${coverHtml}
        <div class="card-body">
          <div class="meta"><span class="badge">${utils.escapeHtml(STATUS_LABEL[a.activity_status] || "")}</span>${lock}${utils.formatDate(a.activity_date)}</div>
          <h3><a href="kegiatan-sosial.html?id=${encodeURIComponent(a.id)}">${utils.escapeHtml(a.title)}</a></h3>
          <p>${utils.escapeHtml(utils.shorten(a.description, 120))}</p>
        </div>
      </article>`;
  }

  window.P3DS.social = {
    STATUS_LABEL, listPublished, listAll, getById, countPublished, create, update, remove,
    listUpdates, addUpdate, removeUpdate, cardHtml,
  };
})();
