// Modul Administrator: Mengelola pengguna, persetujuan anggota, hak akses, dan statistik
(function () {
  const { db } = window.P3DS;

  // Mengambil daftar seluruh profil + data detail anggota (khusus Admin)
  async function listAllMembers() {
    return db
      .from("profiles")
      .select(`
        id, full_name, email, phone, role, status, created_at,
        member_details (
          member_number, birth_date, city, last_unit, retirement_year
        )
      `)
      .order("created_at", { ascending: false });
  }

  // Menyetujui / mengubah status anggota (active, pending, rejected, suspended)
  async function updateMemberStatus(profileId, newStatus) {
    return db
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", profileId);
  }

  // Mengubah peran pengguna (member, pengurus, admin)
  async function updateMemberRole(profileId, newRole) {
    return db
      .from("profiles")
      .update({ role: newRole })
      .eq("id", profileId);
  }

  // Mengambil statistik ringkasan pengguna
  async function getUserStats() {
    const { data, error } = await db.from("profiles").select("status, role");
    if (error || !data) return { total: 0, pending: 0, active: 0, staff: 0 };

    let pending = 0, active = 0, staff = 0;
    data.forEach(function (u) {
      if (u.status === "pending") pending++;
      if (u.status === "active") active++;
      if (u.role === "pengurus" || u.role === "admin") staff++;
    });

    return { total: data.length, pending, active, staff };
  }

  window.P3DS.admin = {
    listAllMembers,
    updateMemberStatus,
    updateMemberRole,
    getUserStats
  };
})();
