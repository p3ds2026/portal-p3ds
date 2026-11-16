// Logika halaman Beranda: ringkasan angka + berita, agenda, galeri terbaru.
(function () {
  async function fillCount(id, promise) {
    const el = document.getElementById(id);
    if (!el) return;
    const { count, error } = await promise;
    el.textContent = error ? "-" : String(count ?? 0);
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
  });
})();
