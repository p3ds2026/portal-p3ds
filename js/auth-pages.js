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
      const email = form.email.value.trim();
      const password = form.password.value;
      if (!email || !password) { showMessage(msg, "error", "Email dan password wajib diisi."); return; }
      btn.disabled = true;
      btn.textContent = "Memproses...";
      const { error } = await window.P3DS.auth.signIn(email, password);
      if (error) {
        showMessage(msg, "error", error);
        btn.disabled = false;
        btn.textContent = "Masuk";
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

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const fullName = form.full_name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      const password2 = form.password2.value;

      if (fullName.length < 3 || fullName.length > 100) { showMessage(msg, "error", "Nama lengkap harus 3 sampai 100 huruf."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showMessage(msg, "error", "Format email tidak benar."); return; }
      if (password.length < 8) { showMessage(msg, "error", "Password minimal 8 karakter."); return; }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) { showMessage(msg, "error", "Password harus campuran huruf dan angka."); return; }
      if (password !== password2) { showMessage(msg, "error", "Ulangi password tidak sama."); return; }

      btn.disabled = true;
      btn.textContent = "Memproses...";
      const { error } = await window.P3DS.auth.signUp(fullName, email, password);
      if (error) {
        showMessage(msg, "error", error);
        btn.disabled = false;
        btn.textContent = "Daftar";
        return;
      }
      form.classList.add("is-hidden");
      showMessage(msg, "success",
        "Pendaftaran berhasil. Silakan buka email Anda dan klik tautan konfirmasi. " +
        "Setelah itu, akun Anda menunggu persetujuan Administrator PPDS.");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupLogin();
    setupRegister();
  });
})();
