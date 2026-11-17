// Modul Korwil: Mengelola daftar wilayah dan penugasan Koordinator Wilayah PPDS
(function () {
  const { db } = window.P3DS;

  const DEFAULT_REGIONS = [
    "Dumai Kota",
    "Dumai Barat",
    "Dumai Timur",
    "Dumai Selatan",
    "Bukit Kapur",
    "Sungai Sembilan",
    "Medang Kampai",
    "Sungai Pakning",
    "Pekanbaru & Sekitarnya",
    "Luar Riau / Daerah Lain"
  ];

  let cachedSettings = null;

  async function getKorwilSettings() {
    if (cachedSettings && cachedSettings.regions && cachedSettings.regions.length > 0) {
      return cachedSettings;
    }

    try {
      const local = localStorage.getItem("ppds_korwil_settings");
      if (local) cachedSettings = JSON.parse(local);
    } catch (e) {}

    if (db) {
      try {
        const { data } = await db
          .from("site_content")
          .select("content")
          .eq("key", "korwil_settings")
          .maybeSingle();

        if (data && data.content) {
          try {
            cachedSettings = JSON.parse(data.content);
            localStorage.setItem("ppds_korwil_settings", data.content);
          } catch (e) {}
        }
      } catch (err) {
        console.warn("Gagal memuat pengaturan korwil dari Supabase:", err);
      }
    }

    if (!cachedSettings || !Array.isArray(cachedSettings.regions) || cachedSettings.regions.length === 0) {
      cachedSettings = {
        regions: DEFAULT_REGIONS,
        assignments: {} // profileId -> { region: "Dumai Kota", assignedAt: "..." }
      };
    }

    return cachedSettings;
  }

  async function saveKorwilSettings(settings) {
    cachedSettings = settings;
    try {
      localStorage.setItem("ppds_korwil_settings", JSON.stringify(settings));
    } catch (e) {}

    if (db) {
      const row = {
        key: "korwil_settings",
        title: "Daftar Wilayah & Penugasan Korwil PPDS",
        content: JSON.stringify(settings),
        updated_at: new Date().toISOString()
      };
      try {
        const { error } = await db.from("site_content").upsert(row);
        if (error) console.error("Gagal simpan ke site_content:", error);
      } catch (err) {
        console.error("Kesalahan upsert korwil_settings:", err);
      }
    }
    return { data: settings, error: null };
  }

  async function getRegions() {
    const s = await getKorwilSettings();
    return s.regions || DEFAULT_REGIONS;
  }

  async function addRegion(name) {
    const clean = String(name || "").trim();
    if (!clean) return { error: "Nama wilayah tidak boleh kosong." };
    const s = await getKorwilSettings();
    if (!s.regions) s.regions = [];
    if (s.regions.some(r => r.toLowerCase() === clean.toLowerCase())) {
      return { error: `Wilayah "${clean}" sudah ada dalam daftar.` };
    }
    s.regions.push(clean);
    await saveKorwilSettings(s);
    return { error: null, regions: s.regions };
  }

  async function removeRegion(name) {
    const s = await getKorwilSettings();
    s.regions = (s.regions || []).filter(r => r !== name);
    // Hapus penugasan jika ada korwil di wilayah yang dihapus
    if (s.assignments) {
      Object.keys(s.assignments).forEach(function (pid) {
        if (s.assignments[pid] && s.assignments[pid].region === name) {
          delete s.assignments[pid];
        }
      });
    }
    await saveKorwilSettings(s);
    return { error: null, regions: s.regions };
  }

  async function resetRegionsToDefault() {
    const s = await getKorwilSettings();
    s.regions = [...DEFAULT_REGIONS];
    await saveKorwilSettings(s);
    return { error: null, regions: s.regions };
  }

  async function assignKorwil(profileId, region) {
    const s = await getKorwilSettings();
    if (!s.assignments) s.assignments = {};
    if (!region) {
      delete s.assignments[profileId];
    } else {
      s.assignments[profileId] = {
        region: region,
        assignedAt: new Date().toISOString()
      };
    }
    await saveKorwilSettings(s);
    return { error: null };
  }

  async function getKorwilAssignment(profileId) {
    if (!profileId) return null;
    const s = await getKorwilSettings();
    return s.assignments && s.assignments[profileId] ? s.assignments[profileId].region : null;
  }

  async function isUserKorwil(profileId) {
    const region = await getKorwilAssignment(profileId);
    return !!region;
  }

  function getKorwilAssignmentSync(profileId) {
    if (!profileId) return null;
    if (cachedSettings && cachedSettings.assignments && cachedSettings.assignments[profileId]) {
      return cachedSettings.assignments[profileId].region;
    }
    try {
      const local = localStorage.getItem("ppds_korwil_settings");
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.assignments && parsed.assignments[profileId]) {
          return parsed.assignments[profileId].region;
        }
      }
    } catch (e) {}
    return null;
  }

  function isUserKorwilSync(profileId) {
    return !!getKorwilAssignmentSync(profileId);
  }

  window.P3DS.korwil = {
    DEFAULT_REGIONS,
    getKorwilSettings,
    saveKorwilSettings,
    getRegions,
    addRegion,
    removeRegion,
    resetRegionsToDefault,
    assignKorwil,
    getKorwilAssignment,
    getKorwilAssignmentSync,
    isUserKorwil,
    isUserKorwilSync
  };
})();
