// Modul Galeri Foto & Video. Akses tabel gallery_albums, gallery_media, dan Supabase Storage.
(function () {
  const { db, utils } = window.P3DS;

  const ALBUM_FIELDS = "id, title, description, cover_url, visibility, status, event_id, gdrive_url, created_at";
  const MEDIA_FIELDS = "id, album_id, media_type, file_path, mime_type, file_size, caption, created_at";

  // Jenis file yang diizinkan (ekstensi ditentukan dari jenis file, bukan nama file)
  const ALLOWED = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "video/mp4": "mp4", "video/webm": "webm",
  };
  const MAX_PHOTO = 5 * 1024 * 1024;   // 5 MB
  const MAX_VIDEO = 50 * 1024 * 1024;  // 50 MB

  // Album publik disimpan di bucket publik; album anggota di bucket privat
  function bucketOf(album) {
    return album.visibility === "public" ? "gallery-public" : "gallery-members";
  }

  // ----- Album -----
  function latest(limit = 3) {
    return db.from("gallery_albums").select(ALBUM_FIELDS)
      .eq("status", "published").order("created_at", { ascending: false }).limit(limit);
  }
  function listPublished() {
    return db.from("gallery_albums").select(ALBUM_FIELDS)
      .eq("status", "published").order("created_at", { ascending: false });
  }
  function listAll() {
    return db.from("gallery_albums").select(ALBUM_FIELDS).order("created_at", { ascending: false });
  }
  function getAlbum(id) {
    return db.from("gallery_albums").select(ALBUM_FIELDS).eq("id", id).maybeSingle();
  }
  function countPublished() {
    return db.from("gallery_albums").select("id", { count: "exact", head: true }).eq("status", "published");
  }
  function createAlbum(values, userId) {
    return db.from("gallery_albums").insert({ ...values, created_by: userId }).select(ALBUM_FIELDS).single();
  }
  function updateAlbum(id, values) {
    return db.from("gallery_albums").update(values).eq("id", id);
  }

  // ----- Media -----
  function listMedia(albumId) {
    return db.from("gallery_media").select(MEDIA_FIELDS)
      .eq("album_id", albumId).order("created_at", { ascending: true });
  }

  // Mengubah daftar media menjadi alamat yang bisa ditampilkan
  async function mediaUrls(items, album) {
    if (!items.length) return [];
    const bucket = bucketOf(album);
    if (album.visibility === "public") {
      return items.map(function (m) {
        return db.storage.from(bucket).getPublicUrl(m.file_path).data.publicUrl;
      });
    }
    const { data, error } = await db.storage.from(bucket)
      .createSignedUrls(items.map(function (m) { return m.file_path; }), 3600);
    if (error || !data) return items.map(function () { return ""; });
    return data.map(function (d) { return d.signedUrl || ""; });
  }

  function validateFile(file) {
    if (!ALLOWED[file.type]) return "Jenis file tidak diizinkan (hanya JPG, PNG, WEBP, MP4, WEBM).";
    const isVideo = file.type.startsWith("video/");
    if (isVideo && file.size > MAX_VIDEO) return "Video terlalu besar (maksimal 50 MB).";
    if (!isVideo && file.size > MAX_PHOTO) return "Foto terlalu besar (maksimal 5 MB).";
    return null;
  }

  async function uploadMedia(file, album, userId, caption) {
    const problem = validateFile(file);
    if (problem) return { error: problem };

    const bucket = bucketOf(album);
    const path = album.id + "/" + crypto.randomUUID() + "." + ALLOWED[file.type];
    const up = await db.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) return { error: "File gagal diunggah." };

    const mediaType = file.type.startsWith("video/") ? "video" : "photo";
    const ins = await db.from("gallery_media").insert({
      album_id: album.id, uploaded_by: userId, media_type: mediaType,
      file_path: path, mime_type: file.type, file_size: file.size, caption: caption || null,
    });
    if (ins.error) {
      await db.storage.from(bucket).remove([path]);
      return { error: "Data file gagal disimpan." };
    }

    // Foto pertama pada album publik otomatis menjadi sampul
    if (mediaType === "photo" && album.visibility === "public" && !album.cover_url) {
      const url = db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      await updateAlbum(album.id, { cover_url: url });
      album.cover_url = url;
    }
    return { error: null };
  }

  async function deleteMedia(item, album) {
    await db.storage.from(bucketOf(album)).remove([item.file_path]);
    return db.from("gallery_media").delete().eq("id", item.id);
  }

  async function deleteAlbum(album) {
    const { data } = await listMedia(album.id);
    if (data && data.length) {
      await db.storage.from(bucketOf(album)).remove(data.map(function (m) { return m.file_path; }));
    }
    return db.from("gallery_albums").delete().eq("id", album.id);
  }

  // ----- Tampilan -----
  function cardHtml(album) {
    const cover = utils.safeUrl(album.cover_url);
    const coverHtml = cover
      ? `<img class="card-cover" src="${utils.escapeHtml(cover)}" alt="${utils.escapeHtml(album.title)}" loading="lazy">`
      : `<div class="card-cover placeholder">Galeri</div>`;
    const lock = album.visibility === "member" ? '<span class="badge">Khusus Anggota</span>' : "";
    return `
      <article class="card">
        ${coverHtml}
        <div class="card-body">
          <div class="meta">${lock}${utils.formatDate(album.created_at)}</div>
          <h3><a href="galeri.html?id=${encodeURIComponent(album.id)}">${utils.escapeHtml(album.title)}</a></h3>
          <p>${utils.escapeHtml(utils.shorten(album.description, 100))}</p>
        </div>
      </article>`;
  }

  async function renderLatest(targetId, limit = 3) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const { data, error } = await latest(limit);
    if (error) { el.innerHTML = '<div class="empty">Galeri belum dapat dimuat. Silakan coba lagi nanti.</div>'; return; }
    el.innerHTML = data.length ? data.map(cardHtml).join("") : '<div class="empty">Belum ada album dokumentasi.</div>';
  }

  window.P3DS.gallery = {
    latest, listPublished, listAll, getAlbum, countPublished, createAlbum, updateAlbum, deleteAlbum,
    listMedia, mediaUrls, uploadMedia, deleteMedia, validateFile, cardHtml, renderLatest,
  };
})();
