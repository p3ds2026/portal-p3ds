// Logika halaman kelola-agenda.html (khusus pengurus dan administrator)
(function () {
  const { events, auth, utils } = window.P3DS;
  let profile = null;
  let rows = [];

  function show(el, type, text) {
    el.className = "alert alert-" + type;
    el.textContent = text;
    el.classList.remove("is-hidden");
  }

  function emptyToNull(v) {
    const t = String(v ?? "").trim();
    return t === "" ? null : t;
  }

  // ISO (UTC) -> nilai untuk input datetime-local (waktu setempat)
  function toLocalInput(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  // Nilai input datetime-local -> ISO (UTC)
  function toIso(local) {
    return local ? new Date(local).toISOString() : null;
  }

  function resetForm(form) {
    form.reset();
    form.id.value = "";
    document.getElementById("form-title").textContent = "Tambah Agenda Baru";
    document.getElementById("btn-cancel").classList.add("is-hidden");
  }

  async function loadTable() {
    const body = document.getElementById("table-body");
    body.innerHTML = '<tr><td colspan="5">Memuat...</td></tr>';
    const { data, error } = await events.listAll();
    if (error) { body.innerHTML = '<tr><td colspan="5">Data belum dapat dimuat.</td></tr>'; return; }
    rows = data;
    if (!rows.length) { body.innerHTML = '<tr><td colspan="5">Belum ada agenda. Silakan tambah agenda pertama di atas.</td></tr>'; return; }
    body.innerHTML = rows.map(function (r) {
      return `<tr>
        <td>${utils.escapeHtml(r.title)}</td>
        <td>${utils.formatDateTime(r.start_at)}</td>
        <td>${utils.escapeHtml(r.location || "-")}</td>
        <td><span class="badge">${r.status === "published" ? "Terbit" : "Draft"}</span>${r.visibility === "member" ? '<span class="badge">Anggota</span>' : ""}</td>
        <td class="actions">
          <button class="btn btn-small" data-act="edit" data-id="${utils.escapeHtml(r.id)}" type="button">Ubah</button>
          <button class="btn btn-small btn-danger" data-act="del" data-id="${utils.escapeHtml(r.id)}" type="button">Hapus</button>
        </td>
      </tr>`;
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

    const form = document.getElementById("form-agenda");
    const msg = document.getElementById("msg");
    const btn = document.getElementById("btn-submit");

    document.getElementById("btn-cancel").addEventListener("click", function () { resetForm(form); });

    document.getElementById("table-body").addEventListener("click", async function (e) {
      const b = e.target.closest("button[data-act]");
      if (!b) return;
      const row = rows.find(function (r) { return r.id === b.dataset.id; });
      if (!row) return;

      if (b.dataset.act === "edit") {
        form.id.value = row.id;
        form.title.value = row.title;
        form.description.value = row.description || "";
        form.location.value = row.location || "";
        form.start_at.value = toLocalInput(row.start_at);
        form.end_at.value = toLocalInput(row.end_at);
        form.cover_url.value = row.cover_url || "";
        form.visibility.value = row.visibility;
        form.status.value = row.status;
        document.getElementById("form-title").textContent = "Ubah Agenda";
        document.getElementById("btn-cancel").classList.remove("is-hidden");
        form.scrollIntoView({ behavior: "smooth" });
      }

      if (b.dataset.act === "del") {
        if (!window.confirm('Hapus agenda "' + row.title + '"? Tindakan ini tidak dapat dibatalkan.')) return;
        const { error } = await events.remove(row.id);
        if (error) { show(msg, "error", "Agenda gagal dihapus."); return; }
        show(msg, "success", "Agenda berhasil dihapus.");
        loadTable();
      }
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const title = form.title.value.trim();
      const cover = emptyToNull(form.cover_url.value);

      if (title.length < 3 || title.length > 200) { show(msg, "error", "Judul harus 3 sampai 200 huruf."); return; }
      if (!form.start_at.value) { show(msg, "error", "Waktu mulai wajib diisi."); return; }
      if (form.end_at.value && new Date(form.end_at.value) < new Date(form.start_at.value)) {
        show(msg, "error", "Waktu selesai tidak boleh lebih awal dari waktu mulai."); return;
      }
      if (cover && !cover.startsWith("https://")) { show(msg, "error", "Alamat gambar harus diawali https://"); return; }

      const values = {
        title,
        description: emptyToNull(form.description.value),
        location: emptyToNull(form.location.value),
        start_at: toIso(form.start_at.value),
        end_at: toIso(form.end_at.value),
        cover_url: cover,
        visibility: form.visibility.value,
        status: form.status.value,
      };

      btn.disabled = true;
      btn.textContent = "Menyimpan...";
      const id = form.id.value;
      const { error } = id ? await events.update(id, values) : await events.create(values, profile.id);
      btn.disabled = false;
      btn.textContent = "Simpan";

      if (error) { show(msg, "error", "Agenda gagal disimpan. Pastikan Anda berstatus pengurus/admin aktif."); return; }
      show(msg, "success", id ? "Agenda berhasil diperbarui." : "Agenda berhasil disimpan.");
      resetForm(form);
      loadTable();
    });

    loadTable();
  });
})();
