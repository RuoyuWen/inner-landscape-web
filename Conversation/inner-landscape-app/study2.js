(() => {
  "use strict";

  const PARTICIPANTS = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const TOTAL_PROFILES = 24;
  const TRIALS_PER_MODALITY = 12;

  // Images sit at odd positions (1,3,5,7,9) of the 9-point scale; the even
  // positions in between are unlabeled radio-only points, matching the SAM
  // layout in the reference screenshot.
  const SAM_DIMENSIONS = [
    {
      key: "valence",
      label: "Valence",
      description: "how positive or negative an emotional experience feels.",
      images: [
        { file: "valence1.png", caption: "Unhappy" },
        { file: "valence2.png", caption: "" },
        { file: "valence3.png", caption: "Neutral" },
        { file: "valence4.png", caption: "" },
        { file: "valence5.png", caption: "Happy" },
      ],
    },
    {
      key: "arousal",
      label: "Arousal",
      description: "how calm or activated an emotional experience feels.",
      images: [
        { file: "arousal1.png", caption: "Calm" },
        { file: "arousal2.png", caption: "" },
        { file: "arousal3.png", caption: "Neutral" },
        { file: "arousal4.png", caption: "" },
        { file: "arousal5.png", caption: "Excited" },
      ],
    },
    {
      key: "dominance",
      label: "Dominance",
      description: "how much control or influence a person feels they have over the situation or emotional experience.",
      images: [
        { file: "dominance1.png", caption: "Independent" },
        { file: "dominance2.png", caption: "" },
        { file: "dominance3.png", caption: "Neutral" },
        { file: "dominance4.png", caption: "" },
        { file: "dominance5.png", caption: "Dependent" },
      ],
    },
  ];

  // ---------------------------------------------------------------------
  // Deterministic trial-assignment protocol.
  //
  // 24 profiles (P1..P24), 6 participants, 12 VR + 12 2D trials each.
  // Requirements (confirmed with the researcher):
  //   - Per participant, the VR set and 2D set of profiles are disjoint --
  //     a profile is never shown to the same participant in both modalities.
  //   - Modality order is blocked (all 12 of one modality, then all 12 of
  //     the other), not interleaved -- odd participant IDs go VR-block
  //     first, even IDs go 2D-block first.
  //   - Trial order within a block is shuffled once and then fixed (stable
  //     across reloads/resume), not re-randomized per session.
  //
  // The VR/2D split uses a rotating 12-of-24 window: participant i gets a
  // fixed offset, and profile idx is VR if (idx - offset) mod 24 < 12.
  // Participants 1-6 originally used offset (i-1)*4 -- evenly spaced 4
  // apart, giving exactly 3 of the 6 windows over every profile (3x/3x VR-
  // /2D coverage). Participants 7 and 8 were added later at offsets 2 and
  // 14 (deliberately NOT (i-1)*4 continued, which would just replicate
  // participants 1 and 2's windows) -- 2 and 14 sit exactly between the
  // existing offsets, and because the window is exactly half the 24-cycle,
  // adding them brings every single profile from 3x to a perfectly even 4x
  // VR / 4x 2D coverage, without changing offsets 1-6 or anyone's existing
  // assignment at all. Verified exhaustively (all 24 profiles) before
  // shipping, not assumed.
  // ---------------------------------------------------------------------

  const PARTICIPANT_OFFSETS = {
    1: 0, 2: 4, 3: 8, 4: 12, 5: 16, 6: 20,
    7: 2, 8: 14,
  };

  function profilesForParticipant(participantId) {
    const offset = PARTICIPANT_OFFSETS[parseInt(participantId, 10)];
    const vr = [];
    const twoD = [];
    for (let idx = 0; idx < TOTAL_PROFILES; idx++) {
      const rotated = ((idx - offset) % TOTAL_PROFILES + TOTAL_PROFILES) % TOTAL_PROFILES;
      const profileNumber = idx + 1;
      if (rotated < TRIALS_PER_MODALITY) vr.push(profileNumber);
      else twoD.push(profileNumber);
    }
    return { vr, twoD };
  }

  function hashSeed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h >>> 0;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(array, seed) {
    const rand = mulberry32(seed);
    const result = array.slice();
    for (let k = result.length - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1));
      [result[k], result[j]] = [result[j], result[k]];
    }
    return result;
  }

  function buildTrialSequence(participantId) {
    const { vr, twoD } = profilesForParticipant(participantId);
    const vrOrder = seededShuffle(vr, hashSeed(`vr-${participantId}`));
    const twoDOrder = seededShuffle(twoD, hashSeed(`2d-${participantId}`));
    const vrFirst = parseInt(participantId, 10) % 2 === 1;
    const blocks = vrFirst
      ? [{ modality: "VR", profiles: vrOrder }, { modality: "2D", profiles: twoDOrder }]
      : [{ modality: "2D", profiles: twoDOrder }, { modality: "VR", profiles: vrOrder }];
    const sequence = [];
    for (const block of blocks) {
      for (const profile of block.profiles) sequence.push({ modality: block.modality, profile });
    }
    return sequence;
  }

  // ---------------------------------------------------------------------

  const state = {
    participant: null,
    sequence: [],
    trialIndex: 0,
    answers: {},
    panorama: null,
    testMode: false,
  };

  const els = {
    selectScreen: document.getElementById("selectScreen"),
    participantGrid: document.getElementById("participantGrid"),

    viewScreen: document.getElementById("viewScreen"),
    viewImage: document.getElementById("viewImage"),
    viewCanvas: document.getElementById("viewCanvas"),
    viewAudio: document.getElementById("viewAudio"),
    viewPanoramaHint: document.getElementById("viewPanoramaHint"),
    viewStartOverlay: document.getElementById("viewStartOverlay"),
    viewProgressStart: document.getElementById("viewProgressStart"),
    viewStartBtn: document.getElementById("viewStartBtn"),
    viewControls: document.getElementById("viewControls"),
    viewProgressTag: document.getElementById("viewProgressTag"),
    viewEnterXrBtn: document.getElementById("viewEnterXrBtn"),
    viewFinishBtn: document.getElementById("viewFinishBtn"),

    samScreen: document.getElementById("samScreen"),
    samProgressTag: document.getElementById("samProgressTag"),
    samMatrix: document.getElementById("samMatrix"),
    submitSamBtn: document.getElementById("submitSamBtn"),
    samStatus: document.getElementById("samStatus"),

    completeScreen: document.getElementById("completeScreen"),
    completeMessage: document.getElementById("completeMessage"),
    completeBackBtn: document.getElementById("completeBackBtn"),

    testModeToggle: document.getElementById("testModeToggle"),
    testModeBanner: document.getElementById("testModeBanner"),
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function showScreen(name) {
    els.selectScreen.classList.toggle("hidden", name !== "select");
    els.viewScreen.classList.toggle("hidden", name !== "view");
    els.samScreen.classList.toggle("hidden", name !== "sam");
    els.completeScreen.classList.toggle("hidden", name !== "complete");
    // Locked outside the select screen so a mid-session toggle can't submit
    // a trial under a different mode than the one its progress was loaded
    // under -- test mode can only change between participants/trials.
    els.testModeToggle.disabled = name !== "select";
  }

  function updateTestModeBanner() {
    els.testModeBanner.classList.toggle("hidden", !state.testMode);
  }

  // ---------------------------------------------------------------------
  // Participant select screen
  // ---------------------------------------------------------------------

  async function fetchAllResponses() {
    const response = await fetch(`/study2/responses${state.testMode ? "?test=1" : ""}`);
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Loading failed");
    return data.responses || [];
  }

  async function renderParticipantGrid() {
    els.participantGrid.innerHTML = "";
    let counts = {};
    try {
      const rows = await fetchAllResponses();
      for (const row of rows) counts[row.participant] = (counts[row.participant] || 0) + 1;
    } catch {
      // If the progress fetch fails, still let the operator pick a
      // participant -- selectParticipant() re-fetches and will surface the
      // error there instead of blocking the whole select screen.
    }
    for (const id of PARTICIPANTS) {
      const done = counts[id] || 0;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "participant-btn" + (done >= TOTAL_PROFILES ? " complete" : "");
      btn.innerHTML = `Participant ${id}<span class="participant-progress">${done}/${TOTAL_PROFILES} complete</span>`;
      btn.addEventListener("click", () => selectParticipant(id));
      els.participantGrid.appendChild(btn);
    }
  }

  async function selectParticipant(id) {
    state.participant = id;
    state.sequence = buildTrialSequence(id);
    let done = 0;
    try {
      const rows = await fetchAllResponses();
      done = rows.filter((row) => row.participant === id).length;
    } catch (error) {
      alert(`Could not load progress: ${error.message || error}`);
      return;
    }
    state.trialIndex = done;
    if (state.trialIndex >= state.sequence.length) {
      showComplete(`Participant ${id} has completed all ${TOTAL_PROFILES} ratings.`);
      return;
    }
    loadCurrentTrial();
  }

  // ---------------------------------------------------------------------
  // Viewing screen (2D image / VR panorama)
  // ---------------------------------------------------------------------

  function loadCurrentTrial() {
    const trial = state.sequence[state.trialIndex];
    const progressLabel = `Trial ${state.trialIndex + 1} / ${state.sequence.length} · ${trial.modality}`;

    els.viewAudio.pause();
    els.viewAudio.removeAttribute("src");
    els.viewAudio.controls = false;
    els.viewControls.classList.add("hidden");
    els.viewEnterXrBtn.classList.add("hidden");
    els.viewProgressStart.textContent = progressLabel;
    els.viewProgressTag.textContent = progressLabel;
    els.viewStartOverlay.classList.remove("hidden");

    const isVr = trial.modality === "VR";
    els.viewImage.classList.toggle("hidden", isVr);
    els.viewCanvas.classList.toggle("hidden", !isVr);
    els.viewPanoramaHint.classList.toggle("hidden", !isVr);

    if (isVr) {
      els.viewAudio.src = `/record/P${trial.profile}/VR/VRExperienceSFX.wav`;
      if (!state.panorama) state.panorama = createPanoramaViewer(els.viewCanvas);
      if (state.panorama) state.panorama.loadImage(`/record/P${trial.profile}/VR/VRExperiencePanorama.png`);
    } else {
      els.viewImage.src = `/record/P${trial.profile}/2D/image.png`;
      els.viewAudio.src = `/record/P${trial.profile}/2D/sound_effect.mp3`;
    }

    showScreen("view");
  }

  async function startViewing() {
    const trial = state.sequence[state.trialIndex];
    els.viewStartOverlay.classList.add("hidden");
    els.viewControls.classList.remove("hidden");

    if (trial.modality === "VR" && state.panorama) {
      state.panorama.start();
      updateXrButtonVisibility();
    }

    // Play right on this click, before anything else async, so the
    // transient user-activation window from the click isn't lost --
    // otherwise audio.play() gets silently rejected by autoplay policy.
    if (els.viewAudio.src) {
      try {
        await els.viewAudio.play();
      } catch {
        els.viewAudio.controls = true;
      }
    }
  }

  function updateXrButtonVisibility() {
    els.viewEnterXrBtn.classList.add("hidden");
    if (!state.panorama || !state.panorama.supportsXR() || !navigator.xr.isSessionSupported) return;
    navigator.xr.isSessionSupported("immersive-vr")
      .then((supported) => els.viewEnterXrBtn.classList.toggle("hidden", !supported))
      .catch(() => {});
  }

  function finishViewing() {
    els.viewAudio.pause();
    if (state.panorama) {
      state.panorama.stopXR();
      state.panorama.stop();
    }
    renderSamMatrix();
    showScreen("sam");
  }

  // ---------------------------------------------------------------------
  // SAM screen
  // ---------------------------------------------------------------------

  function renderSamMatrix() {
    const trial = state.sequence[state.trialIndex];
    els.samProgressTag.textContent = `Trial ${state.trialIndex + 1} / ${state.sequence.length} · ${trial.modality}`;
    state.answers = { valence: null, arousal: null, dominance: null, confidence: null };
    els.samStatus.textContent = "";
    els.samStatus.className = "status-text";
    els.samMatrix.innerHTML = "";
    els.samMatrix.appendChild(buildDimensionIntro());
    for (const dimension of SAM_DIMENSIONS) els.samMatrix.appendChild(buildDimensionBlock(dimension));
    els.samMatrix.appendChild(buildConfidenceBlock());
    updateSubmitEnabled();
  }

  function buildDimensionIntro() {
    const wrap = document.createElement("div");
    wrap.className = "sam-intro";
    for (const dimension of SAM_DIMENSIONS) {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${escapeHtml(dimension.label)}:</strong> ${escapeHtml(dimension.description)}`;
      wrap.appendChild(p);
    }
    return wrap;
  }

  function buildDimensionBlock(dimension) {
    const wrap = document.createElement("div");
    wrap.className = "sam-dimension";

    const row = document.createElement("div");
    row.className = "sam-row";

    const rowLabel = document.createElement("div");
    rowLabel.className = "sam-row-label";
    rowLabel.textContent = dimension.label;
    row.appendChild(rowLabel);

    const scale = document.createElement("div");
    scale.className = "sam-scale";
    scale.appendChild(buildImagesRow(dimension));
    scale.appendChild(buildRadiosRow(dimension));
    row.appendChild(scale);

    wrap.appendChild(row);
    return wrap;
  }

  function buildImagesRow(dimension) {
    const imagesRow = document.createElement("div");
    imagesRow.className = "sam-images";
    for (let position = 1; position <= 9; position++) {
      const cell = document.createElement("div");
      cell.className = "sam-image-cell";
      if (position % 2 === 1) {
        const image = dimension.images[(position - 1) / 2];
        const img = document.createElement("img");
        img.src = `/sam-assets/${image.file}`;
        img.alt = image.caption || `${dimension.label} ${position}`;
        cell.appendChild(img);
        const caption = document.createElement("span");
        caption.className = "sam-image-caption";
        caption.textContent = image.caption || "";
        cell.appendChild(caption);
      }
      imagesRow.appendChild(cell);
    }
    return imagesRow;
  }

  function buildRadiosRow(dimension) {
    const radiosRow = document.createElement("div");
    radiosRow.className = "sam-radios";
    for (let position = 1; position <= 9; position++) {
      const cell = document.createElement("div");
      cell.className = "sam-radio-cell";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `sam-${dimension.key}`;
      input.value = String(position);
      input.setAttribute("aria-label", `${dimension.label} ${position}`);
      input.addEventListener("change", () => {
        state.answers[dimension.key] = position;
        updateSubmitEnabled();
      });
      cell.appendChild(input);
      radiosRow.appendChild(cell);
    }
    return radiosRow;
  }

  function buildConfidenceBlock() {
    const wrap = document.createElement("div");
    wrap.className = "sam-dimension sam-confidence";

    const desc = document.createElement("p");
    desc.className = "sam-dimension-desc";
    desc.textContent = "How confident are you in your interpretation of the participant's emotional state?";
    wrap.appendChild(desc);

    const scale = document.createElement("div");
    scale.className = "likert-scale";
    for (let value = 1; value <= 7; value++) {
      const cell = document.createElement("label");
      cell.className = "likert-cell";
      const num = document.createElement("span");
      num.className = "likert-number";
      num.textContent = String(value);
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "sam-confidence";
      input.value = String(value);
      input.setAttribute("aria-label", `Confidence ${value}`);
      input.addEventListener("change", () => {
        state.answers.confidence = value;
        updateSubmitEnabled();
      });
      cell.appendChild(num);
      cell.appendChild(input);
      scale.appendChild(cell);
    }
    wrap.appendChild(scale);

    const endpoints = document.createElement("div");
    endpoints.className = "likert-endpoints";
    endpoints.innerHTML = "<span>1 = Not at all confident</span><span>7 = Extremely confident</span>";
    wrap.appendChild(endpoints);

    return wrap;
  }

  function updateSubmitEnabled() {
    const complete = SAM_DIMENSIONS.every((dimension) => state.answers[dimension.key] != null) && state.answers.confidence != null;
    els.submitSamBtn.disabled = !complete;
  }

  async function submitSam() {
    const trial = state.sequence[state.trialIndex];
    els.submitSamBtn.disabled = true;
    els.samStatus.className = "status-text";
    els.samStatus.textContent = "Submitting…";
    try {
      const response = await fetch("/study2/submit-sam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant: state.participant,
          profile: `P${trial.profile}`,
          modality: trial.modality,
          valence: state.answers.valence,
          arousal: state.answers.arousal,
          dominance: state.answers.dominance,
          confidence: state.answers.confidence,
          test: state.testMode,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Submission failed");

      state.trialIndex += 1;
      if (state.trialIndex >= state.sequence.length) {
        showComplete(`Participant ${state.participant} has completed all ${state.sequence.length} ratings. Thank you!`);
      } else {
        loadCurrentTrial();
      }
    } catch (error) {
      els.samStatus.className = "status-text error";
      els.samStatus.textContent = error.message || String(error);
      updateSubmitEnabled();
    }
  }

  // ---------------------------------------------------------------------
  // Completion screen
  // ---------------------------------------------------------------------

  function showComplete(message) {
    els.completeMessage.textContent = message;
    showScreen("complete");
  }

  // ---------------------------------------------------------------------

  els.viewStartBtn.addEventListener("click", startViewing);
  els.viewFinishBtn.addEventListener("click", finishViewing);
  els.viewEnterXrBtn.addEventListener("click", async () => {
    if (!state.panorama) return;
    els.viewEnterXrBtn.disabled = true;
    try {
      await state.panorama.startXR();
    } catch (error) {
      alert(error.message || String(error));
    } finally {
      els.viewEnterXrBtn.disabled = false;
    }
  });
  els.submitSamBtn.addEventListener("click", submitSam);
  els.completeBackBtn.addEventListener("click", () => {
    renderParticipantGrid();
    showScreen("select");
  });
  els.testModeToggle.addEventListener("change", () => {
    state.testMode = els.testModeToggle.checked;
    updateTestModeBanner();
    renderParticipantGrid();
  });

  renderParticipantGrid();
  updateTestModeBanner();
  showScreen("select");
})();
