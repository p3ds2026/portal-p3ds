// Service Worker untuk PORTAL PPDS (Progressive Web App)
const CACHE_NAME = "p3ds-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/berita.html",
  "/layanan-kesehatan.html",
  "/agenda.html",
  "/css/style.css",
  "/js/config.js",
  "/js/supabase-client.js",
  "/js/utils.js",
  "/js/layout.js",
  "/js/auth.js",
  "/img/logo.jpg",
  "/img/icon-192.png",
  "/img/icon-512.png",
  "/img/apple-touch-icon.png",
  "/manifest.json"
];

// 1. Install Service Worker & Cache Core Assets
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS).catch(function (err) {
        console.warn("PWA: Beberapa aset belum berhasil di-cache saat install:", err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activate Service Worker & Bersihkan Cache Lama
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Strategy: Network First dengan Fallback ke Cache
self.addEventListener("fetch", function (event) {
  const req = event.request;
  const url = new URL(req.url);

  // Jangan cache permintaan API Supabase atau otentikasi
  if (url.hostname.includes("supabase.co") || req.method !== "GET") {
    return;
  }

  // Permintaan navigasi (halaman web HTML)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(function (networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(req, clone);
            });
          }
          return networkResponse;
        })
        .catch(function () {
          return caches.match(req).then(function (cachedResponse) {
            if (cachedResponse) return cachedResponse;
            return caches.match("/index.html");
          });
        })
    );
    return;
  }

  // Permintaan aset statis (CSS, JS, Gambar, dsb): Coba Network duluan, fallback Cache
  event.respondWith(
    fetch(req)
      .then(function (networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, clone);
          });
        }
        return networkResponse;
      })
      .catch(function () {
        return caches.match(req);
      })
  );
});

// 4. Penanganan Push Notification & Klik Notifikasi
self.addEventListener("push", function (event) {
  let data = {
    title: "PORTAL PPDS",
    body: "Ada pengumuman terbaru untuk Anda.",
    url: "/berita.html"
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/img/icon-192.png",
    badge: "/img/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/berita.html" }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/index.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

