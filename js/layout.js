// Header, menu navigasi, footer bersama, dan Visitor Counter
(function () {
  const MENU = [
    { label: "Beranda", href: "index.html", page: "beranda" },
    { label: "Berita & Pengumuman", href: "berita.html", page: "berita" },
    { label: "Agenda Kegiatan", href: "agenda.html", page: "agenda" },
    { label: "Galeri Foto & Video", href: "galeri.html", page: "galeri" },
    { label: "Kegiatan Sosial", href: "kegiatan-sosial.html", page: "sosial" },
    { label: "Layanan & Pensiun", href: "layanan-kesehatan.html", page: "layanan" },
    { label: "Panduan & Tips", href: "panduan.html", page: "panduan" },
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
          <a id="btn-login" class="btn btn-small btn-desktop-auth" href="login.html">🔑 Masuk</a>
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
            <li class="mobile-auth-item">
              <a id="nav-btn-install-pwa" class="mobile-auth-link" href="#" style="color:var(--gold); font-weight:700;">📲 Pasang Aplikasi di HP</a>
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
            <li><a href="layanan-kesehatan.html">Layanan & Pensiun</a></li>
            <li><a href="panduan.html">Panduan & Tips</a></li>
          </ul>
        </div>
        <div>
          <h3>Anggota</h3>
          <ul>
            <li id="footer-login-item"><a href="login.html">Masuk</a></li>
            <li id="footer-register-item"><a href="daftar.html">Daftar Anggota</a></li>
            <li id="footer-profile-item" class="is-hidden"><a href="profil.html">Profil Saya</a></li>
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

  // Bilah Navigasi Bawah Khusus Layar HP (Mobile Bottom Navigation)
  function renderBottomNav(activePage) {
    const navItems = [
      { label: "Beranda", href: "index.html", icon: "🏠", page: "beranda" },
      { label: "Berita", href: "berita.html", icon: "📰", page: "berita" },
      { label: "Layanan", href: "layanan-kesehatan.html", icon: "🏥", page: "layanan" },
      { label: "Agenda", href: "agenda.html", icon: "🗓️", page: "agenda" },
      { label: "Masuk", href: "login.html", icon: "🔑", page: "auth", id: "bottom-nav-user" }
    ];

    const html = navItems.map(item => {
      const isActive = item.page === activePage ? " active" : "";
      const idAttr = item.id ? ` id="${item.id}"` : "";
      return `
        <a href="${item.href}" class="bottom-nav-item${isActive}"${idAttr}>
          <span class="bottom-nav-icon">${item.icon}</span>
          <span class="bottom-nav-label">${item.label}</span>
        </a>
      `;
    }).join("");

    return `
      <nav id="mobile-bottom-nav" class="mobile-bottom-nav" aria-label="Navigasi Bawah">
        ${html}
      </nav>
    `;
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

    // Pasang Bottom Navigation Bar untuk layar HP
    const bottomNavWrapper = document.createElement("div");
    bottomNavWrapper.innerHTML = renderBottomNav(activePage);
    if (bottomNavWrapper.firstElementChild) {
      document.body.appendChild(bottomNavWrapper.firstElementChild);
    }

    // Pasang favicon logo resmi PPDS di tab browser
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
    initPWA();
    initPushNotifications();
  });

  // Pengelolaan Fitur PWA (Progressive Web App)
  let deferredPrompt = null;

  function initPWA() {
    // 1. Pastikan meta & manifest terpasang di <head>
    if (!document.querySelector("link[rel='manifest']")) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = "manifest.json";
      document.head.appendChild(link);
    }
    if (!document.querySelector("meta[name='theme-color']")) {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = "#0a192f";
      document.head.appendChild(meta);
    }
    if (!document.querySelector("meta[name='apple-mobile-web-app-capable']")) {
      const meta = document.createElement("meta");
      meta.name = "apple-mobile-web-app-capable";
      meta.content = "yes";
      document.head.appendChild(meta);
    }
    if (!document.querySelector("link[rel='apple-touch-icon']")) {
      const link = document.createElement("link");
      link.rel = "apple-touch-icon";
      link.href = "img/apple-touch-icon.png";
      document.head.appendChild(link);
    }

    // 2. Daftarkan Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("/sw.js").then(function (reg) {
          console.log("PWA Service Worker registered:", reg.scope);
        }).catch(function (err) {
          console.warn("PWA Service Worker registration:", err);
        });
      });
    }

    // 3. Tangkap event pemasangan aplikasi (Chrome, Edge, Samsung Internet)
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      showPwaInstallBanner();
    });

    // 4. Periksa apakah sudah terpasang (mode Standalone)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isStandalone) {
      return;
    }

    // Sambungkan tombol pasang di menu
    const btnMenuInstall = document.getElementById("nav-btn-install-pwa");
    if (btnMenuInstall) {
      btnMenuInstall.addEventListener("click", function (e) {
        e.preventDefault();
        triggerPwaInstall();
      });
    }
  }

  function triggerPwaInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice.outcome === "accepted") {
          const banner = document.getElementById("pwa-install-banner");
          if (banner) banner.remove();
        }
        deferredPrompt = null;
      });
    } else {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIos) {
        alert("📲 Cara Pasang di iPhone/iPad:\n1. Tekan tombol Bagikan (Share ⎋) di bilah bawah Safari.\n2. Geser ke bawah lalu pilih 'Tambahkan ke Layar Utama' (Add to Home Screen).\n3. Tekan 'Tambah' di pojok kanan atas.");
      } else {
        alert("📲 Untuk memasang di layar utama HP:\nBuka menu browser Anda (titik tiga ⋮ di pojok kanan atas), lalu pilih 'Tambahkan ke Layar Utama' atau 'Pasang Aplikasi'.");
      }
    }
  }

  function showPwaInstallBanner() {
    if (sessionStorage.getItem("p3ds_pwa_dismissed")) return;
    if (document.getElementById("pwa-install-banner")) return;

    const banner = document.createElement("div");
    banner.id = "pwa-install-banner";
    banner.className = "pwa-banner";
    banner.innerHTML = `
      <div class="pwa-banner-inner">
        <img src="img/icon-192.png" alt="PPDS" class="pwa-banner-icon">
        <div class="pwa-banner-text">
          <strong>Pasang Aplikasi PORTAL PPDS</strong>
          <small>Akses cepat langsung dari layar utama HP Anda</small>
        </div>
        <div class="pwa-banner-actions">
          <button type="button" id="btn-banner-install" class="btn btn-small" style="background:var(--gold); color:var(--navy); font-weight:700; padding:0.25rem 0.65rem; font-size:0.8rem;">Pasang</button>
          <button type="button" id="btn-banner-close" class="pwa-banner-close" aria-label="Tutup">✕</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    const btnInstall = document.getElementById("btn-banner-install");
    if (btnInstall) {
      btnInstall.addEventListener("click", function () {
        triggerPwaInstall();
      });
    }

    const btnClose = document.getElementById("btn-banner-close");
    if (btnClose) {
      btnClose.addEventListener("click", function () {
        banner.remove();
        sessionStorage.setItem("p3ds_pwa_dismissed", "true");
      });
    }
  }

  // Pengelolaan Push Notifications (Notifikasi Otomatis di Layar HP)
  function initPushNotifications() {
    if (!("Notification" in window)) {
      console.log("Browser ini tidak mendukung Web Notifications");
      return;
    }

    // Jika izin sudah diberikan sebelumnya, langsung aktifkan pendengar kabar baru (Realtime)
    if (Notification.permission === "granted") {
      listenToRealtimeAnnouncements();
      return;
    }

    // Jika izin belum pernah diminta, tampilkan banner ajakan setelah 2.5 detik
    if (Notification.permission === "default" && !sessionStorage.getItem("p3ds_notif_prompt_dismissed")) {
      setTimeout(function () {
        showNotificationPromptBanner();
      }, 2500);
    }
  }

  function showNotificationPromptBanner() {
    if (document.getElementById("notif-prompt-banner")) return;

    const banner = document.createElement("div");
    banner.id = "notif-prompt-banner";
    banner.className = "notif-prompt-banner";
    banner.innerHTML = `
      <div class="notif-prompt-inner">
        <span class="notif-prompt-icon">🔔</span>
        <div class="notif-prompt-text">
          <strong>Aktifkan Notifikasi Layar HP</strong>
          <small>Dapatkan pemberitahuan otomatis saat ada Kabar Duka Cita atau Pengumuman Resmi</small>
        </div>
        <div class="notif-prompt-actions">
          <button type="button" id="btn-allow-notif" class="btn btn-small" style="background:#22c55e; color:#ffffff; font-weight:700; padding:0.25rem 0.65rem; font-size:0.8rem; border-color:#16a34a;">Aktifkan</button>
          <button type="button" id="btn-dismiss-notif" class="pwa-banner-close" aria-label="Nanti">✕</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    const btnAllow = document.getElementById("btn-allow-notif");
    if (btnAllow) {
      btnAllow.addEventListener("click", async function () {
        banner.remove();
        try {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            sendSystemNotification(
              "🔔 Notifikasi PPDS Aktif!",
              "Terima kasih! Anda akan menerima kabar duka dan pengumuman resmi di layar HP Anda.",
              "/index.html"
            );
            listenToRealtimeAnnouncements();
          }
        } catch (e) {
          console.warn("Izin notifikasi:", e);
        }
      });
    }

    const btnDismiss = document.getElementById("btn-dismiss-notif");
    if (btnDismiss) {
      btnDismiss.addEventListener("click", function () {
        banner.remove();
        sessionStorage.setItem("p3ds_notif_prompt_dismissed", "true");
      });
    }
  }

  function sendSystemNotification(title, body, url) {
    const targetUrl = url || "/berita.html";

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(function (reg) {
        reg.showNotification(title, {
          body: body,
          icon: "/img/icon-192.png",
          badge: "/img/icon-192.png",
          vibrate: [200, 100, 200],
          data: { url: targetUrl }
        });
      });
    } else if (Notification.permission === "granted") {
      new Notification(title, {
        body: body,
        icon: "/img/icon-192.png"
      });
    }
  }

  function listenToRealtimeAnnouncements() {
    if (!window.P3DS || !window.P3DS.db) return;

    try {
      window.P3DS.db
        .channel("public-announcements-notifications")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "announcements" },
          function (payload) {
            const r = payload.new;
            if (r && r.status === "published") {
              const isDuka = r.category === "duka";
              const title = isDuka ? "🖤 KABAR DUKA CITA PPDS" : "📢 PENGUMUMAN RESMI PPDS";
              const body = r.title + (r.summary ? "\n" + r.summary : "");
              sendSystemNotification(title, body, "/berita.html?id=" + r.id);
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("Realtime notifikasi:", e);
    }
  }

  // Ekspor fungsi notifikasi agar bisa dites pengurus
  if (!window.P3DS) window.P3DS = {};
  window.P3DS.sendNotification = sendSystemNotification;
})();
