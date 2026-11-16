// Header, menu navigasi, dan footer. Dipakai bersama oleh semua halaman.
(function () {
  // data-access: kosong = semua orang; member = khusus anggota; admin = khusus admin.
  // Menu khusus anggota/admin disembunyikan dulu; modul login (Tahap 6) yang menampilkannya.
  const MENU = [
    { label: "Beranda", href: "index.html", page: "beranda" },
    { label: "Berita & Pengumuman", href: "berita.html", page: "berita" },
    { label: "Agenda Kegiatan", href: "agenda.html", page: "agenda" },
    { label: "Galeri Foto & Video", href: "galeri.html", page: "galeri" },
    { label: "Kegiatan Sosial", href: "kegiatan-sosial.html", page: "sosial" },
    { label: "Ruang Silaturahmi", href: "silaturahmi.html", page: "silaturahmi", access: "member" },
    { label: "Profil Anggota", href: "profil.html", page: "profil", access: "member" },
    { label: "Notifikasi", href: "notifikasi.html", page: "notifikasi", access: "member" },
    { label: "Administrator", href: "admin.html", page: "admin", access: "admin" },
  ];

  function renderHeader(activePage) {
    const items = MENU.map((m) => {
      const hidden = m.access ? ' class="is-hidden"' : "";
      const active = m.page === activePage ? ' class="active"' : "";
      return `<li data-access="${m.access || ""}"${hidden}><a href="${m.href}"${active}>${m.label}</a></li>`;
    }).join("");

    return `
      <div class="container header-top">
        <a class="brand" href="index.html">
          <span class="brand-logo">P3DS</span>
          <span>
            <span class="brand-name">PORTAL P3DS</span>
            <span class="brand-sub">Paguyuban Pensiunan Pertamina Dumai – Sei Pakning</span>
          </span>
        </a>
        <div class="header-actions">
          <a id="btn-login" class="btn btn-small" href="login.html">Masuk</a>
          <button id="menu-toggle" class="menu-toggle" type="button" aria-label="Buka menu">☰ Menu</button>
        </div>
      </div>
      <nav id="main-nav" class="main-nav" aria-label="Menu utama">
        <div class="container"><ul>${items}</ul></div>
      </nav>`;
  }

  function renderFooter() {
    const year = new Date().getFullYear();
    return `
      <div class="container footer-inner">
        <div>
          <h3>PORTAL P3DS</h3>
          <p>Paguyuban Pensiunan Pertamina Dumai – Sei Pakning.<br>
          <strong>SATU KELUARGA, SEJUTA KENANGAN.</strong></p>
        </div>
        <div>
          <h3>Menu</h3>
          <ul>
            <li><a href="berita.html">Berita & Pengumuman</a></li>
            <li><a href="agenda.html">Agenda Kegiatan</a></li>
            <li><a href="galeri.html">Galeri</a></li>
            <li><a href="kegiatan-sosial.html">Kegiatan Sosial</a></li>
          </ul>
        </div>
        <div>
          <h3>Anggota</h3>
          <ul>
            <li><a href="login.html">Masuk</a></li>
            <li><a href="daftar.html">Daftar Anggota</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">&copy; ${year} P3DS. Hak cipta dilindungi.</div>`;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const activePage = document.body.dataset.page || "";
    const header = document.getElementById("site-header");
    const footer = document.getElementById("site-footer");
    if (header) header.innerHTML = renderHeader(activePage);
    if (footer) footer.innerHTML = renderFooter();

    const toggle = document.getElementById("menu-toggle");
    const nav = document.getElementById("main-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        nav.classList.toggle("open");
      });
    }
  });
})();
