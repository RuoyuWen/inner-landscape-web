(() => {
  "use strict";

  const state = {
    records: [],
    selectedTimestamp: null,
    activeMode: null,
    panorama: null,
  };

  const els = {
    listStatus: document.getElementById("listStatus"),
    recordList: document.getElementById("recordList"),
    recordDetail: document.getElementById("recordDetail"),
    refreshBtn: document.getElementById("refreshBtn"),
    playbackScreen: document.getElementById("playbackScreen"),
    playbackImage: document.getElementById("playbackImage"),
    panoramaCanvas: document.getElementById("panoramaCanvas"),
    enterXrBtn: document.getElementById("enterXrBtn"),
    playbackMusic: document.getElementById("playbackMusic"),
    playbackSound: document.getElementById("playbackSound"),
    muteMusicBtn: document.getElementById("muteMusicBtn"),
    muteSoundBtn: document.getElementById("muteSoundBtn"),
    exitPlaybackBtn: document.getElementById("exitPlaybackBtn"),
    panoramaHint: document.getElementById("panoramaHint"),
  };

  const MODE_LABELS = { "2D": "2D Preview", VR: "VR Panorama (Web)" };
  const FILE_LABELS = { image: "Image", sound_effect: "Sound Effect", music: "Music" };

  async function loadRecords() {
    els.listStatus.textContent = "Loading…";
    els.listStatus.className = "status-text";
    try {
      const response = await fetch("/list-records");
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Loading failed");
      state.records = data.records || [];
      renderList();
      if (state.records.length === 0) {
        els.listStatus.textContent = "No generations yet.";
      } else {
        els.listStatus.textContent = `${state.records.length} generations`;
      }
    } catch (err) {
      els.listStatus.textContent = `Loading failed: ${err.message}`;
      els.listStatus.className = "status-text error";
    }
  }

  function renderList() {
    els.recordList.innerHTML = "";
    for (const record of state.records) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "record-list-item";
      if (record.timestamp === state.selectedTimestamp) button.classList.add("active");

      const time = document.createElement("div");
      time.className = "record-item-time";
      time.textContent = record.label;
      button.appendChild(time);

      const badges = document.createElement("div");
      badges.className = "record-item-badges";
      for (const mode of ["2D", "VR"]) {
        const badge = document.createElement("span");
        badge.className = "record-badge" + (record.modes[mode] ? " available" : "");
        badge.textContent = mode;
        badges.appendChild(badge);
      }
      button.appendChild(badges);

      button.addEventListener("click", () => {
        state.selectedTimestamp = record.timestamp;
        renderList();
        renderDetail(record);
      });

      li.appendChild(button);
      els.recordList.appendChild(li);
    }
  }

  function renderDetail(record) {
    els.recordDetail.innerHTML = "";

    const header = document.createElement("div");
    header.className = "record-detail-header";
    header.innerHTML = `<h2>${record.label}</h2><p class="status-text">${record.timestamp}</p>`;
    els.recordDetail.appendChild(header);

    if (record.sketch) {
      const sketchBlock = document.createElement("div");
      sketchBlock.className = "record-sketch-block";
      sketchBlock.innerHTML = `<h3>Scene Sketch</h3>`;
      const img = document.createElement("img");
      img.src = record.sketch;
      img.alt = "Scene Sketch";
      sketchBlock.appendChild(img);
      els.recordDetail.appendChild(sketchBlock);
    }

    const grid = document.createElement("div");
    grid.className = "record-mode-grid";

    for (const mode of ["2D", "VR"]) {
      const files = record.modes[mode];
      const card = document.createElement("div");
      card.className = "record-mode-card" + (files ? "" : " unavailable");

      if (files && files.image) {
        const img = document.createElement("img");
        img.src = files.image;
        img.alt = `${MODE_LABELS[mode]} thumbnail`;
        card.appendChild(img);
      }

      const title = document.createElement("h3");
      title.textContent = MODE_LABELS[mode];
      card.appendChild(title);

      const fileList = document.createElement("div");
      fileList.className = "record-mode-files";
      if (files) {
        for (const key of ["image", "sound_effect", "music"]) {
          if (!files[key]) continue;
          const tag = document.createElement("span");
          tag.className = "record-badge available";
          tag.textContent = FILE_LABELS[key];
          fileList.appendChild(tag);
        }
      } else {
        const tag = document.createElement("span");
        tag.className = "record-badge";
        tag.textContent = "No data";
        fileList.appendChild(tag);
      }
      card.appendChild(fileList);

      const enterBtn = document.createElement("button");
      enterBtn.type = "button";
      enterBtn.className = "primary-button";
      enterBtn.textContent = mode === "2D" ? "Enter 2D Experience" : "Enter VR Panorama";
      enterBtn.disabled = !files;
      enterBtn.addEventListener("click", () => enterPlayback(mode, files));
      card.appendChild(enterBtn);

      grid.appendChild(card);
    }

    els.recordDetail.appendChild(grid);
  }

  function enterPlayback(mode, files) {
    state.activeMode = mode;
    els.playbackScreen.classList.remove("hidden");

    const isVr = mode === "VR";
    els.playbackImage.classList.toggle("hidden", isVr);
    els.panoramaCanvas.classList.toggle("hidden", !isVr);
    els.panoramaHint.classList.toggle("hidden", !isVr);

    if (isVr) {
      if (!state.panorama) state.panorama = createPanoramaViewer(els.panoramaCanvas);
      if (state.panorama && files.image) state.panorama.loadImage(files.image);
      if (state.panorama) state.panorama.start();
      updateXrButtonVisibility();
    } else {
      els.playbackImage.src = files.image || "";
      els.enterXrBtn.classList.add("hidden");
    }

    setupAudio(els.playbackMusic, files.music);
    setupAudio(els.playbackSound, files.sound_effect);
    els.muteMusicBtn.disabled = !files.music;
    els.muteSoundBtn.disabled = !files.sound_effect;
    els.muteMusicBtn.classList.remove("muted");
    els.muteSoundBtn.classList.remove("muted");
    els.playbackMusic.muted = false;
    els.playbackSound.muted = false;
  }

  function setupAudio(audioEl, src) {
    if (!src) {
      audioEl.removeAttribute("src");
      audioEl.load();
      return;
    }
    audioEl.src = src;
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
  }

  function exitPlayback() {
    els.playbackScreen.classList.add("hidden");
    els.playbackMusic.pause();
    els.playbackSound.pause();
    if (state.panorama) {
      state.panorama.stopXR();
      state.panorama.stop();
    }
    state.activeMode = null;
  }

  // navigator.xr.isSessionSupported resolves async, so the button starts
  // hidden and only appears once a headset browser actually confirms
  // immersive-vr is available -- avoids showing a button that would just
  // throw on desktop Chrome/Firefox with no XR device attached.
  function updateXrButtonVisibility() {
    els.enterXrBtn.classList.add("hidden");
    if (!state.panorama || !state.panorama.supportsXR() || !navigator.xr.isSessionSupported) return;
    navigator.xr.isSessionSupported("immersive-vr")
      .then((supported) => els.enterXrBtn.classList.toggle("hidden", !supported))
      .catch(() => {});
  }

  els.refreshBtn.addEventListener("click", loadRecords);
  els.exitPlaybackBtn.addEventListener("click", exitPlayback);
  els.enterXrBtn.addEventListener("click", async () => {
    if (!state.panorama) return;
    els.enterXrBtn.disabled = true;
    try {
      await state.panorama.startXR();
    } catch (error) {
      alert(error.message || String(error));
    } finally {
      els.enterXrBtn.disabled = false;
    }
  });
  els.muteMusicBtn.addEventListener("click", () => {
    els.playbackMusic.muted = !els.playbackMusic.muted;
    els.muteMusicBtn.classList.toggle("muted", els.playbackMusic.muted);
  });
  els.muteSoundBtn.addEventListener("click", () => {
    els.playbackSound.muted = !els.playbackSound.muted;
    els.muteSoundBtn.classList.toggle("muted", els.playbackSound.muted);
  });

  // createPanoramaViewer() now lives in panorama-viewer.js (shared with
  // study2.js), loaded via a <script> tag before this file.

  loadRecords();
})();
