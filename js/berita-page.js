// Logika halaman berita.html: daftar berita atau detail satu berita (?id=...)
(function () {
  const { news, utils, db } = window.P3DS;

  const CATEGORY_MAP = {
    berita: { label: "Berita", class: "badge" },
    pengumuman: { label: "Pengumuman", class: "badge" },
    duka: { label: "🖤 Kabar Duka Cita", class: "badge badge-duka" },
    kesehatan: { label: "🏥 Layanan & Pensiun", class: "badge badge-kesehatan" },
  };

  async function showDetail(id) {
    const box = document.getElementById("detail");
    document.getElementById("list-section").classList.add("is-hidden");
    box.classList.remove("is-hidden");
    box.innerHTML = '<div class="loading">Memuat berita...</div>';

    const { data, error } = await news.getById(id);
    if (error || !data || data.status !== "published") {
      box.innerHTML = '<div class="empty">Berita tidak ditemukan atau Anda belum berhak melihatnya. ' +
        '<a href="berita.html">Kembali ke daftar berita</a></div>';
      return;
    }
    const cover = utils.safeUrl(data.cover_url);
    document.title = data.title + " – PORTAL PPDS";

    const catConfig = CATEGORY_MAP[data.category] || { label: data.category || "Berita", class: "badge" };
    const isDuka = data.category === "duka";

    const dukaBoxHtml = isDuka ? `
      <div class="box-duka">
        <div class="arabic">إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ</div>
        <p>Keluarga Besar Pensiunan Pertamina Dumai – Sei Pakning (PPDS) turut berbelasungkawa yang sedalam-dalamnya. Semoga almarhum/almarhumah husnul khotimah, diampuni segala dosanya, dan keluarga yang ditinggalkan diberikan ketabahan.</p>
        <a class="btn-wa-takziah" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent('Inna lillahi wa inna ilaihi rajiun. Turut berduka cita: ' + data.title + ' - Selengkapnya di PORTAL PPDS: ' + window.location.href)}">
          💬 Bagikan Kabar Duka ke WhatsApp
        </a>
      </div>` : "";

    const takziahSectionHtml = isDuka ? `
      <section class="takziah-section">
        <h3>🤲 Buku Doa & Takziah Bersama</h3>
        <p style="color:var(--muted); font-size:0.9rem; margin-bottom:0.75rem;">Sampaikan doa dan ucapan belasungkawa untuk almarhum/almarhumah beserta keluarga tercinta.</p>
        <form id="form-doa" class="takziah-form">
          <div class="form-group" style="margin-bottom:0.6rem;">
            <label for="doa-sender" style="font-weight:700; font-size:0.9rem;">Nama Anda</label>
            <input id="doa-sender" type="text" placeholder="Contoh: H. Ahmad Supriyadi" required style="width:100%; min-height:42px; padding:0.4rem 0.6rem; border:1px solid var(--border); border-radius:6px;">
          </div>
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label for="doa-message" style="font-weight:700; font-size:0.9rem;">Doa / Ucapan Belasungkawa</label>
            <textarea id="doa-message" rows="3" placeholder="Tuliskan untaian doa tulus Anda..." required style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:6px; font-family:inherit;"></textarea>
          </div>
          <button type="submit" class="btn btn-small" style="background:var(--navy); color:var(--white); border-color:var(--navy);">Kirim Doa</button>
        </form>
        <div id="doa-list"></div>
      </section>` : "";

    // Siapkan teks bagikan ke WhatsApp
    const pageUrl = window.location.href;
    const sharePrefix = isDuka ? "🕊️ [KABAR DUKA CITA PPDS]\n" : "📰 [PORTAL PPDS]\n";
    const shareText = `${sharePrefix}*${data.title}*\nPensiunan Pertamina Dumai – Sei Pakning\n\nBaca informasi selengkapnya melalui portal resmi:\n${pageUrl}`;
    const waShareUrl = "https://api.whatsapp.com/send?text=" + encodeURIComponent(shareText);

    const shareBoxHtml = `
      <div class="share-wa-card" style="margin: 1.5rem 0; padding: 1rem 1.25rem; background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.85rem;">
        <div>
          <div style="font-weight: 600; color: #166534; font-size: 0.98rem;">📲 Bagikan ke Grup WhatsApp</div>
          <div style="color: #15803d; font-size: 0.85rem; margin-top: 0.2rem;">Sebarkan kabar ini kepada keluarga besar pensiunan Pertamina.</div>
        </div>
        <a href="${waShareUrl}" target="_blank" rel="noopener noreferrer" class="btn" style="background: #25d366; color: #ffffff; border-color: #20b858; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 600; padding: 0.55rem 1.15rem; font-size: 0.92rem; text-decoration: none;">
          💬 Bagikan ke WhatsApp
        </a>
      </div>`;

    box.innerHTML = `
      <article id="article-root" class="article">
        <p><a href="berita.html">&larr; Kembali ke daftar berita</a></p>
        
        <div class="font-resizer-bar">
          <div class="meta" style="margin-bottom:0;">
            <span class="${catConfig.class}">${utils.escapeHtml(catConfig.label)}</span>
            <span style="color:var(--muted); font-size:0.85rem; margin-left:0.35rem;">${utils.formatDate(data.published_at)}</span>
          </div>
          <div class="font-btn-group">
            <span class="font-resizer-title">🔍 Huruf:</span>
            <button type="button" class="btn-font-size" data-size="font-sm" title="Kecil">A-</button>
            <button type="button" class="btn-font-size active" data-size="font-md" title="Normal">A</button>
            <button type="button" class="btn-font-size" data-size="font-lg" title="Besar">A+</button>
            <button type="button" class="btn-font-size" data-size="font-xl" title="Sangat Besar">A++</button>
          </div>
        </div>

        <h1 id="article-title">${utils.escapeHtml(data.title)}</h1>
        ${cover ? `<img class="article-cover" src="${utils.escapeHtml(cover)}" alt="">` : ""}
        ${dukaBoxHtml}
        <div id="article-content" class="article-content font-md">${utils.escapeHtml(data.content)}</div>
        ${shareBoxHtml}
        ${takziahSectionHtml}
      </article>`;

    // Inisialisasi Pengatur Ukuran Huruf (No 3)
    initFontResizer();

    // Inisialisasi Buku Doa & Takziah (No 2)
    if (isDuka) {
      initTakziah(id);
    }
  }

  function initFontResizer() {
    const rootEl = document.getElementById("article-root");
    const contentEl = document.getElementById("article-content");
    const buttons = document.querySelectorAll(".btn-font-size");
    if (!contentEl || !buttons.length) return;

    const savedSize = localStorage.getItem("ppds_article_fontsize") || "font-md";
    if (rootEl) {
      ["font-sm", "font-md", "font-lg", "font-xl"].forEach(function(s) { rootEl.classList.remove(s); });
      rootEl.classList.add(savedSize);
    }
    contentEl.className = "article-content " + savedSize;

    buttons.forEach(function (btn) {
      if (btn.dataset.size === savedSize) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }

      btn.addEventListener("click", function () {
        const size = btn.dataset.size;
        ["font-sm", "font-md", "font-lg", "font-xl"].forEach(function (s) {
          if (rootEl) rootEl.classList.remove(s);
          contentEl.classList.remove(s);
        });
        if (rootEl) rootEl.classList.add(size);
        contentEl.classList.add(size);
        localStorage.setItem("ppds_article_fontsize", size);
        buttons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
      });
    });
  }

  function initTakziah(announcementId) {
    const listEl = document.getElementById("doa-list");
    const formEl = document.getElementById("form-doa");
    if (!listEl || !formEl) return;

    const storageKey = "ppds_doa_" + announcementId;
    let localDoa = [];
    try {
      localDoa = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch (e) {
      localDoa = [];
    }

    // Default doa pembuka jika belum ada ucapan
    if (!localDoa.length) {
      localDoa = [
        {
          name: "Pengurus PPDS",
          message: "Semoga almarhum/almarhumah husnul khotimah, dilapangkan kuburnya, dan keluarga senantiasa diberikan kesabaran dan ketabahan.",
          time: new Date().toISOString()
        }
      ];
    }

    function renderDoa() {
      if (!localDoa.length) {
        listEl.innerHTML = '<div class="hint">Belum ada doa yang terkirim. Jadilah yang pertama menyampaikan doa.</div>';
        return;
      }
      listEl.innerHTML = localDoa.map(function (d) {
        return `
          <div class="takziah-item">
            <div class="author">
              ${utils.escapeHtml(d.name)}
              <span class="time">${utils.formatDate(d.time)}</span>
            </div>
            <div class="text">${utils.escapeHtml(d.message)}</div>
          </div>`;
      }).join("");
    }

    renderDoa();

    formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      const sender = document.getElementById("doa-sender").value.trim();
      const message = document.getElementById("doa-message").value.trim();
      if (!sender || !message) return;

      const newDoa = {
        name: sender,
        message: message,
        time: new Date().toISOString()
      };

      localDoa.unshift(newDoa);
      try {
        localStorage.setItem(storageKey, JSON.stringify(localDoa));
      } catch (e) {}

      renderDoa();
      document.getElementById("doa-message").value = "";
    });
  }

  async function showList(category) {
    const el = document.getElementById("news-list");
    el.innerHTML = '<div class="loading">Memuat berita...</div>';
    const { data, error } = await news.listPublished(category);
    if (error) { el.innerHTML = '<div class="empty">Berita belum dapat dimuat. Silakan coba lagi nanti.</div>'; return; }
    el.innerHTML = data.length ? data.map(news.cardHtml).join("") : '<div class="empty">Belum ada berita pada kategori ini.</div>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) { showDetail(id); return; }
    const select = document.getElementById("filter-category");
    if (select) {
      select.addEventListener("change", function () { showList(select.value); });
    }
    showList("");
  });
})();
