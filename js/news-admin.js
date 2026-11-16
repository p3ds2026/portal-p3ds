// Logika halaman kelola-berita.html (khusus pengurus dan administrator)
(function () {
  const { news, auth, utils } = window.P3DS;
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

  function resetForm(form) {
    form.reset();
    form.id.value = "";
    if (form.cover_url) form.cover_url.value = "";
    if (window._updateCoverPreview) window._updateCoverPreview(null);
    document.getElementById("form-title").textContent = "Tulis Berita / Pengumuman Baru";
    document.getElementById("btn-cancel").classList.add("is-hidden");
  }

  async function loadTable() {
    const body = document.getElementById("table-body");
    body.innerHTML = '<tr><td colspan="5">Memuat...</td></tr>';
    const { data, error } = await news.listAll();
    if (error) { body.innerHTML = '<tr><td colspan="5">Data belum dapat dimuat.</td></tr>'; return; }
    rows = data;
    if (!rows.length) { body.innerHTML = '<tr><td colspan="5">Belum ada berita. Silakan tulis berita pertama di atas.</td></tr>'; return; }
    body.innerHTML = rows.map(function (r) {
      return `<tr>
        <td>${utils.escapeHtml(r.title)}</td>
        <td>${utils.escapeHtml(r.category)}</td>
        <td><span class="badge">${r.status === "published" ? "Terbit" : "Draft"}</span>${r.visibility === "member" ? '<span class="badge">Anggota</span>' : ""}</td>
        <td>${utils.formatDate(r.published_at || r.created_at)}</td>
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

    const form = document.getElementById("form-berita");
    const msg = document.getElementById("msg");
    const btn = document.getElementById("btn-submit");

    // Pengelolaan Unggah Foto Sampul Berita ke Supabase Storage
    const coverFile = document.getElementById("cover_file");
    const coverStatus = document.getElementById("cover-upload-status");
    const coverPreviewBox = document.getElementById("cover-preview-box");
    const coverPreviewImg = document.getElementById("cover-preview-img");
    const btnRemoveCover = document.getElementById("btn-remove-cover");
    const coverUrlManual = document.getElementById("cover_url_manual");

    function updateCoverPreview(url) {
      if (url) {
        coverPreviewImg.src = url;
        coverPreviewBox.classList.remove("is-hidden");
        form.cover_url.value = url;
        if (coverUrlManual) coverUrlManual.value = url;
        coverStatus.textContent = "Foto sampul siap disimpan.";
        coverStatus.style.color = "var(--navy)";
      } else {
        coverPreviewImg.src = "";
        coverPreviewBox.classList.add("is-hidden");
        form.cover_url.value = "";
        if (coverUrlManual) coverUrlManual.value = "";
        if (coverFile) coverFile.value = "";
        coverStatus.textContent = "Pilih foto dari komputer/HP (JPG, PNG, WEBP, maks 5 MB). Otomatis tersimpan ke Supabase Storage.";
        coverStatus.style.color = "";
      }
    }
    window._updateCoverPreview = updateCoverPreview;

    if (btnRemoveCover) {
      btnRemoveCover.addEventListener("click", function () {
        updateCoverPreview(null);
      });
    }

    if (coverUrlManual) {
      coverUrlManual.addEventListener("input", function () {
        const url = coverUrlManual.value.trim();
        if (url && url.startsWith("https://")) {
          updateCoverPreview(url);
        } else if (!url) {
          updateCoverPreview(null);
        }
      });
    }

    if (coverFile) {
      coverFile.addEventListener("change", async function () {
        const file = coverFile.files && coverFile.files[0];
        if (!file) return;

        if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
          show(msg, "error", "Jenis file harus gambar JPG, PNG, atau WEBP.");
          coverFile.value = "";
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          show(msg, "error", "Ukuran foto maksimal 5 MB.");
          coverFile.value = "";
          return;
        }

        coverStatus.textContent = "⏳ Sedang mengunggah foto ke Supabase Storage...";
        coverStatus.style.color = "var(--navy)";
        btn.disabled = true;

        try {
          const ext = file.name.split(".").pop().toLowerCase() || "jpg";
          const safeName = "berita-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7) + "." + ext;
          const path = "berita/" + safeName;

          const { error: upErr } = await window.P3DS.db.storage
            .from("gallery-public")
            .upload(path, file, { cacheControl: "3600", upsert: true });

          if (upErr) {
            coverStatus.textContent = "❌ Gagal mengunggah foto: " + upErr.message;
            coverStatus.style.color = "#d93025";
            btn.disabled = false;
            return;
          }

          const { data: urlData } = window.P3DS.db.storage
            .from("gallery-public")
            .getPublicUrl(path);

          const publicUrl = urlData ? urlData.publicUrl : "";
          updateCoverPreview(publicUrl);
          coverStatus.textContent = "✅ Foto berhasil diunggah ke Supabase Storage!";
          coverStatus.style.color = "#1e8e3e";
        } catch (err) {
          coverStatus.textContent = "❌ Terjadi kesalahan saat mengunggah foto.";
          coverStatus.style.color = "#d93025";
        } finally {
          btn.disabled = false;
        }
      });
    }

    document.getElementById("btn-cancel").addEventListener("click", function () { resetForm(form); });

    document.getElementById("table-body").addEventListener("click", async function (e) {
      const b = e.target.closest("button[data-act]");
      if (!b) return;
      const row = rows.find(function (r) { return r.id === b.dataset.id; });
      if (!row) return;

      if (b.dataset.act === "edit") {
        form.id.value = row.id;
        form.title.value = row.title;
        form.category.value = row.category;
        form.summary.value = row.summary || "";
        form.content.value = row.content;
        form.cover_url.value = row.cover_url || "";
        updateCoverPreview(row.cover_url);
        form.visibility.value = row.visibility;
        form.status.value = row.status;
        document.getElementById("form-title").textContent = "Ubah Berita";
        document.getElementById("btn-cancel").classList.remove("is-hidden");
        form.scrollIntoView({ behavior: "smooth" });
      }

      if (b.dataset.act === "del") {
        if (!window.confirm('Hapus "' + row.title + '"? Tindakan ini tidak dapat dibatalkan.')) return;
        const { error } = await news.remove(row.id);
        if (error) { show(msg, "error", "Berita gagal dihapus."); return; }
        show(msg, "success", "Berita berhasil dihapus.");
        loadTable();
      }
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const title = form.title.value.trim();
      const content = form.content.value.trim();
      const summary = emptyToNull(form.summary.value);
      const cover = emptyToNull(form.cover_url.value);

      if (title.length < 3 || title.length > 200) { show(msg, "error", "Judul harus 3 sampai 200 huruf."); return; }
      if (content.length < 10) { show(msg, "error", "Isi berita terlalu pendek."); return; }
      if (summary && summary.length > 500) { show(msg, "error", "Ringkasan maksimal 500 huruf."); return; }
      if (cover && !cover.startsWith("https://")) { show(msg, "error", "Alamat gambar harus diawali https://"); return; }

      const values = {
        title, content, summary,
        category: form.category.value,
        cover_url: cover,
        visibility: form.visibility.value,
        status: form.status.value,
      };

      btn.disabled = true;
      btn.textContent = "Menyimpan...";
      const id = form.id.value;
      const { error } = id ? await news.update(id, values) : await news.create(values, profile.id);
      btn.disabled = false;
      btn.textContent = "Simpan";

      if (error) { show(msg, "error", "Berita gagal disimpan. Pastikan Anda berstatus pengurus/admin aktif."); return; }
      show(msg, "success", id ? "Berita berhasil diperbarui." : "Berita berhasil disimpan.");
      resetForm(form);
      loadTable();
    });

    // Inisialisasi toolbar tombol format teks (Tebal, Miring, Garis Bawah, dsb)
    const contentTextarea = document.getElementById("content");
    document.querySelectorAll(".btn-fmt").forEach(function (btnFmt) {
      btnFmt.addEventListener("click", function () {
        const fmt = btnFmt.dataset.fmt;
        if (window.P3DS && window.P3DS.utils && window.P3DS.utils.applyFormatting) {
          window.P3DS.utils.applyFormatting(contentTextarea, fmt);
        }
      });
    });

    loadTable();
  });
})();
