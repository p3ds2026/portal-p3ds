// Logika halaman kelola-sosial.html (khusus pengurus dan administrator)
(function () {
  const { social, auth, utils } = window.P3DS;
  let profile = null;
  let rows = [];
  let current = null; // kegiatan yang sedang dikelola perkembangannya
  let updates = [];

  function show(el, type, text) {
    el.className = "alert alert-" + type;
    el.textContent = text;
    el.classList.remove("is-hidden");
  }

  function emptyToNull(v) {
    const t = String(v ?? "").trim();
    return t === "" ? null : t;
  }

  function resetForm(form) {
    form.reset();
    form.id.value = "";
    document.getElementById("form-title").textContent = "Tambah Kegiatan Sosial";
    document.getElementById("btn-cancel").classList.add("is-hidden");
  }

  async function loadTable() {
    const body = document.getElementById("table-body");
    body.innerHTML = '<tr><td colspan="5">Memuat...</td></tr>';
    const { data, error } = await social.listAll();
    if (error) { body.innerHTML = '<tr><td colspan="5">Data belum dapat dimuat.</td></tr>'; return; }
    rows = data;
    if (!rows.length) { body.innerHTML = '<tr><td colspan="5">Belum ada kegiatan. Silakan tambah di atas.</td></tr>'; return; }
    body.innerHTML = rows.map(function (r) {
      return `<tr>
        <td>${utils.escapeHtml(r.title)}</td>
        <td>${utils.escapeHtml(social.STATUS_LABEL[r.activity_status] || "")}</td>
        <td>${utils.formatDate(r.activity_date)}</td>
        <td><span class="badge">${r.status === "published" ? "Terbit" : "Draft"}</span>${r.visibility === "member" ? '<span class="badge">Anggota</span>' : ""}</td>
        <td class="actions">
          <button class="btn btn-small" data-act="updates" data-id="${utils.escapeHtml(r.id)}" type="button">Perkembangan</button>
          <button class="btn btn-small btn-outline-dark" data-act="edit" data-id="${utils.escapeHtml(r.id)}" type="button">Ubah</button>
          <button class="btn btn-small btn-danger" data-act="del" data-id="${utils.escapeHtml(r.id)}" type="button">Hapus</button>
        </td>
      </tr>`;
    }).join("");
  }

  async function loadUpdates() {
    const box = document.getElementById("updates-list");
    box.innerHTML = '<div class="loading">Memuat...</div>';
    const { data } = await social.listUpdates(current.id);
    updates = data || [];
    if (!updates.length) { box.innerHTML = '<div class="empty">Belum ada catatan perkembangan.</div>'; return; }
    box.innerHTML = updates.map(function (u) {
      return `<div class="timeline-item">
        <div class="meta">${utils.formatDate(u.created_at)}</div>
        <h3>${utils.escapeHtml(u.title)}</h3>
        <div class="article-content">${utils.escapeHtml(utils.shorten(u.content, 200))}</div>
        <button class="btn btn-small btn-danger" data-upd-del="${utils.escapeHtml(u.id)}" type="button">Hapus</button>
      </div>`;
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", async function () {
    profile = await auth.requireLogin();
    if (!profile) return;

    const denied = document.getElementById("denied");
    const panel = document.getElementById("panel");
    const isStaff = profile.status === "active" && (profile.role === "pengurus" || profile.role === "admin");
    if (!isStaff) { denied.classList.remove("is-hidden"); return; }
    panel.classList.remove("is-hidden");

    const form = document.getElementById("form-sosial");
    const msg = document.getElementById("msg");
    const btn = document.getElementById("btn-submit");
    const upForm = document.getElementById("form-update");
    const upMsg = document.getElementById("up-msg");

    document.getElementById("btn-cancel").addEventListener("click", function () { resetForm(form); });

    document.getElementById("table-body").addEventListener("click", async function (e) {
      const b = e.target.closest("button[data-act]");
      if (!b) return;
      const row = rows.find(function (r) { return r.id === b.dataset.id; });
      if (!row) return;

      if (b.dataset.act === "updates") {
        current = row;
        document.getElementById("updates-panel").classList.remove("is-hidden");
        document.getElementById("updates-title").textContent = "Perkembangan: " + row.title;
        document.getElementById("updates-panel").scrollIntoView({ behavior: "smooth" });
        loadUpdates();
      }

      if (b.dataset.act === "edit") {
        form.id.value = row.id;
        form.title.value = row.title;
        form.description.value = row.description || "";
        form.location.value = row.location || "";
        form.activity_date.value = row.activity_date || "";
        form.activity_status.value = row.activity_status;
        form.cover_url.value = row.cover_url || "";
        form.visibility.value = row.visibility;
        form.status.value = row.status;
        document.getElementById("form-title").textContent = "Ubah Kegiatan Sosial";
        document.getElementById("btn-cancel").classList.remove("is-hidden");
        form.scrollIntoView({ behavior: "smooth" });
      }

      if (b.dataset.act === "del") {
        if (!window.confirm('Hapus kegiatan "' + row.title + '" beserta catatan perkembangannya? Tidak dapat dibatalkan.')) return;
        const { error } = await social.remove(row.id);
        if (error) { show(msg, "error", "Kegiatan gagal dihapus."); return; }
        if (current && current.id === row.id) { current = null; document.getElementById("updates-panel").classList.add("is-hidden"); }
        show(msg, "success", "Kegiatan berhasil dihapus.");
        loadTable();
      }
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const title = form.title.value.trim();
      const cover = emptyToNull(form.cover_url.value);
      if (title.length < 3 || title.length > 200) { show(msg, "error", "Judul harus 3 sampai 200 huruf."); return; }
      if (cover && !cover.startsWith("https://")) { show(msg, "error", "Alamat gambar harus diawali https://"); return; }

      const values = {
        title,
        description: emptyToNull(form.description.value),
        location: emptyToNull(form.location.value),
        activity_date: emptyToNull(form.activity_date.value),
        activity_status: form.activity_status.value,
        cover_url: cover,
        visibility: form.visibility.value,
        status: form.status.value,
      };

      btn.disabled = true;
      btn.textContent = "Menyimpan...";
      const id = form.id.value;
      const { error } = id ? await social.update(id, values) : await social.create(values, profile.id);
      btn.disabled = false;
      btn.textContent = "Simpan";

      if (error) { show(msg, "error", "Kegiatan gagal disimpan. Pastikan Anda berstatus pengurus/admin aktif."); return; }
      show(msg, "success", id ? "Kegiatan berhasil diperbarui." : "Kegiatan berhasil disimpan.");
      resetForm(form);
      loadTable();
    });

    // Tambah catatan perkembangan
    upForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!current) return;
      const title = upForm.title.value.trim();
      const content = upForm.content.value.trim();
      const media = emptyToNull(upForm.media_url.value);
      if (title.length < 3 || title.length > 200) { show(upMsg, "error", "Judul harus 3 sampai 200 huruf."); return; }
      if (content.length < 5) { show(upMsg, "error", "Isi catatan terlalu pendek."); return; }
      if (media && !media.startsWith("https://")) { show(upMsg, "error", "Alamat gambar harus diawali https://"); return; }

      const { error } = await social.addUpdate({ activity_id: current.id, title, content, media_url: media }, profile.id);
      if (error) { show(upMsg, "error", "Catatan gagal disimpan."); return; }
      show(upMsg, "success", "Catatan perkembangan berhasil ditambahkan.");
      upForm.reset();
      loadUpdates();
    });

    document.getElementById("updates-list").addEventListener("click", async function (e) {
      const b = e.target.closest("button[data-upd-del]");
      if (!b || !window.confirm("Hapus catatan ini?")) return;
      const { error } = await social.removeUpdate(b.dataset.updDel);
      if (error) { show(upMsg, "error", "Catatan gagal dihapus."); return; }
      loadUpdates();
    });

    loadTable();
  });
})();
