// Logika halaman profil.html: profil dasar (profiles) + data pribadi (member_details)
(function () {
  const STATUS_TEXT = {
    pending: ["info", "Akun Anda menunggu persetujuan Administrator. Menu anggota akan terbuka setelah disetujui."],
    active: ["success", "Akun Anda aktif. Selamat datang di keluarga besar P3DS."],
    rejected: ["error", "Pendaftaran Anda belum dapat disetujui. Silakan hubungi pengurus P3DS."],
    suspended: ["error", "Akun Anda sedang dinonaktifkan. Silakan hubungi pengurus P3DS."],
  };
  const ROLE_TEXT = { member: "Anggota", pengurus: "Pengurus", admin: "Administrator" };

  function show(el, type, text) {
    el.className = "alert alert-" + type;
    el.textContent = text;
    el.classList.remove("is-hidden");
  }

  function emptyToNull(v) {
    const t = String(v ?? "").trim();
    return t === "" ? null : t;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const { db, auth } = window.P3DS;
    const profile = await auth.requireLogin();
    if (!profile) return;

    const form = document.getElementById("form-profil");
    const msg = document.getElementById("msg");
    const statusBox = document.getElementById("status-box");
    const btn = document.getElementById("btn-submit");

    const st = STATUS_TEXT[profile.status] || STATUS_TEXT.pending;
    show(statusBox, st[0], st[1]);
    document.getElementById("info-email").textContent = profile.email || "";
    document.getElementById("info-role").textContent = ROLE_TEXT[profile.role] || profile.role;

    form.full_name.value = profile.full_name || "";
    form.phone.value = profile.phone || "";

    const { data: d } = await db
      .from("member_details")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (d) {
      form.member_number.value = d.member_number || "";
      form.birth_date.value = d.birth_date || "";
      form.address.value = d.address || "";
      form.city.value = d.city || "";
      form.last_unit.value = d.last_unit || "";
      form.retirement_year.value = d.retirement_year || "";
      form.spouse_name.value = d.spouse_name || "";
      form.emergency_contact.value = d.emergency_contact || "";
      form.show_phone_to_members.checked = !!d.show_phone_to_members;
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const fullName = form.full_name.value.trim();
      const phone = emptyToNull(form.phone.value);
      const year = emptyToNull(form.retirement_year.value);

      if (fullName.length < 3 || fullName.length > 100) { show(msg, "error", "Nama lengkap harus 3 sampai 100 huruf."); return; }
      if (phone && !/^[0-9+\-\s]{8,20}$/.test(phone)) { show(msg, "error", "Nomor telepon tidak benar. Gunakan angka, spasi, + atau -."); return; }
      if (year && (!/^[0-9]{4}$/.test(year) || +year < 1950 || +year > 2100)) { show(msg, "error", "Tahun pensiun harus 4 angka antara 1950 dan 2100."); return; }

      btn.disabled = true;
      btn.textContent = "Menyimpan...";

      const r1 = await db.from("profiles").update({ full_name: fullName, phone }).eq("id", profile.id);
      const r2 = await db.from("member_details").upsert(
        {
          profile_id: profile.id,
          member_number: emptyToNull(form.member_number.value),
          birth_date: emptyToNull(form.birth_date.value),
          address: emptyToNull(form.address.value),
          city: emptyToNull(form.city.value),
          last_unit: emptyToNull(form.last_unit.value),
          retirement_year: year ? +year : null,
          spouse_name: emptyToNull(form.spouse_name.value),
          emergency_contact: emptyToNull(form.emergency_contact.value),
          show_phone_to_members: form.show_phone_to_members.checked,
        },
        { onConflict: "profile_id" }
      );

      btn.disabled = false;
      btn.textContent = "Simpan Profil";
      if (r1.error || r2.error) {
        show(msg, "error", "Data belum tersimpan. Silakan coba lagi.");
        return;
      }
      show(msg, "success", "Profil berhasil disimpan.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
})();
