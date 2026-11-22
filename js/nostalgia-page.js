// js/nostalgia-page.js - Logika Interaktif Halaman Album Nostalgia PPDS
(function () {
  const { nostalgia, auth, utils, db } = window.P3DS;

  let currentProfile = null;
  let nostalgiaData = null;
  let activeEra = "";
  let activeLoc = "";
  let searchQuery = "";

  function renderPhotos() {
    const grid = document.getElementById("nostalgia-photo-grid");
    if (!grid) return;

    const allPhotos = (nostalgiaData && nostalgiaData.photos) || [];

    const filtered = allPhotos.filter(function (p) {
      if (activeEra && p.era !== activeEra) return false;
      if (activeLoc && p.location !== activeLoc) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (p.title || "").toLowerCase().includes(q);
        const matchDesc = (p.description || "").toLowerCase().includes(q);
        const matchYear = (p.year || "").toLowerCase().includes(q);
        const matchUploader = (p.uploader_name || "").toLowerCase().includes(q);
        return matchTitle || matchDesc || matchYear || matchUploader;
      }
      return true;
    });

    if (!filtered.length) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 12px;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📜</div>
          <h3 style="color: var(--navy); margin-bottom: 0.35rem;">Belum Ada Foto pada Kategori Ini</h3>
          <p style="color: #64748b; margin: 0; font-size: 0.95rem;">
            Silakan pilih era/lokasi lain atau jadilah yang pertama menyumbang foto kenangan masa dinas.
          </p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(function (p) {
      const isOwner = currentProfile && p.uploader_id === currentProfile.id;
      const isAdmin = currentProfile && (currentProfile.role === "admin" || currentProfile.role === "pengurus");
      const canDelete = isOwner || isAdmin;

      const waShareText = `📜 *[NOSTALGIA PENSIUNAN PPDS]*\n*${p.title}* (${p.year || p.era || "Masa Dinas"})\n📍 Lokasi: ${p.location}\n"${p.description || ""}"\n\nBuka foto kenangan selengkapnya di:\n${window.location.origin}/nostalgia.html`;
      const waShareUrl = `https://wa.me/?text=${encodeURIComponent(waShareText)}`;

      return `
        <div class="nostalgia-card" id="card-${p.id}">
          <div class="nostalgia-img-wrap" data-img="${utils.escapeHtml(p.image_url)}" data-caption="${utils.escapeHtml(p.title)} (${utils.escapeHtml(p.year || p.era)})">
            <img src="${utils.escapeHtml(p.image_url)}" alt="${utils.escapeHtml(p.title)}" class="nostalgia-img" loading="lazy">
            <div class="nostalgia-badges">
              ${p.year ? `<span class="badge-era">🕰️ ${utils.escapeHtml(p.year)}</span>` : (p.era ? `<span class="badge-era">${utils.escapeHtml(p.era)}</span>` : "")}
              ${p.location ? `<span class="badge-loc">📍 ${utils.escapeHtml(p.location)}</span>` : ""}
            </div>
          </div>
          <div class="nostalgia-body">
            <h3 class="nostalgia-title">${utils.escapeHtml(p.title)}</h3>
            <p class="nostalgia-desc">${(utils.autoLink ? utils.autoLink(p.description || "") : utils.escapeHtml(p.description || ""))}</p>
            
            <div class="nostalgia-footer">
              <span>👤 <strong>${utils.escapeHtml(p.uploader_name || "Anggota")}</strong></span>
              <span>${utils.formatDate(p.created_at)}</span>
            </div>

            <div class="nostalgia-actions">
              <a href="${utils.escapeHtml(p.image_url)}" target="_blank" download="${p.title || 'Foto_Nostalgia_PPDS'}.jpg" class="btn-nostalgia-act" title="Unduh Foto Ukuran Asli">
                ⬇️ Unduh
              </a>
              <a href="${waShareUrl}" target="_blank" rel="noopener noreferrer" class="btn-nostalgia-act" style="background:#f0fdf4; color:#166534; border-color:#86efac;" title="Bagikan ke WhatsApp">
                💬 Bagikan
              </a>
              ${canDelete ? `
                <button type="button" class="btn-nostalgia-act btn-delete-photo" data-id="${p.id}" style="background:#fee2e2; color:#b91c1c; border-color:#fca5a5; max-width:40px;" title="Hapus Foto Ini">
                  🗑️
                </button>
              ` : ""}
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Pasang Event Zoom Modal
    grid.querySelectorAll(".nostalgia-img-wrap").forEach(function (wrap) {
      wrap.addEventListener("click", function () {
        openZoom(this.dataset.img, this.dataset.caption);
      });
    });

    // Pasang Event Hapus Foto
    grid.querySelectorAll(".btn-delete-photo").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        const id = this.dataset.id;
        if (!confirm("Apakah Anda yakin ingin menghapus foto kenangan ini?")) return;
        
        const res = await nostalgia.deletePhoto(id, currentProfile);
        if (res.error) {
          alert("Gagal menghapus: " + res.error);
          return;
        }
        nostalgiaData = await nostalgia.getNostalgiaData();
        renderPhotos();
      });
    });
  }

  function openZoom(imgUrl, caption) {
    const modal = document.getElementById("modal-zoom");
    const img = document.getElementById("zoom-img");
    const cap = document.getElementById("zoom-caption");
    if (modal && img) {
      img.src = imgUrl;
      if (cap) cap.textContent = caption || "";
      modal.classList.add("active");
    }
  }

  function setupFilters() {
    // Filter Era Buttons
    document.querySelectorAll("[data-filter-type='era']").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-filter-type='era']").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeEra = btn.dataset.filterVal;
        renderPhotos();
      });
    });

    // Filter Lokasi Select
    const selLoc = document.getElementById("select-filter-loc");
    if (selLoc) {
      selLoc.addEventListener("change", function () {
        activeLoc = selLoc.value;
        renderPhotos();
      });
    }

    // Input Search
    const searchInp = document.getElementById("search-nostalgia");
    if (searchInp) {
      searchInp.addEventListener("input", function () {
        searchQuery = searchInp.value.trim();
        renderPhotos();
      });
    }
  }

  function setupModals() {
    // Zoom modal close
    const modalZoom = document.getElementById("modal-zoom");
    if (modalZoom) {
      modalZoom.addEventListener("click", function () {
        modalZoom.classList.remove("active");
      });
    }

    // Upload modal open/close
    const modalUpload = document.getElementById("modal-upload");
    const btnOpenUpload = document.getElementById("btn-open-upload");
    const btnCloseUpload = document.getElementById("btn-close-upload");
    const btnCancelUpload = document.getElementById("btn-cancel-upload");

    if (btnOpenUpload && modalUpload) {
      btnOpenUpload.addEventListener("click", function () {
        modalUpload.classList.add("active");
      });
    }

    function closeModal() {
      if (modalUpload) modalUpload.classList.remove("active");
    }

    if (btnCloseUpload) btnCloseUpload.addEventListener("click", closeModal);
    if (btnCancelUpload) btnCancelUpload.addEventListener("click", closeModal);

    // Upload Handler ke Supabase Storage
    const fileInput = document.getElementById("input-photo-file");
    const statusText = document.getElementById("upload-status");
    const previewBox = document.getElementById("upload-preview-box");
    const previewImg = document.getElementById("upload-preview-img");
    const urlInput = document.getElementById("input-image-url");
    const btnSubmit = document.getElementById("btn-submit-photo");

    if (fileInput) {
      fileInput.addEventListener("change", async function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
          statusText.textContent = "❌ Ukuran foto maksimal 5 MB.";
          statusText.style.color = "#d93025";
          fileInput.value = "";
          return;
        }

        statusText.textContent = "⏳ Sedang mengunggah foto ke Supabase Storage...";
        statusText.style.color = "var(--navy)";
        btnSubmit.disabled = true;

        try {
          const ext = file.name.split(".").pop().toLowerCase() || "jpg";
          const safeName = "nostalgia_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6) + "." + ext;
          const path = "nostalgia/" + safeName;

          const { error: upErr } = await db.storage
            .from("gallery-public")
            .upload(path, file, { cacheControl: "3600", upsert: true });

          if (upErr) {
            statusText.textContent = "❌ Gagal unggah foto: " + upErr.message;
            statusText.style.color = "#d93025";
            btnSubmit.disabled = false;
            return;
          }

          const { data: urlData } = db.storage.from("gallery-public").getPublicUrl(path);
          const publicUrl = urlData ? urlData.publicUrl : "";

          urlInput.value = publicUrl;
          previewImg.src = publicUrl;
          previewBox.classList.remove("is-hidden");
          statusText.textContent = "✅ Foto berhasil diunggah!";
          statusText.style.color = "#1e8e3e";
          btnSubmit.disabled = false;
        } catch (err) {
          statusText.textContent = "❌ Terjadi kesalahan saat mengunggah foto.";
          statusText.style.color = "#d93025";
          btnSubmit.disabled = false;
        }
      });
    }

    // Submit form upload foto
    const formUpload = document.getElementById("form-upload-nostalgia");
    if (formUpload) {
      formUpload.addEventListener("submit", async function (e) {
        e.preventDefault();

        const imgUrl = urlInput.value.trim();
        if (!imgUrl) {
          alert("Silakan pilih dan unggah foto terlebih dahulu.");
          return;
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = "Menyimpan Kenangan...";

        const photoInput = {
          title: document.getElementById("input-title").value,
          year: document.getElementById("input-year").value,
          era: document.getElementById("input-era").value,
          location: document.getElementById("input-location").value,
          description: document.getElementById("input-description").value,
          image_url: imgUrl
        };

        const res = await nostalgia.addPhoto(photoInput, currentProfile);
        btnSubmit.disabled = false;
        btnSubmit.textContent = "💾 Simpan & Terbitkan Foto";

        if (res.error) {
          alert("Gagal menyimpan: " + res.error);
          return;
        }

        alert("✅ Foto kenangan Anda berhasil diterbitkan di Album Nostalgia!");
        formUpload.reset();
        urlInput.value = "";
        previewBox.classList.add("is-hidden");
        closeModal();

        nostalgiaData = await nostalgia.getNostalgiaData();
        renderPhotos();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", async function () {
    // 1. Muat data profil login
    try {
      currentProfile = await auth.loadProfile();
    } catch (e) {}

    // 2. Muat data album nostalgia
    nostalgiaData = await nostalgia.getNostalgiaData();

    // 3. Cek Otorisasi Pengguna
    const isAuth = nostalgia.isUserAuthorized(currentProfile, nostalgiaData);
    const authBox = document.getElementById("auth-status-box");
    const btnUpload = document.getElementById("btn-open-upload");
    const btnReqAuth = document.getElementById("btn-req-auth-wa");

    if (isAuth) {
      if (btnUpload) btnUpload.classList.remove("is-hidden");
      if (authBox) {
        authBox.innerHTML = `
          <span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-size:0.85rem; padding:0.35rem 0.65rem;">
            ✅ Anda memiliki otorisasi untuk menyumbang foto kenangan
          </span>
        `;
      }
    } else {
      if (btnReqAuth) btnReqAuth.classList.remove("is-hidden");
      if (authBox) {
        authBox.innerHTML = `
          <span class="meta" style="font-size:0.85rem; color:#64748b;">
            🔒 <em>Ingin menyumbang foto dinas tempo dulu? Hubungi Admin via WhatsApp untuk meminta izin kontributor.</em>
          </span>
        `;
      }
    }

    setupFilters();
    setupModals();
    renderPhotos();
  });
})();
