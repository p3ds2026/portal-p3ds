// Logika halaman login.html dan daftar.html
(function () {
  function showMessage(el, type, text) {
    el.className = "alert alert-" + type;
    el.textContent = text;
    el.classList.remove("is-hidden");
  }

  function setupLogin() {
    const form = document.getElementById("form-login");
    if (!form) return;
    const msg = document.getElementById("msg");
    const btn = document.getElementById("btn-submit");

    // Jika sudah login, langsung ke profil
    window.P3DS.auth.loadProfile().then(function (p) {
      if (p) window.location.href = "profil.html";
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const usernameInput = form.username || form.email || form.identifier;
      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = form.password.value;
      if (!username || !password) { showMessage(msg, "error", "UserName dan password wajib diisi."); return; }
      btn.disabled = true;
      btn.textContent = "Memproses...";
      const { error } = await window.P3DS.auth.signIn(username, password);
      if (error) {
        showMessage(msg, "error", error);
        btn.disabled = false;
        btn.textContent = "Masuk ke Akun";
        return;
      }
      window.location.href = "profil.html";
    });
  }

  function setupRegister() {
    const form = document.getElementById("form-daftar");
    if (!form) return;
    const msg = document.getElementById("msg");
    const btn = document.getElementById("btn-submit");

    // Jika sudah login, langsung ke profil (tidak perlu daftar lagi)
    window.P3DS.auth.loadProfile().then(function (p) {
      if (p) window.location.href = "profil.html";
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const fullName = form.full_name.value.trim();
      const usernameInput = form.username || form.phone_or_id || form.email;
      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = form.password.value;
      const password2 = form.password2.value;

      if (fullName.length < 3 || fullName.length > 100) { showMessage(msg, "error", "Nama lengkap harus 3 sampai 100 huruf."); return; }
      if (username.length < 3 || username.length > 50) { showMessage(msg, "error", "UserName minimal 3 karakter (huruf atau angka)."); return; }
      if (/\s/.test(username)) { showMessage(msg, "error", "UserName tidak boleh ada spasi (contoh: ahmad123 atau no. pensiun)."); return; }
      if (password.length < 6) { showMessage(msg, "error", "Password minimal 6 karakter."); return; }
      if (password !== password2) { showMessage(msg, "error", "Ulangi password tidak sama."); return; }

      btn.disabled = true;
      btn.textContent = "Mendaftarkan...";
      const { error } = await window.P3DS.auth.signUp(fullName, username, password);
      if (error) {
        showMessage(msg, "error", error);
        btn.disabled = false;
        btn.textContent = "Daftar Sekarang";
        return;
      }
      form.classList.add("is-hidden");
      showMessage(msg, "success",
        "✅ Pendaftaran berhasil! Akun Anda telah terdaftar dan menunggu persetujuan Pengurus PPDS. " +
        "Setelah disetujui, Anda dapat langsung masuk menggunakan UserName (" + username + ") dan Password Anda.");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupLogin();
    setupRegister();
  });
})();
