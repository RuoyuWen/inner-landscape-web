(() => {
  "use strict";

  const PARTICIPANTS = ["1", "2", "3", "4", "5", "6", "7", "8"];
  // Participants 7-8 were added after the original 6; the researcher wants
  // to be able to export that cohort on its own, separate from 1-6.
  const EXTRA_COHORT = ["7", "8"];
  const TOTAL_TRIALS = 24;

  const els = {
    refreshBtn: document.getElementById("refreshBtn"),
    progressGrid: document.getElementById("progressGrid"),
    resultsBody: document.getElementById("resultsBody"),
    wideBody: document.getElementById("wideBody"),
    testModeToggle: document.getElementById("testModeToggle"),
    testModeBanner: document.getElementById("testModeBanner"),
    downloadCsvBtn: document.getElementById("downloadCsvBtn"),
    downloadWideCsvBtn: document.getElementById("downloadWideCsvBtn"),
    downloadCohortCsvBtn: document.getElementById("downloadCohortCsvBtn"),
    downloadCohortWideCsvBtn: document.getElementById("downloadCohortWideCsvBtn"),
  };

  function updateDownloadLink() {
    const testMode = els.testModeToggle.checked;
    const testSuffix = testMode ? "&test=1" : "";
    els.downloadCsvBtn.href = `/study2/responses.csv${testMode ? "?test=1" : ""}`;
    els.downloadCsvBtn.download = testMode ? "study2_responses_test.csv" : "study2_responses.csv";
    els.downloadWideCsvBtn.href = `/study2/responses-wide.csv${testMode ? "?test=1" : ""}`;
    els.downloadWideCsvBtn.download = testMode ? "study2_responses_wide_test.csv" : "study2_responses_wide.csv";
    els.testModeBanner.classList.toggle("hidden", !testMode);

    const cohortParam = `participants=${EXTRA_COHORT.join(",")}`;
    els.downloadCohortCsvBtn.href = `/study2/responses.csv?${cohortParam}${testSuffix}`;
    els.downloadCohortCsvBtn.download = `study2_responses_${EXTRA_COHORT.join("-")}${testMode ? "_test" : ""}.csv`;
    els.downloadCohortWideCsvBtn.href = `/study2/responses-wide.csv?${cohortParam}${testSuffix}`;
    els.downloadCohortWideCsvBtn.download = `study2_responses_wide_${EXTRA_COHORT.join("-")}${testMode ? "_test" : ""}.csv`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function formatTimestamp(value) {
    if (!value || !/^\d{14}$/.test(value)) return value || "";
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`;
  }

  async function loadResults() {
    const testSuffix = els.testModeToggle.checked ? "?test=1" : "";
    els.progressGrid.innerHTML = `<p class="notice">Loading…</p>`;
    els.wideBody.innerHTML = `<tr><td colspan="7">Loading…</td></tr>`;
    els.resultsBody.innerHTML = `<tr><td colspan="9">Loading…</td></tr>`;
    try {
      const [longResponse, wideResponse] = await Promise.all([
        fetch(`/study2/responses${testSuffix}`),
        fetch(`/study2/responses-wide${testSuffix}`),
      ]);
      const longData = await longResponse.json();
      if (!longResponse.ok || !longData.ok) throw new Error(longData.error || "Loading failed");
      const wideData = await wideResponse.json();
      if (!wideResponse.ok || !wideData.ok) throw new Error(wideData.error || "Loading failed");

      renderProgress(longData.responses || []);
      renderTable(longData.responses || []);
      renderWideTable(wideData.rows || []);
    } catch (error) {
      const message = `Loading failed: ${escapeHtml(error.message || String(error))}`;
      els.progressGrid.innerHTML = `<p class="notice">${message}</p>`;
      els.wideBody.innerHTML = `<tr><td colspan="7">${message}</td></tr>`;
      els.resultsBody.innerHTML = `<tr><td colspan="9">${message}</td></tr>`;
    }
  }

  function renderProgress(rows) {
    const counts = {};
    for (const row of rows) counts[row.participant] = (counts[row.participant] || 0) + 1;

    els.progressGrid.innerHTML = "";
    for (const id of PARTICIPANTS) {
      const done = counts[id] || 0;
      const card = document.createElement("div");
      card.className = "participant-btn" + (done >= TOTAL_TRIALS ? " complete" : "");
      card.innerHTML = `Participant ${escapeHtml(id)}<span class="participant-progress">${done}/${TOTAL_TRIALS} complete</span>`;
      els.progressGrid.appendChild(card);
    }
  }

  function reviewerCell(row, i) {
    const participant = row[`reviewer${i}_participant`];
    if (!participant) return `<td class="pending">—</td>`;
    const v = row[`reviewer${i}_valence`];
    const a = row[`reviewer${i}_arousal`];
    const d = row[`reviewer${i}_dominance`];
    const c = row[`reviewer${i}_confidence`];
    return `<td class="reviewer-cell"><span class="reviewer-id">P${escapeHtml(participant)}</span>${escapeHtml(v)}/${escapeHtml(a)}/${escapeHtml(d)} · conf ${escapeHtml(c)}</td>`;
  }

  function renderWideTable(rows) {
    els.wideBody.innerHTML = "";
    if (rows.length === 0) {
      els.wideBody.innerHTML = `<tr><td colspan="7" class="pending">No submissions yet</td></tr>`;
      return;
    }
    for (const row of rows) {
      const hasOriginal = row.original_valence || row.original_arousal || row.original_dominance;
      const originalCell = hasOriginal
        ? `${escapeHtml(row.original_valence)}/${escapeHtml(row.original_arousal)}/${escapeHtml(row.original_dominance)}`
        : `<span class="pending">Not entered</span>`;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(row.profile)}</td>
        <td>${escapeHtml(row.modality)}</td>
        <td>${originalCell}</td>
        ${reviewerCell(row, 1)}
        ${reviewerCell(row, 2)}
        ${reviewerCell(row, 3)}
        ${reviewerCell(row, 4)}
      `;
      els.wideBody.appendChild(tr);
    }
  }

  function renderTable(rows) {
    els.resultsBody.innerHTML = "";
    if (rows.length === 0) {
      els.resultsBody.innerHTML = `<tr><td colspan="9" class="pending">No submissions yet</td></tr>`;
      return;
    }
    // Newest first is more useful while a study session is actively running.
    const ordered = rows.slice().reverse();
    ordered.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${rows.length - idx}</td>
        <td>Participant ${escapeHtml(row.participant)}</td>
        <td>${escapeHtml(row.profile)}</td>
        <td>${escapeHtml(row.modality)}</td>
        <td>${escapeHtml(row.valence)}</td>
        <td>${escapeHtml(row.arousal)}</td>
        <td>${escapeHtml(row.dominance)}</td>
        <td>${escapeHtml(row.confidence)}</td>
        <td>${escapeHtml(formatTimestamp(row.timestamp))}</td>
      `;
      els.resultsBody.appendChild(tr);
    });
  }

  els.refreshBtn.addEventListener("click", loadResults);
  els.testModeToggle.addEventListener("change", () => {
    updateDownloadLink();
    loadResults();
  });
  updateDownloadLink();
  loadResults();
})();
