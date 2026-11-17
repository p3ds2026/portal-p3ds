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

  function toAuthEmail(input) {
    if (!input) return "";
    const trimmed = String(input).trim();
    if (trimmed.includes("@")) {
      return trimmed.toLowerCase();
    }
    // Bersihkan karakter spasi, izinkan huruf, angka, titik, strip, dan garis bawah
    // contoh: "ahmad123" -> "ahmad123@ppds.internal"
    let clean = trimmed.replace(/[^0-9a-zA-Z._-]/g, "").toLowerCase();
    return `${clean}@ppds.internal`;
  }

  function friendlyError(error) {
    const msg = (error && error.message) || "";
    if (/invalid login credentials/i.test(msg)) return "UserName atau Password salah. Silakan periksa kembali.";
    if (/email not confirmed/i.test(msg)) return "Akun Anda sedang menunggu persetujuan pengurus PPDS.";
    if (/already registered/i.test(msg)) return "UserName ini sudah pernah terdaftar. Silakan pilih UserName lain atau langsung masuk.";
    if (/rate limit/i.test(msg)) return "Terlalu banyak percobaan. Silakan tunggu beberapa menit lalu coba lagi.";
    if (/password/i.test(msg)) return "Password minimal 6 karakter.";
    return "Terjadi kesalahan. Silakan coba lagi.";
  }

  async function signIn(usernameOrEmail, password) {
    const email = toAuthEmail(usernameOrEmail);
    const { error } = await db.auth.signInWithPassword({ email, password });
    return { error: error ? friendlyError(error) : null };
  }

  async function signUp(fullName, username, password) {
    const rawUsername = String(username).trim();
    const email = toAuthEmail(rawUsername);
    const { error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: rawUsername
        }
      },
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
    const navBtn = document.getElementById("nav-btn-login");
    const bottomNavUser = document.getElementById("bottom-nav-user");

    if (profile) {
      // Sesi Aktif (Sudah Login): Tampilkan tombol Keluar / Log Off
      if (btn) {
        btn.textContent = "🚪 Keluar";
        btn.classList.add("btn-logout");
        btn.setAttribute("title", "Keluar dari Akun (Log Off)");
        btn.setAttribute("href", "#");
        btn.onclick = function (e) {
          e.preventDefault();
          if (confirm("Apakah Anda yakin ingin keluar dari akun (Log Off)?")) signOut();
        };
      }
      if (navBtn) {
        navBtn.textContent = "🚪 Keluar / Log Off (" + (profile.full_name || profile.nama_lengkap || "Akun") + ")";
        navBtn.setAttribute("href", "#");
        navBtn.onclick = function (e) {
          e.preventDefault();
          if (confirm("Apakah Anda yakin ingin keluar dari akun (Log Off)?")) signOut();
        };
      }
      if (bottomNavUser) {
        bottomNavUser.setAttribute("href", "profil.html");
        const icon = bottomNavUser.querySelector(".bottom-nav-icon");
        const label = bottomNavUser.querySelector(".bottom-nav-label");
        if (icon) icon.textContent = "👤";
        if (label) label.textContent = "Profil";
      }

      // Tombol Logout di halaman profil
      const btnLogoutProfil = document.getElementById("btn-logout-profil");
      if (btnLogoutProfil) {
        btnLogoutProfil.onclick = function (e) {
          e.preventDefault();
          if (confirm("Apakah Anda yakin ingin keluar dari akun (Log Off)?")) signOut();
        };
      }
    } else {
      // Belum Login: Tampilkan tombol Masuk (Login)
      if (btn) {
        btn.textContent = "🔑 Masuk";
        btn.classList.remove("btn-logout");
        btn.setAttribute("href", "login.html");
      }
      if (navBtn) {
        navBtn.textContent = "🔑 Masuk ke Akun (Login)";
        navBtn.setAttribute("href", "login.html");
      }
      if (bottomNavUser) {
        bottomNavUser.setAttribute("href", "login.html");
        const icon = bottomNavUser.querySelector(".bottom-nav-icon");
        const label = bottomNavUser.querySelector(".bottom-nav-label");
        if (icon) icon.textContent = "🔑";
        if (label) label.textContent = "Masuk";
      }
    }

    if (!profile) return;
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
