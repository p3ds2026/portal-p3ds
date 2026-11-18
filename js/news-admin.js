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
    
    const isAdminOrPengurus = profile && (profile.role === "admin" || profile.role === "pengurus");

    body.innerHTML = rows.map(function (r) {
      // Korwil hanya berhak ubah/hapus berita miliknya sendiri. Admin & Pengurus berhak atas semua.
      const isOwner = profile && r.author_id && r.author_id === profile.id;
      const canManage = isAdminOrPengurus || isOwner;

      return `<tr>
        <td>${utils.escapeHtml(r.title)}</td>
        <td>${utils.escapeHtml(r.category)}</td>
        <td><span class="badge">${r.status === "published" ? "Terbit" : "Draft"}</span>${r.visibility === "member" ? '<span class="badge">Anggota</span>' : ""}</td>
        <td>${utils.formatDate(r.published_at || r.created_at)}</td>
        <td class="actions">
          ${canManage ? `
            <button class="btn btn-small" data-act="edit" data-id="${utils.escapeHtml(r.id)}" type="button">Ubah</button>
            <button class="btn btn-small btn-danger" data-act="del" data-id="${utils.escapeHtml(r.id)}" type="button">Hapus</button>
          ` : `
            <span class="meta" style="font-size:0.78rem; color:#64748b; background:#f1f5f9; padding:0.25rem 0.5rem; border-radius:4px; display:inline-block;" title="Berita ini ditulis oleh Pengurus atau Korwil lain">🔒 Milik Penulis Lain</span>
          `}
        </td>
      </tr>`;
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", async function () {
    profile = await auth.requireLogin();
    if (!profile) return;

    const denied = document.getElementById("denied");
    const panel = document.getElementById("panel");
    const isKorwil = profile.role === "korwil" || (window.P3DS.korwil && window.P3DS.korwil.isUserKorwilSync && window.P3DS.korwil.isUserKorwilSync(profile.id));
    const isStaff = profile.status === "active" && (profile.role === "pengurus" || profile.role === "admin" || profile.role === "korwil" || isKorwil);
    if (!isStaff) { denied.classList.remove("is-hidden"); return; }
    panel.classList.remove("is-hidden");

    // Inisialisasi Pilihan Wilayah (Korwil)
    const selWilayahTag = document.getElementById("wilayah_tag");
    let userAssignedWilayah = null;
    if (window.P3DS.korwil) {
      userAssignedWilayah = await window.P3DS.korwil.getKorwilAssignment(profile.id);
      const allRegions = await window.P3DS.korwil.getRegions();
      if (selWilayahTag) {
        selWilayahTag.innerHTML = '<option value="">-- Umum / Semua Wilayah --</option>' +
          allRegions.map(r => `<option value="${utils.escapeHtml(r)}">📍 ${utils.escapeHtml(r)}</option>`).join("");
        if (userAssignedWilayah) {
          selWilayahTag.value = userAssignedWilayah;
        }
      }
    }

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

    // Template Otomatis Kabar Duka Cita PPDS
    const selCategory = form.category;
    const dukaHint = document.getElementById("duka-template-hint");
    const btnLoadDuka = document.getElementById("btn-load-duka-template");

    if (selCategory && dukaHint) {
      function checkCatDuka() {
        if (selCategory.value === "duka") {
          dukaHint.classList.remove("is-hidden");
        } else {
          dukaHint.classList.add("is-hidden");
        }
      }
      selCategory.addEventListener("change", checkCatDuka);
      checkCatDuka();
    }

    if (btnLoadDuka) {
      btnLoadDuka.addEventListener("click", function () {
        if (!form.title.value || form.title.value.trim() === "") {
          form.title.value = "Kabar Duka Cita: Telah Berpulang Bapak/Ibu [Nama]";
        }
        form.summary.value = "Inna lillahi wa inna ilaihi raji'un. Telah berpulang ke rahmatullah rekan/saudara kita tercinta keluarga besar Pensiunan Pertamina Dumai – Sei Pakning.";
        form.content.value = `Inna lillahi wa inna ilaihi raji'un.

Telah berpulang ke rahmatullah, rekan/saudara kita tercinta:
*Nama:* Bapak/Ibu [Nama Lengkap]
*Masa Dinas Terakhir:* [Unit Kerja, contoh: Kilang Dumai / Sei Pakning]
*Pensiun Tahun:* [Tahun]
*Wafat Pada:* [Hari, Tanggal, Jam]

*Alamat Rumah Duka:*
[Jl. ..., No. ..., RT/RW, Kota/Kabupaten]

*Rencana Pemakaman:*
- Hari/Tanggal: [Hari, Tanggal]
- Waktu: [Ba'da Dzuhur / Jam ...]
- Tempat Pemakaman: [TPU ...]

Keluarga Besar Pensiunan Pertamina Dumai – Sei Pakning (PPDS) turut berbelasungkawa yang sedalam-dalamnya. Semoga almarhum/almarhumah husnul khotimah, diampuni segala dosa dan kekhilafannya, serta keluarga yang ditinggalkan diberikan ketabahan dan keikhlasan. Aamiin ya Rabbal 'alamin.`;
        form.content.focus();
        show(msg, "success", "📋 Format kabar duka cita berhasil disisipkan. Silakan lengkapi nama, tanggal, dan alamat rumah duka.");
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

      const isAdminOrPengurus = profile && (profile.role === "admin" || profile.role === "pengurus");
      const isOwner = profile && row.author_id && row.author_id === profile.id;

      if (!isAdminOrPengurus && !isOwner) {
        show(msg, "error", "Anda hanya berhak mengelola berita yang Anda tulis sendiri.");
        return;
      }

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
      const rawTitle = form.title.value.trim();
      const content = form.content.value.trim();
      const summary = emptyToNull(form.summary.value);
      const cover = emptyToNull(form.cover_url.value);

      if (rawTitle.length < 3 || rawTitle.length > 200) { show(msg, "error", "Judul harus 3 sampai 200 huruf."); return; }
      if (content.length < 10) { show(msg, "error", "Isi berita terlalu pendek."); return; }
      if (summary && summary.length > 500) { show(msg, "error", "Ringkasan maksimal 500 huruf."); return; }
      if (cover && !cover.startsWith("https://")) { show(msg, "error", "Alamat gambar harus diawali https://"); return; }

      const id = form.id.value;
      const isAdminOrPengurus = profile && (profile.role === "admin" || profile.role === "pengurus");

      if (id) {
        const existing = rows.find(function (r) { return r.id === id; });
        if (existing && !isAdminOrPengurus && existing.author_id && existing.author_id !== profile.id) {
          show(msg, "error", "Anda tidak berhak mengubah berita milik orang lain.");
          return;
        }
      }

      // Tambahkan tag wilayah ke judul jika wilayah dipilih dan belum ada di judul
      const chosenWilayah = selWilayahTag ? selWilayahTag.value : "";
      let title = rawTitle;
      if (chosenWilayah && !title.toLowerCase().includes(chosenWilayah.toLowerCase())) {
        title = `[${chosenWilayah}] ${rawTitle}`;
      }

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
      const res = id ? await news.update(id, values) : await news.create(values, profile.id);
      const error = res.error;
      btn.disabled = false;
      btn.textContent = "💾 Simpan & Terbitkan";

      if (error) { show(msg, "error", "Berita gagal disimpan. Pastikan Anda berstatus pengurus/korwil/admin aktif."); return; }
      show(msg, "success", id ? "Berita berhasil diperbarui." : "Berita berhasil disimpan.");

      // Kirim Notifikasi Otomatis ke Layar HP jika opsi dicentang dan status diterbitkan
      if (values.status === "published" && form.send_push_notif && form.send_push_notif.checked) {
        const isDuka = values.category === "duka";
        const notifTitle = isDuka 
          ? "🖤 KABAR DUKA CITA PPDS" 
          : (chosenWilayah ? `📢 KABAR KORWIL ${chosenWilayah.toUpperCase()}` : "📢 PENGUMUMAN RESMI PPDS");
        const notifBody = values.title + (values.summary ? "\n" + values.summary : "");
        const targetId = id || (res.data && res.data.id);
        if (window.P3DS && window.P3DS.sendNotification) {
          window.P3DS.sendNotification(notifTitle, notifBody, targetId ? `/berita.html?id=${targetId}` : "/berita.html");
        }
      }

      resetForm(form);
      loadTable();
    });

    // Tombol Uji Coba Notifikasi Layar HP
    const btnTestAdmin = document.getElementById("btn-test-notif-admin");
    if (btnTestAdmin) {
      btnTestAdmin.addEventListener("click", async function () {
        if (!("Notification" in window)) {
          alert("Browser ini belum mendukung fitur Notifikasi.");
          return;
        }

        if (Notification.permission !== "granted") {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") {
            alert("Izin notifikasi belum diaktifkan di browser HP Anda.");
            return;
          }
        }

        if (window.P3DS && window.P3DS.sendNotification) {
          window.P3DS.sendNotification(
            "🔔 TES NOTIFIKASI PORTAL PPDS",
            "Selamat! Notifikasi otomatis di layar HP Anda telah berfungsi sempurna.",
            "/berita.html"
          );
        }
      });
    }

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
