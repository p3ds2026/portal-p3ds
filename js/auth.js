// Modul Autentikasi: login, daftar, keluar, dan pengaturan menu sesuai peran.
(function () {
  const { db } = window.P3DS;
  let profilePromise = null;

  async function getSession() {
    const { data } = await db.auth.getSession();
    return data.session;
  }

  // Mengambil profil pengguna yang sedang login (null jika belum login)
  function loadProfile() {
    if (!profilePromise) {
      profilePromise = (async () => {
        const session = await getSession();
        if (!session) return null;
        const { data, error } = await db
          .from("profiles")
          .select("id, full_name, email, phone, avatar_url, role, status")
          .eq("id", session.user.id)
          .single();
        return error ? null : data;
      })();
    }
    return profilePromise;
  }

  function friendlyError(error) {
    const msg = (error && error.message) || "";
    if (/invalid login credentials/i.test(msg)) return "Email atau password salah.";
    if (/email not confirmed/i.test(msg)) return "Email Anda belum dikonfirmasi. Silakan buka email dan klik tautan konfirmasi.";
    if (/already registered/i.test(msg)) return "Email ini sudah terdaftar. Silakan masuk.";
    if (/rate limit/i.test(msg)) return "Terlalu banyak percobaan. Silakan tunggu beberapa menit lalu coba lagi.";
    if (/password/i.test(msg)) return "Password tidak memenuhi syarat (minimal 8 karakter).";
    return "Terjadi kesalahan. Silakan coba lagi.";
  }

  async function signIn(email, password) {
    const { error } = await db.auth.signInWithPassword({ email, password });
    return { error: error ? friendlyError(error) : null };
  }

  async function signUp(fullName, email, password) {
    const { error } = await db.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error ? friendlyError(error) : null };
  }

  async function signOut() {
    await db.auth.signOut();
    window.location.href = "index.html";
  }

  // Wajib login. Jika belum, arahkan ke halaman login.
  async function requireLogin() {
    const profile = await loadProfile();
    if (!profile) {
      window.location.href = "login.html";
      return null;
    }
    return profile;
  }

  // Menyesuaikan tombol Masuk/Keluar dan menu sesuai peran
  function applyAccess(profile) {
    const btn = document.getElementById("btn-login");
    if (!profile) return;
    if (btn) {
      btn.textContent = "Keluar";
      btn.setAttribute("href", "#");
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        signOut();
      });
    }
    const active = profile.status === "active";
    document.querySelectorAll("li[data-access]").forEach(function (li) {
      const need = li.dataset.access;
      let show = false;
      if (need === "member") show = active;
      if (need === "admin") show = active && profile.role === "admin";
      // Profil boleh dilihat anggota yang masih menunggu persetujuan
      if (need === "member" && li.textContent.includes("Profil Anggota")) show = true;
      if (show) li.classList.remove("is-hidden");
    });
    // Tombol khusus pengurus/admin (mis. "Kelola Berita")
    const staff = active && (profile.role === "pengurus" || profile.role === "admin");
    document.querySelectorAll("[data-staff-only]").forEach(function (el) {
      if (staff) el.classList.remove("is-hidden");
    });
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const profile = await loadProfile();
    applyAccess(profile);
  });

  window.P3DS.auth = { getSession, loadProfile, signIn, signUp, signOut, requireLogin };
})();
