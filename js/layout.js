// Header, menu navigasi, footer bersama, dan Visitor Counter
(function () {
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
          <img class="brand-logo" src="img/logo.jpg" alt="Logo PPDS">
          <span>
            <span class="brand-name">PORTAL PPDS</span>
            <span class="brand-sub">Pensiunan Pertamina Dumai – Sei Pakning</span>
          </span>
        </a>
        <div class="header-actions">
          <a id="btn-login" class="btn btn-small btn-desktop-auth" href="login.html">Masuk</a>
          <button id="menu-toggle" class="menu-toggle" type="button" aria-label="Buka menu">☰ Menu</button>
        </div>
      </div>
      <nav id="main-nav" class="main-nav" aria-label="Menu utama">
        <div class="container">
          <ul>
            ${items}
            <li class="mobile-auth-item">
              <a id="nav-btn-login" class="mobile-auth-link" href="login.html">🔑 Masuk ke Akun</a>
            </li>
          </ul>
        </div>
      </nav>`;
  }

  function renderFooter() {
    const year = new Date().getFullYear();
    return `
      <div class="container footer-inner">
        <div>
          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
            <img src="img/logo.jpg" alt="Logo PPDS" style="width:48px; height:48px; border-radius:50%; border:2px solid var(--gold); object-fit:cover;">
            <h3 style="margin:0; font-size:1.2rem;">PORTAL PPDS</h3>
          </div>
          <p>Pensiunan Pertamina Dumai – Sei Pakning.<br>
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
      <div class="footer-bottom">
        <div>&copy; ${year} PPDS. Hak cipta dilindungi.</div>
        <div class="footer-counter">
          <span>👥 Total Pengunjung:</span>
          <span id="visitor-count" class="counter-number">...</span>
        </div>
      </div>`;
  }

  // Pengelola Visitor Counter: Refresh halaman TIDAK menambah hitungan
  async function initVisitorCounter() {
    const countEl = document.getElementById("visitor-count");
    if (!countEl || !window.P3DS || !window.P3DS.db) return;
    const db = window.P3DS.db;

    const hasCounted = sessionStorage.getItem("p3ds_visit_counted");

    if (!hasCounted) {
      // Kunjungan sesi baru: Tambah hitungan via fungsi atomik di Supabase
      try {
        const { data, error } = await db.rpc("increment_visitor_count");
        if (!error && data !== null && data !== undefined) {
          sessionStorage.setItem("p3ds_visit_counted", "true");
          countEl.textContent = Number(data).toLocaleString("id-ID");
          return;
        }
      } catch (e) {
        console.warn("Gagal menambah hitungan:", e);
      }
    }

    // Jika sudah pernah dihitung dalam sesi ini (atau refresh), ambil nilai saat ini tanpa menambah
    try {
      const { data, error } = await db
        .from("site_metrics")
        .select("value")
        .eq("key", "visitor_count")
        .maybeSingle();

      if (!error && data && data.value !== null) {
        countEl.textContent = Number(data.value).toLocaleString("id-ID");
      } else {
        countEl.textContent = "-";
      }
    } catch (e) {
      countEl.textContent = "-";
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const activePage = document.body.dataset.page || "";
    const header = document.getElementById("site-header");
    const footer = document.getElementById("site-footer");
    if (header) header.innerHTML = renderHeader(activePage);
    if (footer) footer.innerHTML = renderFooter();

    // Pasang favicon logo resmi P3DS di tab browser
    let icon = document.querySelector("link[rel*='icon']");
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      icon.type = "image/jpeg";
      icon.href = "img/logo.jpg";
      document.head.appendChild(icon);
    }

    const toggle = document.getElementById("menu-toggle");
    const nav = document.getElementById("main-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        nav.classList.toggle("open");
      });
    }

    initVisitorCounter();
  });
})();
