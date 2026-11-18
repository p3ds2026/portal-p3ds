// Logika halaman Beranda: ringkasan angka + berita, agenda, galeri terbaru.
(function () {
  async function fillCount(id, promise) {
    const el = document.getElementById(id);
    if (!el) return;
    const { count, error } = await promise;
    el.textContent = error ? "-" : String(count ?? 0);
  }

  async function checkDukaBanner() {
    const P = window.P3DS;
    if (!P || !P.db) return;
    try {
      const { data } = await P.db.from("announcements")
        .select("id, title, published_at")
        .eq("category", "duka")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.title) {
        const pubDate = new Date(data.published_at || Date.now());
        const diffDays = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 14) {
          const container = document.getElementById("duka-highlight-container");
          const titleEl = document.getElementById("duka-banner-title-text");
          const linkEl = document.getElementById("duka-banner-link");
          if (container && titleEl) {
            titleEl.textContent = data.title;
            if (linkEl) linkEl.href = "berita.html?id=" + encodeURIComponent(data.id);
            container.classList.remove("is-hidden");
          }
        }
      }
    } catch (e) {
      console.warn("Gagal cek banner duka:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const P = window.P3DS;
    fillCount("stat-news", P.news.countPublished());
    fillCount("stat-events", P.events.countUpcoming());
    fillCount("stat-albums", P.gallery.countPublished());
    fillCount("stat-social", P.social.countPublished());

    P.news.renderLatest("news-list", 3);
    P.events.renderUpcoming("events-list", 4);
    P.gallery.renderLatest("gallery-list", 3);

    checkDukaBanner();
  });
})();
