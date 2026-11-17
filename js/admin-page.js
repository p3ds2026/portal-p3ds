// Logika Halaman Administrator & Kelola Wilayah Korwil
(function () {
  const { admin, auth, utils, korwil } = window.P3DS;
  let membersList = [];
  let currentFilter = "all";
  let korwilSettings = { regions: [], assignments: {} };

  function showMsg(type, text) {
    const el = document.getElementById("admin-msg");
    if (!el) return;
    el.className = "alert alert-" + type;
    el.textContent = text;
    el.classList.remove("is-hidden");
    setTimeout(() => { el.classList.add("is-hidden"); }, 5000);
  }

  function showWilayahMsg(type, text) {
    const el = document.getElementById("wilayah-msg");
    if (!el) return;
    el.className = "alert alert-" + type;
    el.textContent = text;
    el.classList.remove("is-hidden");
    setTimeout(() => { el.classList.add("is-hidden"); }, 4000);
  }

  async function refreshStats() {
    const stats = await admin.getUserStats();
    document.getElementById("stat-total-users").textContent = stats.total;
    document.getElementById("stat-pending-users").textContent = stats.pending;
    document.getElementById("stat-active-users").textContent = stats.active;
    document.getElementById("stat-staff-users").textContent = stats.staff;
  }

  function renderWilayahTags() {
    const badge = document.getElementById("wilayah-count-badge");
    const container = document.getElementById("list-wilayah-tags");
    if (!container) return;

    const regions = korwilSettings.regions || [];
    if (badge) badge.textContent = regions.length + " Wilayah";

    if (!regions.length) {
      container.innerHTML = '<span class="meta">Belum ada wilayah. Silakan ketik nama wilayah di atas dan klik "Tambah Wilayah".</span>';
      return;
    }

    container.innerHTML = regions.map(function (r) {
      return `
        <span class="badge" style="background:#e2e8f0; color:#1e293b; padding:0.4rem 0.65rem; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.4rem; border-radius:6px;">
          📍 <strong>${utils.escapeHtml(r)}</strong>
          <button type="button" data-act="del-wilayah" data-val="${utils.escapeHtml(r)}" style="background:none; border:none; color:#ef4444; font-weight:bold; cursor:pointer; padding:0 2px; font-size:0.9rem;" title="Hapus wilayah ini">✕</button>
        </span>
      `;
    }).join("");
  }

  function renderTable() {
    const tbody = document.getElementById("members-table-body");
    const regions = korwilSettings.regions || [];
    const assignments = korwilSettings.assignments || {};

    const filtered = membersList.filter(function (m) {
      const assignedRegion = assignments[m.id] ? assignments[m.id].region : null;
      const isKorwil = m.role === "korwil" || !!assignedRegion;

      if (currentFilter === "all") return true;
      if (currentFilter === "pending") return m.status === "pending";
      if (currentFilter === "active") return m.status === "active";
      if (currentFilter === "korwil") return isKorwil;
      if (currentFilter === "staff") return m.role === "pengurus" || m.role === "admin" || isKorwil;
      return true;
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada data anggota pada kategori ini.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(function (m) {
      const details = (m.member_details && m.member_details[0]) || m.member_details || {};
      const statusClass = m.status === "active" ? "badge-success" : (m.status === "pending" ? "badge-warn" : "badge-danger");
      
      const assignedRegion = assignments[m.id] ? assignments[m.id].region : null;
      const isKorwil = m.role === "korwil" || !!assignedRegion;

      return `
        <tr>
          <td>
            <strong>${utils.escapeHtml(m.full_name || "Tanpa Nama")}</strong><br>
            <small class="meta">${m.email && m.email.endsWith("@ppds.internal") ? ("User: " + utils.escapeHtml(m.email.replace("@ppds.internal", ""))) : utils.escapeHtml(m.email || "-")}</small><br>
            <small class="meta">HP: ${utils.escapeHtml(m.phone || "-")}</small>
          </td>
          <td>
            No: ${utils.escapeHtml(details.member_number || "-")}<br>
            <small class="meta">Kota: ${utils.escapeHtml(details.city || "-")}</small><br>
            <small class="meta">Unit: ${utils.escapeHtml(details.last_unit || "-")} (${details.retirement_year || "-"})</small>
          </td>
          <td style="min-width: 170px;">
            <select class="form-select-sm" data-action="role" data-id="${m.id}" style="width:100%;">
              <option value="member" ${m.role === "member" && !isKorwil ? "selected" : ""}>Anggota</option>
              <option value="korwil" ${isKorwil ? "selected" : ""}>⭐ Korwil</option>
              <option value="pengurus" ${m.role === "pengurus" && !isKorwil ? "selected" : ""}>Pengurus</option>
              <option value="admin" ${m.role === "admin" ? "selected" : ""}>Admin</option>
            </select>
            ${isKorwil ? `
              <div style="margin-top: 6px;">
                <select class="form-select-sm" data-action="set-wilayah" data-id="${m.id}" style="font-size:0.8rem; background:#fffbe6; border-color:#d4af37; width:100%;" title="Pilih Wilayah Penugasan Korwil">
                  <option value="">-- Pilih Wilayah --</option>
                  ${regions.map(r => `<option value="${utils.escapeHtml(r)}" ${assignedRegion === r ? "selected" : ""}>📍 ${utils.escapeHtml(r)}</option>`).join("")}
                </select>
              </div>
            ` : ""}
          </td>
          <td>
            <span class="badge ${statusClass}">${m.status.toUpperCase()}</span>
          </td>
          <td>
            ${utils.formatDate(m.created_at)}
          </td>
          <td class="actions">
            ${m.status === "pending" ? `
              <button class="btn btn-small btn-success" data-action="status" data-id="${m.id}" data-val="active" type="button">Setujui</button>
              <button class="btn btn-small btn-danger" data-action="status" data-id="${m.id}" data-val="rejected" type="button">Tolak</button>
            ` : ""}
            ${m.status === "active" ? `
              <button class="btn btn-small btn-outline-dark" data-action="status" data-id="${m.id}" data-val="suspended" type="button">Nonaktifkan</button>
            ` : ""}
            ${m.status === "suspended" || m.status === "rejected" ? `
              <button class="btn btn-small btn-success" data-action="status" data-id="${m.id}" data-val="active" type="button">Aktifkan</button>
            ` : ""}
          </td>
        </tr>
      `;
    }).join("");
  }

  async function loadData() {
    const tbody = document.getElementById("members-table-body");
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Memuat daftar anggota...</td></tr>';
    
    await refreshStats();
    if (korwil) {
      korwilSettings = await korwil.getKorwilSettings();
      renderWilayahTags();
    }

    const { data, error } = await admin.listAllMembers();
    if (error) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Gagal memuat data anggota.</td></tr>';
      return;
    }

    membersList = data || [];
    renderTable();
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const profile = await auth.requireLogin();
    if (!profile) return;

    if (profile.role !== "admin" || profile.status !== "active") {
      document.getElementById("denied").classList.remove("is-hidden");
      return;
    }

    document.getElementById("admin-content").classList.remove("is-hidden");

    // Toggle Box Wilayah Editor
    const btnToggleWilayah = document.getElementById("btn-toggle-wilayah");
    const boxWilayahEditor = document.getElementById("box-wilayah-editor");
    if (btnToggleWilayah && boxWilayahEditor) {
      btnToggleWilayah.addEventListener("click", function () {
        boxWilayahEditor.classList.toggle("is-hidden");
      });
    }

    // Form Tambah Wilayah Baru
    const formWilayah = document.getElementById("form-wilayah");
    const inputWilayah = document.getElementById("input-nama-wilayah");
    if (formWilayah && inputWilayah) {
      formWilayah.addEventListener("submit", async function (e) {
        e.preventDefault();
        const nama = inputWilayah.value.trim();
        if (!nama) return;

        const res = await korwil.addRegion(nama);
        if (res.error) {
          showWilayahMsg("error", res.error);
          return;
        }

        inputWilayah.value = "";
        korwilSettings = await korwil.getKorwilSettings();
        renderWilayahTags();
        renderTable();
        showWilayahMsg("success", `Wilayah "${nama}" berhasil ditambahkan.`);
      });
    }

    // Tombol Reset Wilayah ke Standar PPDS
    const btnResetWilayah = document.getElementById("btn-reset-wilayah");
    if (btnResetWilayah) {
      btnResetWilayah.addEventListener("click", async function () {
        if (!confirm("Apakah Anda yakin ingin mengatur ulang daftar wilayah ke daftar standar PPDS?")) return;
        await korwil.resetRegionsToDefault();
        korwilSettings = await korwil.getKorwilSettings();
        renderWilayahTags();
        renderTable();
        showWilayahMsg("success", "Daftar wilayah berhasil dikembalikan ke standar PPDS.");
      });
    }

    // Hapus Wilayah dari Tag (Event Delegation)
    const listWilayahTags = document.getElementById("list-wilayah-tags");
    if (listWilayahTags) {
      listWilayahTags.addEventListener("click", async function (e) {
        const btnDel = e.target.closest("button[data-act='del-wilayah']");
        if (!btnDel) return;
        const regionName = btnDel.dataset.val;
        if (!confirm(`Hapus wilayah "${regionName}" dari daftar PPDS?`)) return;

        await korwil.removeRegion(regionName);
        korwilSettings = await korwil.getKorwilSettings();
        renderWilayahTags();
        renderTable();
        showWilayahMsg("success", `Wilayah "${regionName}" telah dihapus.`);
      });
    }

    // Filter status
    document.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderTable();
      });
    });

    // Delegasi aksi tabel (status & role)
    document.getElementById("members-table-body").addEventListener("click", async function (e) {
      const btn = e.target.closest("button[data-action='status']");
      if (!btn) return;

      const profileId = btn.dataset.id;
      const newStatus = btn.dataset.val;
      btn.disabled = true;

      const { error } = await admin.updateMemberStatus(profileId, newStatus);
      if (error) {
        showMsg("error", "Gagal memperbarui status anggota.");
        btn.disabled = false;
        return;
      }

      showMsg("success", "Status anggota berhasil diperbarui menjadi: " + newStatus);
      await loadData();
    });

    document.getElementById("members-table-body").addEventListener("change", async function (e) {
      // Perubahan Peran (Role)
      const selRole = e.target.closest("select[data-action='role']");
      if (selRole) {
        const profileId = selRole.dataset.id;
        const newRole = selRole.value;
        selRole.disabled = true;

        if (newRole === "korwil") {
          // Jadikan Korwil: coba update role di profiles, jika database belum ada enum korwil, fallback ke pengurus
          let updateErr = null;
          const r1 = await admin.updateMemberRole(profileId, "korwil");
          if (r1.error) {
            // Fallback ke pengurus jika ada constraint PostgreSQL
            const r2 = await admin.updateMemberRole(profileId, "pengurus");
            updateErr = r2.error;
          }
          if (updateErr) {
            showMsg("error", "Gagal memperbarui peran anggota: " + updateErr.message);
            selRole.disabled = false;
            return;
          }

          // Pasangkan ke wilayah pertama jika belum ada
          const currentAssignment = korwilSettings.assignments && korwilSettings.assignments[profileId];
          if (!currentAssignment || !currentAssignment.region) {
            const firstRegion = (korwilSettings.regions && korwilSettings.regions[0]) || "Dumai Kota";
            await korwil.assignKorwil(profileId, firstRegion);
          }
          showMsg("success", "Anggota berhasil diangkat sebagai ⭐ Korwil.");
        } else {
          // Peran selain Korwil: lepas penugasan korwil
          await korwil.assignKorwil(profileId, null);
          const { error } = await admin.updateMemberRole(profileId, newRole);
          if (error) {
            showMsg("error", "Gagal memperbarui peran anggota: " + error.message);
            selRole.disabled = false;
            return;
          }
          showMsg("success", "Peran pengguna berhasil diperbarui menjadi: " + newRole);
        }

        korwilSettings = await korwil.getKorwilSettings();
        await loadData();
        return;
      }

      // Perubahan Wilayah Tugas Korwil
      const selWilayah = e.target.closest("select[data-action='set-wilayah']");
      if (selWilayah) {
        const profileId = selWilayah.dataset.id;
        const newRegion = selWilayah.value;
        selWilayah.disabled = true;

        await korwil.assignKorwil(profileId, newRegion);
        korwilSettings = await korwil.getKorwilSettings();
        showMsg("success", "Wilayah tugas Korwil berhasil diperbarui menjadi: " + (newRegion || "(Belum Ditentukan)"));
        selWilayah.disabled = false;
      }
    });

    loadData();
  });
})();
