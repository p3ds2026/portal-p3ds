// Modul Ruang Silaturahmi. Akses tabel discussion_posts, discussion_comments, dan member_directory.
(function () {
  const { db } = window.P3DS;

  const POST_FIELDS = "id, author_id, title, content, is_pinned, is_hidden, created_at";
  const COMMENT_FIELDS = "id, post_id, author_id, content, is_hidden, created_at";

  // ----- Topik -----
  function listPosts(limit = 50) {
    return db.from("discussion_posts").select(POST_FIELDS)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
  }
  function getPost(id) {
    return db.from("discussion_posts").select(POST_FIELDS).eq("id", id).maybeSingle();
  }
  function createPost(title, content, userId) {
    return db.from("discussion_posts").insert({ title, content, author_id: userId }).select("id").single();
  }
  function deletePost(id) {
    return db.from("discussion_posts").delete().eq("id", id);
  }
  // Hanya pengurus/admin (dijaga trigger dan RLS di database)
  function setPostFlags(id, flags) {
    return db.from("discussion_posts").update(flags).eq("id", id);
  }

  // ----- Komentar -----
  function listComments(postId) {
    return db.from("discussion_comments").select(COMMENT_FIELDS)
      .eq("post_id", postId).order("created_at", { ascending: true });
  }
  function addComment(postId, content, userId) {
    return db.from("discussion_comments").insert({ post_id: postId, content, author_id: userId });
  }
  function deleteComment(id) {
    return db.from("discussion_comments").delete().eq("id", id);
  }
  function setCommentHidden(id, hidden) {
    return db.from("discussion_comments").update({ is_hidden: hidden }).eq("id", id);
  }

  // ----- Pendukung -----
  // Nama penulis diambil dari daftar anggota (tanpa email/telepon)
  async function authorNames(ids) {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    const map = {};
    if (!unique.length) return map;
    const { data } = await db.from("member_directory").select("id, full_name").in("id", unique);
    (data || []).forEach(function (m) { map[m.id] = m.full_name || "Anggota"; });
    return map;
  }

  async function commentCounts(postIds) {
    const counts = {};
    if (!postIds.length) return counts;
    const { data } = await db.from("discussion_comments").select("post_id").in("post_id", postIds);
    (data || []).forEach(function (c) { counts[c.post_id] = (counts[c.post_id] || 0) + 1; });
    return counts;
  }

  window.P3DS.discussion = {
    listPosts, getPost, createPost, deletePost, setPostFlags,
    listComments, addComment, deleteComment, setCommentHidden,
    authorNames, commentCounts,
  };
})();
