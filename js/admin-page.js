// Logika Halaman Administrator
(function () {
  const { admin, auth, utils } = window.P3DS;
  let membersList = [];
  let currentFilter = "all";

  function showMsg(type, text) {
    const el = document.getElementById("admin-msg");
    el.className = "alert alert-" + type;
    el.textContent = text;
    el.classList.remove("is-hidden");
    setTimeout(() => { el.classList.add("is-hidden"); }, 5000);
  }

  async function refreshStats() {
    const stats = await admin.getUserStats();
    document.getElementById("stat-total-users").textContent = stats.total;
    document.getElementById("stat-pending-users").textContent = stats.pending;
    document.getElementById("stat-active-users").textContent = stats.active;
    document.getElementById("stat-staff-users").textContent = stats.staff;
  }

  function renderTable() {
    const tbody = document.getElementById("members-table-body");
    const filtered = membersList.filter(function (m) {
      if (currentFilter === "all") return true;
      if (currentFilter === "pending") return m.status === "pending";
      if (currentFilter === "active") return m.status === "active";
      if (currentFilter === "staff") return m.role === "pengurus" || m.role === "admin";
      return true;
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">Tidak ada data anggota pada kategori ini.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(function (m) {
      const details = (m.member_details && m.member_details[0]) || m.member_details || {};
      const statusClass = m.status === "active" ? "badge-success" : (m.status === "pending" ? "badge-warn" : "badge-danger");
      
      return `
        <tr>
          <td>
            <strong>${utils.escapeHtml(m.full_name || "Tanpa Nama")}</strong><br>
            <small class="meta">${utils.escapeHtml(m.email || "-")}</small><br>
            <small class="meta">HP: ${utils.escapeHtml(m.phone || "-")}</small>
          </td>
          <td>
            No: ${utils.escapeHtml(details.member_number || "-")}<br>
            <small class="meta">Kota: ${utils.escapeHtml(details.city || "-")}</small><br>
            <small class="meta">Unit: ${utils.escapeHtml(details.last_unit || "-")} (${details.retirement_year || "-"})</small>
          </td>
          <td>
            <select class="form-select-sm" data-action="role" data-id="${m.id}">
              <option value="member" ${m.role === "member" ? "selected" : ""}>Anggota</option>
              <option value="pengurus" ${m.role === "pengurus" ? "selected" : ""}>Pengurus</option>
              <option value="admin" ${m.role === "admin" ? "selected" : ""}>Admin</option>
            </select>
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
      const sel = e.target.closest("select[data-action='role']");
      if (!sel) return;

      const profileId = sel.dataset.id;
      const newRole = sel.value;
      sel.disabled = true;

      const { error } = await admin.updateMemberRole(profileId, newRole);
      if (error) {
        showMsg("error", "Gagal memperbarui peran anggota.");
        sel.disabled = false;
        return;
      }

      showMsg("success", "Peran pengguna berhasil diperbarui menjadi: " + newRole);
      await loadData();
    });

    loadData();
  });
})();
