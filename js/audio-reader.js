// js/audio-reader.js - Fitur Dengarkan Berita (Text-to-Speech Ramah Lansia)
(function () {
  window.P3DS = window.P3DS || {};

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  let currentUtteranceList = [];
  let currentChunkIndex = 0;
  let isPlaying = false;
  let isPaused = false;
  let currentRate = 0.95; // Kecepatan nyaman untuk lansia

  // Dapatkan daftar suara (voice) bahasa Indonesia
  function getIndonesianVoice() {
    if (!isSupported) return null;
    const voices = window.speechSynthesis.getVoices();
    // Prioritaskan suara Bahasa Indonesia
    const idVoice = voices.find(v => v.lang && (v.lang.toLowerCase().startsWith("id") || v.lang.toLowerCase().includes("id-id") || v.lang.toLowerCase().includes("indonesia")));
    if (idVoice) return idVoice;
    // Suara fallback (suara default sistem)
    return voices.find(v => v.default) || (voices.length ? voices[0] : null);
  }

  // Bersihkan teks dari markdown, link, dan simbol agar nyaman didengarkan
  function cleanTextForSpeech(raw) {
    if (!raw) return "";
    let txt = String(raw);

    // Ganti tautan URL dengan sebutan "tautan website"
    txt = txt.replace(/https?:\/\/[^\s]+/gi, " tautan website ");
    // Bersihkan tag HTML
    txt = txt.replace(/<br\s*[\/]?>/gi, ". ");
    txt = txt.replace(/<[^>]+>/g, " ");
    // Bersihkan format markdown (*, _, ~, #)
    txt = txt.replace(/[\*_~#]/g, "");
    // Bersihkan simbol berulang
    txt = txt.replace(/[-=]{3,}/g, " ");
    // Rapikan spasi dan jeda
    txt = txt.replace(/\s+/g, " ").trim();
    return txt;
  }

  // Pecah teks panjang ke potongan kalimat agar browser HP tidak memotong suara di tengah jalan
  function splitIntoSentences(text) {
    if (!text) return [];
    // Pisahkan berdasarkan tanda titik, tanda seru, tanda tanya, atau titik dua
    const rawSentences = text.split(/([.!?:\n]+)/);
    const result = [];
    let current = "";

    for (let i = 0; i < rawSentences.length; i++) {
      current += rawSentences[i];
      if (current.length > 120 || i % 2 === 1) {
        const trimmed = current.trim();
        if (trimmed && trimmed.length > 1) {
          result.push(trimmed);
        }
        current = "";
      }
    }
    if (current.trim()) result.push(current.trim());
    return result;
  }

  function stop() {
    if (!isSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    isPlaying = false;
    isPaused = false;
    currentUtteranceList = [];
    currentChunkIndex = 0;
  }

  function pause() {
    if (!isSupported) return;
    try {
      window.speechSynthesis.pause();
      isPaused = true;
    } catch (e) {}
  }

  function resume() {
    if (!isSupported) return;
    try {
      window.speechSynthesis.resume();
      isPaused = false;
    } catch (e) {}
  }

  function playChunks(chunks, voice, callbacks) {
    if (!chunks.length || currentChunkIndex >= chunks.length) {
      stop();
      if (callbacks.onEnd) callbacks.onEnd();
      return;
    }

    const chunkText = chunks[currentChunkIndex];
    const u = new SpeechSynthesisUtterance(chunkText);
    if (voice) u.voice = voice;
    u.lang = (voice && voice.lang) || "id-ID";
    u.rate = currentRate;
    u.pitch = 1.0;

    u.onend = function () {
      currentChunkIndex++;
      if (currentChunkIndex < chunks.length && isPlaying) {
        playChunks(chunks, voice, callbacks);
      } else {
        stop();
        if (callbacks.onEnd) callbacks.onEnd();
      }
    };

    u.onerror = function (err) {
      console.warn("Speech error:", err);
      currentChunkIndex++;
      if (currentChunkIndex < chunks.length && isPlaying) {
        playChunks(chunks, voice, callbacks);
      } else {
        stop();
        if (callbacks.onEnd) callbacks.onEnd();
      }
    };

    window.speechSynthesis.speak(u);
  }

  function startReading(fullText, callbacks) {
    if (!isSupported) {
      alert("Perangkat Anda belum mendukung fitur pembaca audio (Text-to-Speech).");
      return;
    }

    stop();
    const cleaned = cleanTextForSpeech(fullText);
    const chunks = splitIntoSentences(cleaned);
    if (!chunks.length) return;

    isPlaying = true;
    isPaused = false;
    currentChunkIndex = 0;

    const voice = getIndonesianVoice();

    if (callbacks.onStart) callbacks.onStart();
    playChunks(chunks, voice, callbacks);
  }

  // Pasang Pemutar Audio ke Element HTML
  function mountAudioPlayer(targetElement, getFullTextCallback) {
    if (!isSupported || !targetElement) return;

    // Pastikan suara dimuat jika browser memuat asinkron
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = function () {
        getIndonesianVoice();
      };
    }

    targetElement.innerHTML = `
      <div class="audio-reader-box" id="audio-reader-box">
        <div class="audio-reader-header">
          <span class="audio-pulse-icon" id="audio-icon">🔊</span>
          <div class="audio-title-wrap">
            <strong>Dengarkan Berita Ini</strong>
            <span id="audio-status-text">Putar audio suara pembaca otomatis (ramah lansia)</span>
          </div>
        </div>
        <div class="audio-controls">
          <button type="button" id="btn-audio-main" class="btn-audio-main">
            ▶️ Putar Suara
          </button>
          <button type="button" id="btn-audio-stop" class="btn-audio-stop is-hidden">
            ⏹️ Berhenti
          </button>
          <div class="audio-speed-control">
            <span style="font-size:0.75rem; color:#475569; font-weight:600;">Kecepatan:</span>
            <select id="audio-speed-select" title="Pilih kecepatan suara pembaca">
              <option value="0.80">0.8x (Tenang)</option>
              <option value="0.95" selected>1.0x (Normal)</option>
              <option value="1.15">1.15x (Cepat)</option>
            </select>
          </div>
        </div>
      </div>
    `;

    const btnMain = targetElement.querySelector("#btn-audio-main");
    const btnStop = targetElement.querySelector("#btn-audio-stop");
    const icon = targetElement.querySelector("#audio-icon");
    const statusText = targetElement.querySelector("#audio-status-text");
    const speedSelect = targetElement.querySelector("#audio-speed-select");

    function setUiPlaying() {
      btnMain.innerHTML = "⏸️ Jeda Suara";
      btnMain.style.background = "#d97706";
      btnStop.classList.remove("is-hidden");
      icon.classList.add("speaking");
      statusText.textContent = "Sedang membacakan artikel...";
      statusText.style.color = "#1d4ed8";
    }

    function setUiPaused() {
      btnMain.innerHTML = "▶️ Lanjutkan";
      btnMain.style.background = "#1d4ed8";
      icon.classList.remove("speaking");
      statusText.textContent = "Audio dijeda sementara.";
      statusText.style.color = "#475569";
    }

    function setUiStopped() {
      btnMain.innerHTML = "▶️ Putar Suara";
      btnMain.style.background = "#1d4ed8";
      btnStop.classList.add("is-hidden");
      icon.classList.remove("speaking");
      statusText.textContent = "Putar audio suara pembaca otomatis (ramah lansia)";
      statusText.style.color = "#475569";
    }

    if (speedSelect) {
      speedSelect.addEventListener("change", function () {
        currentRate = parseFloat(speedSelect.value) || 0.95;
      });
    }

    btnMain.addEventListener("click", function () {
      if (!isPlaying) {
        const textToRead = getFullTextCallback ? getFullTextCallback() : "";
        startReading(textToRead, {
          onStart: setUiPlaying,
          onEnd: setUiStopped
        });
      } else if (isPlaying && !isPaused) {
        pause();
        setUiPaused();
      } else if (isPlaying && isPaused) {
        resume();
        setUiPlaying();
      }
    });

    btnStop.addEventListener("click", function () {
      stop();
      setUiStopped();
    });

    // Otomatis matikan suara jika pengguna berpindah halaman
    window.addEventListener("beforeunload", function () {
      stop();
    });
  }

  window.P3DS.audioReader = {
    isSupported,
    startReading,
    pause,
    resume,
    stop,
    mountAudioPlayer
  };
})();
