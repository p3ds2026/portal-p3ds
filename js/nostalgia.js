// js/nostalgia.js - Modul Album Nostalgia & Kenangan Masa Dinas PPDS
(function () {
  window.P3DS = window.P3DS || {};
  const { db } = window.P3DS;

  const DEFAULT_PHOTOS = [];

  let cachedData = null;

  async function getNostalgiaData() {
    if (cachedData && Array.isArray(cachedData.photos)) {
      cachedData.photos = cachedData.photos.filter(p => !p.id.startsWith("nostalgia_demo_"));
      return cachedData;
    }

    try {
      const local = localStorage.getItem("ppds_nostalgia_data");
      if (local) {
        cachedData = JSON.parse(local);
        if (cachedData && Array.isArray(cachedData.photos)) {
          cachedData.photos = cachedData.photos.filter(p => !p.id.startsWith("nostalgia_demo_"));
        }
      }
    } catch (e) {}

    if (db) {
      try {
        const { data } = await db
          .from("site_content")
          .select("content")
          .eq("key", "nostalgia_content")
          .maybeSingle();

        if (data && data.content) {
          try {
            cachedData = JSON.parse(data.content);
            if (cachedData && Array.isArray(cachedData.photos)) {
              cachedData.photos = cachedData.photos.filter(p => !p.id.startsWith("nostalgia_demo_"));
            }
            localStorage.setItem("ppds_nostalgia_data", JSON.stringify(cachedData));
          } catch (e) {}
        }
      } catch (err) {
        console.warn("Gagal memuat data nostalgia dari Supabase:", err);
      }
    }

    if (!cachedData || !Array.isArray(cachedData.photos)) {
      cachedData = {
        authorized_users: [], // Array ID profile anggota yang diberi otorisasi khusus
        photos: []
      };
    } else {
      cachedData.photos = cachedData.photos.filter(p => !p.id.startsWith("nostalgia_demo_"));
    }

    if (!Array.isArray(cachedData.authorized_users)) {
      cachedData.authorized_users = [];
    }

    return cachedData;
  }

  async function saveNostalgiaData(data) {
    cachedData = data;
    try {
      localStorage.setItem("ppds_nostalgia_data", JSON.stringify(data));
    } catch (e) {}

    if (db) {
      try {
        const { error } = await db
          .from("site_content")
          .upsert({
            key: "nostalgia_content",
            content: JSON.stringify(data),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error("Gagal menyimpan nostalgia_content ke Supabase:", error);
          return { error: error.message };
        }
        return { error: null };
      } catch (err) {
        console.error("Kesalahan koneksi saat menyimpan nostalgia_content:", err);
        return { error: err.message };
      }
    }
    return { error: null };
  }

  // Cek apakah user berhak mengunggah foto nostalgia
  function isUserAuthorized(profile, nostalgiaData) {
    if (!profile || profile.status !== "active") return false;
    
    // Admin, Pengurus, dan Korwil otomatis memiliki izin
    const isKorwil = profile.role === "korwil" || (window.P3DS.korwil && window.P3DS.korwil.isUserKorwilSync && window.P3DS.korwil.isUserKorwilSync(profile.id));
    if (profile.role === "admin" || profile.role === "pengurus" || isKorwil) {
      return true;
    }

    // Cek apakah ada di daftar otorisasi khusus
    const authList = (nostalgiaData && nostalgiaData.authorized_users) || (cachedData && cachedData.authorized_users) || [];
    return authList.includes(profile.id);
  }

  // Memberi atau mencabut otorisasi anggota oleh Admin
  async function toggleAuthorization(targetUserId, authorize) {
    const data = await getNostalgiaData();
    let list = data.authorized_users || [];

    if (authorize) {
      if (!list.includes(targetUserId)) {
        list.push(targetUserId);
      }
    } else {
      list = list.filter(id => id !== targetUserId);
    }

    data.authorized_users = list;
    return await saveNostalgiaData(data);
  }

  // Menambahkan foto kenangan baru
  async function addPhoto(photoInput, uploaderProfile) {
    if (!isUserAuthorized(uploaderProfile, cachedData)) {
      return { error: "Anda belum memiliki otorisasi untuk mengunggah foto kenangan." };
    }

    const data = await getNostalgiaData();
    const newPhoto = {
      id: "nostalgia_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      title: photoInput.title.trim(),
      year: photoInput.year ? photoInput.year.trim() : "",
      era: photoInput.era || "Era Lainnya",
      location: photoInput.location || "Umum",
      description: photoInput.description ? photoInput.description.trim() : "",
      image_url: photoInput.image_url,
      uploader_id: uploaderProfile.id,
      uploader_name: uploaderProfile.full_name || uploaderProfile.nama_lengkap || "Pensiunan PPDS",
      created_at: new Date().toISOString()
    };

    data.photos.unshift(newPhoto);
    const res = await saveNostalgiaData(data);
    return { error: res.error, photo: newPhoto };
  }

  // Menghapus foto kenangan (Hanya uploader asli atau Admin/Pengurus)
  async function deletePhoto(photoId, userProfile) {
    if (!userProfile) return { error: "Silakan login terlebih dahulu." };

    const data = await getNostalgiaData();
    const photo = data.photos.find(p => p.id === photoId);
    if (!photo) return { error: "Foto tidak ditemukan." };

    const isAdminOrStaff = userProfile.role === "admin" || userProfile.role === "pengurus";
    const isOwner = photo.uploader_id === userProfile.id;

    if (!isAdminOrStaff && !isOwner) {
      return { error: "Anda tidak berhak menghapus foto milik anggota lain." };
    }

    data.photos = data.photos.filter(p => p.id !== photoId);
    return await saveNostalgiaData(data);
  }

  window.P3DS.nostalgia = {
    getNostalgiaData,
    saveNostalgiaData,
    isUserAuthorized,
    toggleAuthorization,
    addPhoto,
    deletePhoto
  };
})();
