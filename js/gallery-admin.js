// Logika halaman kelola-galeri.html (khusus pengurus dan administrator)
(function () {
  const { gallery, auth, utils } = window.P3DS;
  let profile = null;
  let albums = [];
  let current = null; // album yang sedang dikelola medianya
  let mediaItems = [];

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
    form.visibility.disabled = false;
    document.getElementById("form-title").textContent = "Buat Album Baru";
    document.getElementById("btn-cancel").classList.add("is-hidden");
  }

  async function loadAlbums() {
    const body = document.getElementById("table-body");
    body.innerHTML = '<tr><td colspan="4">Memuat...</td></tr>';
    const { data, error } = await gallery.listAll();
    if (error) { body.innerHTML = '<tr><td colspan="4">Data belum dapat dimuat.</td></tr>'; return; }
    albums = data;
    if (!albums.length) { body.innerHTML = '<tr><td colspan="4">Belum ada album. Silakan buat album pertama di atas.</td></tr>'; return; }
    body.innerHTML = albums.map(function (a) {
      return `<tr>
        <td>${utils.escapeHtml(a.title)}</td>
        <td>${a.visibility === "public" ? "Publik" : "Khusus anggota"}</td>
        <td><span class="badge">${a.status === "published" ? "Terbit" : "Draft"}</span></td>
        <td class="actions">
          <button class="btn btn-small" data-act="media" data-id="${utils.escapeHtml(a.id)}" type="button">Foto/Video</button>
          <button class="btn btn-small btn-outline-dark" data-act="edit" data-id="${utils.escapeHtml(a.id)}" type="button">Ubah</button>
          <button class="btn btn-small btn-danger" data-act="del" data-id="${utils.escapeHtml(a.id)}" type="button">Hapus</button>
        </td>
      </tr>`;
    }).join("");
  }

  async function loadMedia() {
    const grid = document.getElementById("media-grid");
    grid.innerHTML = '<div class="loading">Memuat...</div>';
    const { data } = await gallery.listMedia(current.id);
    mediaItems = data || [];
    const urls = await gallery.mediaUrls(mediaItems, current);
    if (!mediaItems.length) { grid.innerHTML = '<div class="empty">Belum ada file di album ini.</div>'; return; }
    grid.innerHTML = mediaItems.map(function (m, i) {
      const url = utils.safeUrl(urls[i]);
      const thumb = !url ? "" : m.media_type === "video"
        ? `<video preload="metadata" src="${utils.escapeHtml(url)}"></video>`
        : `<img src="${utils.escapeHtml(url)}" alt="" loading="lazy">`;
      return `<div class="media-item">${thumb}
        <div class="media-caption">${utils.escapeHtml(m.caption || "")}</div>
        <button class="btn btn-small btn-danger" data-media-del="${utils.escapeHtml(m.id)}" type="button">Hapus</button></div>`;
    }).join("");
  }

  function openMedia(album) {
    current = album;
    document.getElementById("media-panel").classList.remove("is-hidden");
    document.getElementById("media-title").textContent = "Foto & Video: " + album.title;
    document.getElementById("media-panel").scrollIntoView({ behavior: "smooth" });
    loadMedia();
  }

  document.addEventListener("DOMContentLoaded", async function () {
    profile = await auth.requireLogin();
    if (!profile) return;

    const denied = document.getElementById("denied");
    const panel = document.getElementById("panel");
    const isStaff = profile.status === "active" && (profile.role === "pengurus" || profile.role === "admin");
    if (!isStaff) { denied.classList.remove("is-hidden"); return; }
    panel.classList.remove("is-hidden");

    const form = document.getElementById("form-album");
    const msg = document.getElementById("msg");
    const btn = document.getElementById("btn-submit");
    const upForm = document.getElementById("form-upload");
    const upMsg = document.getElementById("up-msg");
    const upBtn = document.getElementById("btn-upload");

    document.getElementById("btn-cancel").addEventListener("click", function () { resetForm(form); });

    // Tombol pada tabel album
    document.getElementById("table-body").addEventListener("click", async function (e) {
      const b = e.target.closest("button[data-act]");
      if (!b) return;
      const album = albums.find(function (a) { return a.id === b.dataset.id; });
      if (!album) return;

      if (b.dataset.act === "media") openMedia(album);

      if (b.dataset.act === "edit") {
        form.id.value = album.id;
        form.title.value = album.title;
        form.description.value = album.description || "";
        form.gdrive_url.value = album.gdrive_url || "";
        form.visibility.value = album.visibility;
        form.visibility.disabled = true; // akses tidak boleh diubah setelah album dibuat
        form.status.value = album.status;
        document.getElementById("form-title").textContent = "Ubah Album";
        document.getElementById("btn-cancel").classList.remove("is-hidden");
        form.scrollIntoView({ behavior: "smooth" });
      }

      if (b.dataset.act === "del") {
        if (!window.confirm('Hapus album "' + album.title + '" beserta SEMUA foto dan videonya? Tidak dapat dibatalkan.')) return;
        const { error } = await gallery.deleteAlbum(album);
        if (error) { show(msg, "error", "Album gagal dihapus."); return; }
        if (current && current.id === album.id) { current = null; document.getElementById("media-panel").classList.add("is-hidden"); }
        show(msg, "success", "Album berhasil dihapus.");
        loadAlbums();
      }
    });

    // Simpan album
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const title = form.title.value.trim();
      if (title.length < 3 || title.length > 200) { show(msg, "error", "Judul album harus 3 sampai 200 huruf."); return; }

      const id = form.id.value;
      const gdrive = emptyToNull(form.gdrive_url.value);
      btn.disabled = true;
      btn.textContent = "Menyimpan...";
      let error;
      if (id) {
        ({ error } = await gallery.updateAlbum(id, {
          title, description: emptyToNull(form.description.value), gdrive_url: gdrive, status: form.status.value,
        }));
      } else {
        ({ error } = await gallery.createAlbum({
          title, description: emptyToNull(form.description.value), gdrive_url: gdrive,
          visibility: form.visibility.value, status: form.status.value,
        }, profile.id));
      }
      btn.disabled = false;
      btn.textContent = "Simpan Album";

      if (error) { show(msg, "error", "Album gagal disimpan. Pastikan Anda berstatus pengurus/admin aktif."); return; }
      show(msg, "success", id ? "Album berhasil diperbarui." : "Album berhasil dibuat. Klik tombol Foto/Video untuk mengunggah file.");
      resetForm(form);
      loadAlbums();
    });

    // Hapus satu file media
    document.getElementById("media-grid").addEventListener("click", async function (e) {
      const b = e.target.closest("button[data-media-del]");
      if (!b || !current) return;
      const item = mediaItems.find(function (m) { return m.id === b.dataset.mediaDel; });
      if (!item || !window.confirm("Hapus file ini?")) return;
      const { error } = await gallery.deleteMedia(item, current);
      if (error) { show(upMsg, "error", "File gagal dihapus."); return; }
      loadMedia();
    });

    // Unggah file
    upForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!current) return;
      const files = Array.from(upForm.files.files);
      if (!files.length) { show(upMsg, "error", "Pilih minimal satu file."); return; }
      const caption = emptyToNull(upForm.caption.value);

      upBtn.disabled = true;
      let ok = 0;
      const problems = [];
      for (let i = 0; i < files.length; i++) {
        upBtn.textContent = "Mengunggah " + (i + 1) + " dari " + files.length + "...";
        const { error } = await gallery.uploadMedia(files[i], current, profile.id, caption);
        if (error) problems.push(files[i].name + ": " + error); else ok++;
      }
      upBtn.disabled = false;
      upBtn.textContent = "Unggah";
      upForm.reset();

      if (problems.length) show(upMsg, "error", ok + " file berhasil. Gagal: " + problems.join(" | "));
      else show(upMsg, "success", ok + " file berhasil diunggah.");
      loadMedia();
      loadAlbums();
    });

    loadAlbums();
  });
})();
