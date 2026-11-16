// Logika halaman silaturahmi.html: daftar topik atau diskusi satu topik (?id=...)
(function () {
  const { discussion, auth, utils } = window.P3DS;
  let profile = null;
  let isStaff = false;

  function show(el, type, text) {
    el.className = "alert alert-" + type;
    el.textContent = text;
    el.classList.remove("is-hidden");
  }

  // ---------- Daftar topik ----------
  async function showList() {
    document.getElementById("list-section").classList.remove("is-hidden");
    const el = document.getElementById("post-list");
    el.innerHTML = '<div class="loading">Memuat topik...</div>';

    const { data, error } = await discussion.listPosts();
    if (error) { el.innerHTML = '<div class="empty">Topik belum dapat dimuat. Silakan coba lagi nanti.</div>'; return; }
    if (!data.length) { el.innerHTML = '<div class="empty">Belum ada topik. Jadilah yang pertama menyapa!</div>'; return; }

    const names = await discussion.authorNames(data.map(function (p) { return p.author_id; }));
    const counts = await discussion.commentCounts(data.map(function (p) { return p.id; }));

    el.innerHTML = data.map(function (p) {
      const pin = p.is_pinned ? '<span class="badge">Disematkan</span>' : "";
      const hid = p.is_hidden ? '<span class="badge badge-warn">Disembunyikan</span>' : "";
      return `<article class="card post-card">
        <div class="card-body">
          <div class="meta">${pin}${hid}${utils.escapeHtml(names[p.author_id] || "Anggota")} · ${utils.formatDate(p.created_at)}</div>
          <h3><a href="silaturahmi.html?id=${encodeURIComponent(p.id)}">${utils.escapeHtml(p.title)}</a></h3>
          <p>${utils.escapeHtml(utils.shorten(p.content, 160))}</p>
          <div class="meta">${counts[p.id] || 0} komentar</div>
        </div>
      </article>`;
    }).join("");
  }

  // ---------- Satu topik ----------
  async function showPost(id) {
    document.getElementById("list-section").classList.add("is-hidden");
    const box = document.getElementById("detail");
    box.classList.remove("is-hidden");
    box.innerHTML = '<div class="loading">Memuat diskusi...</div>';

    const { data: post, error } = await discussion.getPost(id);
    if (error || !post) {
      box.innerHTML = '<div class="empty">Topik tidak ditemukan. <a href="silaturahmi.html">Kembali ke Ruang Silaturahmi</a></div>';
      return;
    }
    document.title = post.title + " – PORTAL PPDS";

    const { data: comments } = await discussion.listComments(id);
    const list = comments || [];
    const names = await discussion.authorNames([post.author_id].concat(list.map(function (c) { return c.author_id; })));

    const canDeletePost = isStaff || post.author_id === profile.id;
    const staffTools = isStaff ? `
      <button class="btn btn-small btn-outline-dark" data-post-act="pin" type="button">${post.is_pinned ? "Lepas Sematan" : "Sematkan"}</button>
      <button class="btn btn-small btn-outline-dark" data-post-act="hide" type="button">${post.is_hidden ? "Tampilkan" : "Sembunyikan"}</button>` : "";

    const commentsHtml = list.map(function (c) {
      const canDel = isStaff || c.author_id === profile.id;
      const hid = c.is_hidden ? '<span class="badge badge-warn">Disembunyikan</span>' : "";
      return `<div class="comment">
        <div class="meta">${hid}<strong>${utils.escapeHtml(names[c.author_id] || "Anggota")}</strong> · ${utils.formatDateTime(c.created_at)}</div>
        <div class="article-content">${utils.escapeHtml(c.content)}</div>
        <div class="comment-actions">
          ${isStaff ? `<button class="btn btn-small btn-outline-dark" data-c-act="hide" data-id="${utils.escapeHtml(c.id)}" data-hidden="${c.is_hidden}" type="button">${c.is_hidden ? "Tampilkan" : "Sembunyikan"}</button>` : ""}
          ${canDel ? `<button class="btn btn-small btn-danger" data-c-act="del" data-id="${utils.escapeHtml(c.id)}" type="button">Hapus</button>` : ""}
        </div>
      </div>`;
    }).join("");

    box.innerHTML = `
      <article class="article">
        <p><a href="silaturahmi.html">&larr; Kembali ke Ruang Silaturahmi</a></p>
        <div class="meta">
          ${post.is_pinned ? '<span class="badge">Disematkan</span>' : ""}
          ${post.is_hidden ? '<span class="badge badge-warn">Disembunyikan</span>' : ""}
          ${utils.escapeHtml(names[post.author_id] || "Anggota")} · ${utils.formatDateTime(post.created_at)}
        </div>
        <h1>${utils.escapeHtml(post.title)}</h1>
        <div class="article-content">${utils.escapeHtml(post.content)}</div>
        <div class="comment-actions">${staffTools}
          ${canDeletePost ? '<button class="btn btn-small btn-danger" data-post-act="del" type="button">Hapus Topik</button>' : ""}
        </div>

        <h2 style="margin-top:1.5rem">Komentar (${list.length})</h2>
        <div id="c-msg" class="is-hidden" role="alert"></div>
        ${commentsHtml || '<div class="empty">Belum ada komentar.</div>'}

        <form id="form-comment" class="comment-form" novalidate>
          <div class="form-group">
            <label for="c-content">Tulis komentar</label>
            <textarea id="c-content" name="content" rows="3" maxlength="2000" required></textarea>
          </div>
          <button class="btn" type="submit">Kirim Komentar</button>
        </form>
      </article>`;

    const cMsg = document.getElementById("c-msg");

    // Kirim komentar
    document.getElementById("form-comment").addEventListener("submit", async function (e) {
      e.preventDefault();
      const content = e.target.content.value.trim();
      if (content.length < 1 || content.length > 2000) { show(cMsg, "error", "Komentar harus 1 sampai 2000 huruf."); return; }
      const { error: err } = await discussion.addComment(id, content, profile.id);
      if (err) { show(cMsg, "error", "Komentar gagal dikirim."); return; }
      showPost(id);
    });

    // Tombol topik
    box.querySelectorAll("button[data-post-act]").forEach(function (b) {
      b.addEventListener("click", async function () {
        const act = b.dataset.postAct;
        if (act === "del") {
          if (!window.confirm("Hapus topik ini beserta semua komentarnya?")) return;
          const { error: err } = await discussion.deletePost(id);
          if (err) { show(cMsg, "error", "Topik gagal dihapus."); return; }
          window.location.href = "silaturahmi.html";
          return;
        }
        const flags = act === "pin" ? { is_pinned: !post.is_pinned } : { is_hidden: !post.is_hidden };
        const { error: err } = await discussion.setPostFlags(id, flags);
        if (err) { show(cMsg, "error", "Perubahan gagal disimpan."); return; }
        showPost(id);
      });
    });

    // Tombol komentar
    box.querySelectorAll("button[data-c-act]").forEach(function (b) {
      b.addEventListener("click", async function () {
        if (b.dataset.cAct === "del") {
          if (!window.confirm("Hapus komentar ini?")) return;
          const { error: err } = await discussion.deleteComment(b.dataset.id);
          if (err) { show(cMsg, "error", "Komentar gagal dihapus."); return; }
        } else {
          const { error: err } = await discussion.setCommentHidden(b.dataset.id, b.dataset.hidden !== "true");
          if (err) { show(cMsg, "error", "Perubahan gagal disimpan."); return; }
        }
        showPost(id);
      });
    });
  }

  // ---------- Awal ----------
  document.addEventListener("DOMContentLoaded", async function () {
    profile = await auth.requireLogin();
    if (!profile) return;

    if (profile.status !== "active") {
      document.getElementById("denied").classList.remove("is-hidden");
      return;
    }
    isStaff = profile.role === "pengurus" || profile.role === "admin";
    document.getElementById("content").classList.remove("is-hidden");

    const form = document.getElementById("form-post");
    const msg = document.getElementById("msg");
    const btn = document.getElementById("btn-submit");

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const title = form.title.value.trim();
      const content = form.content.value.trim();
      if (title.length < 3 || title.length > 200) { show(msg, "error", "Judul harus 3 sampai 200 huruf."); return; }
      if (content.length < 1 || content.length > 5000) { show(msg, "error", "Isi topik harus 1 sampai 5000 huruf."); return; }

      btn.disabled = true;
      btn.textContent = "Mengirim...";
      const { error } = await discussion.createPost(title, content, profile.id);
      btn.disabled = false;
      btn.textContent = "Kirim Topik";
      if (error) { show(msg, "error", "Topik gagal dikirim. Silakan coba lagi."); return; }
      form.reset();
      show(msg, "success", "Topik berhasil dikirim.");
      showList();
    });

    const id = new URLSearchParams(window.location.search).get("id");
    if (id) showPost(id); else showList();
  });
})();
