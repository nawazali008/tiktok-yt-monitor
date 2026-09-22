// State & Config
const DEFAULT_REPO = "nawazali008/tiktok-yt-automation-1";

// Safely extract token from URL fragment (e.g. #token=ghp_...) without exposing in code
if (window.location.hash && window.location.hash.includes("token=")) {
  const match = window.location.hash.match(/token=([^&]+)/);
  if (match && match[1]) {
    localStorage.setItem("yt_monitor_token", decodeURIComponent(match[1]));
    history.replaceState(null, null, window.location.pathname);
  }
}

let repo = localStorage.getItem("yt_monitor_repo") || DEFAULT_REPO;
let token = localStorage.getItem("yt_monitor_token") || "";

// PWA Deferred Prompt
let deferredPrompt = null;

// DOM Elements
const refreshBtn = document.getElementById("refreshBtn");
const settingsBtn = document.getElementById("settingsBtn");
const installBanner = document.getElementById("installBanner");
const installAppBtn = document.getElementById("installAppBtn");
const serverHealthPill = document.getElementById("serverHealthPill");
const serverHealthText = document.getElementById("serverHealthText");
const slot1Countdown = document.getElementById("slot1Countdown");
const slot2Countdown = document.getElementById("slot2Countdown");
const triggerSlot1Btn = document.getElementById("triggerSlot1Btn");
const triggerSlot2Btn = document.getElementById("triggerSlot2Btn");
const runsList = document.getElementById("runsList");
const logsModal = document.getElementById("logsModal");
const modalRunTitle = document.getElementById("modalRunTitle");
const modalLogBody = document.getElementById("modalLogBody");
const closeModalBtn = document.getElementById("closeModalBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const settingRepo = document.getElementById("settingRepo");
const settingToken = document.getElementById("settingToken");
const toast = document.getElementById("toast");

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.log("ServiceWorker registration failed: ", err);
    });
  });
}

// Handle PWA Install Prompt
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBanner) installBanner.style.display = "flex";
});

if (installAppBtn) {
  installAppBtn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        installBanner.style.display = "none";
      }
      deferredPrompt = null;
    }
  });
}

function showToast(message, isError = false) {
  toast.innerText = message;
  toast.style.background = isError ? "#ef4444" : "#10b981";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

// GitHub API Headers
function getHeaders() {
  const h = {
    "Accept": "application/vnd.github.v3+json"
  };
  if (token) {
    h["Authorization"] = `token ${token}`;
  }
  return h;
}

// Fetch Workflow Runs
async function fetchRuns() {
  refreshBtn.classList.add("spin");
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=10`, {
      headers: getHeaders()
    });

    if (!res.ok) {
      serverHealthText.innerText = "RATE LIMITED / CHECK TOKEN";
      serverHealthPill.style.background = "rgba(239, 68, 68, 0.2)";
      serverHealthPill.style.color = "#ef4444";
      runsList.innerHTML = `<div style="padding: 16px; color:#ef4444; font-size:0.85rem;">Error fetching runs: ${res.statusText}</div>`;
      return;
    }

    const data = await res.json();
    const runs = data.workflow_runs || [];

    if (runs.length === 0) {
      runsList.innerHTML = `<div style="padding: 20px; color: var(--text-dim); text-align: center;">No runs found</div>`;
      return;
    }

    // Determine current health
    const latest = runs[0];
    if (latest.status === "in_progress" || latest.status === "queued") {
      serverHealthText.innerText = "RUNNING WORKFLOW";
      serverHealthPill.style.background = "rgba(59, 130, 246, 0.2)";
      serverHealthPill.style.color = "#3b82f6";
    } else if (latest.conclusion === "success") {
      serverHealthText.innerText = "SERVER ONLINE (SUCCESS)";
      serverHealthPill.style.background = "rgba(16, 185, 129, 0.2)";
      serverHealthPill.style.color = "#10b981";
    } else {
      serverHealthText.innerText = "ATTENTION REQUIRED";
      serverHealthPill.style.background = "rgba(239, 68, 68, 0.2)";
      serverHealthPill.style.color = "#ef4444";
    }

    renderRuns(runs);
  } catch (err) {
    serverHealthText.innerText = "NETWORK ERROR";
    serverHealthPill.style.background = "rgba(239, 68, 68, 0.2)";
    serverHealthPill.style.color = "#ef4444";
  } finally {
    refreshBtn.classList.remove("spin");
  }
}

// Render Runs in UI
function renderRuns(runs) {
  runsList.innerHTML = "";
  runs.forEach((run) => {
    const isSuccess = run.conclusion === "success";
    const isRunning = run.status === "in_progress" || run.status === "queued";
    const statusColor = isRunning ? "var(--status-info)" : isSuccess ? "var(--status-success)" : "var(--status-danger)";
    const statusText = isRunning ? "RUNNING" : (run.conclusion || run.status).toUpperCase();

    const date = new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ", " + new Date(run.created_at).toLocaleDateString();

    const item = document.createElement("div");
    item.className = "run-item";
    item.innerHTML = `
      <div class="run-info">
        <div class="run-title">${run.name}</div>
        <div class="run-date">${date} • #${run.run_number}</div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:0.75rem; font-weight:700; color:${statusColor}">${statusText}</span>
        <button class="log-btn" data-runid="${run.id}" data-name="${run.name} #${run.run_number}">Logs</button>
      </div>
    `;
    runsList.appendChild(item);
  });

  // Attach Log Click Handlers
  document.querySelectorAll(".log-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openLogModal(btn.dataset.runid, btn.dataset.name);
    });
  });
}

// Open Logs Modal
async function openLogModal(runId, runTitle) {
  modalRunTitle.innerText = `Logs: ${runTitle}`;
  modalLogBody.innerText = "Fetching step details from runner...";
  logsModal.classList.add("active");

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`, {
      headers: getHeaders()
    });
    const data = await res.json();
    const jobs = data.jobs || [];

    if (jobs.length === 0) {
      modalLogBody.innerText = "No job details available.";
      return;
    }

    let output = "";
    jobs.forEach((job) => {
      output += `Job: ${job.name} [${job.conclusion || job.status}]\n`;
      output += `Started: ${job.started_at}\n`;
      output += `Completed: ${job.completed_at || 'In progress'}\n`;
      output += `-------------------------------------------------\n`;
      job.steps.forEach((step) => {
        const icon = step.conclusion === "success" ? "✓" : step.conclusion === "failure" ? "✗" : "•";
        output += `${icon} Step ${step.number}: ${step.name} [${step.conclusion || step.status}]\n`;
      });
      output += `\n`;
    });

    modalLogBody.innerText = output;
  } catch (err) {
    modalLogBody.innerText = `Error retrieving logs: ${err.message}`;
  }
}

// Trigger Workflow
async function triggerSlot(slotNumber) {
  const workflowFile = `upload-slot${slotNumber}.yml`;
  showToast(`Triggering Slot ${slotNumber}...`);

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        ref: "main",
        inputs: {
          channel: "channel_1",
          dry_run: "false"
        }
      })
    });

    if (res.status === 204) {
      showToast(`Slot ${slotNumber} dispatched to cloud runner!`);
      setTimeout(fetchRuns, 2000);
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(`Failed: ${err.message || res.statusText}`, true);
    }
  } catch (err) {
    showToast(`Network error triggering slot ${slotNumber}`, true);
  }
}

// Countdown Calculation
function updateCountdowns() {
  const now = new Date();

  // Slot 1: 22:00 UTC
  const slot1Target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0));
  if (now > slot1Target) slot1Target.setUTCDate(slot1Target.getUTCDate() + 1);

  // Slot 2: 00:00 UTC (Next day start)
  const slot2Target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 24, 0, 0));

  formatCountdown(slot1Target - now, slot1Countdown);
  formatCountdown(slot2Target - now, slot2Countdown);
}

function formatCountdown(ms, element) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  element.innerText = `${hours}:${minutes}:${seconds}`;
}

// Event Listeners
refreshBtn.addEventListener("click", fetchRuns);
triggerSlot1Btn.addEventListener("click", () => triggerSlot(1));
triggerSlot2Btn.addEventListener("click", () => triggerSlot(2));

closeModalBtn.addEventListener("click", () => logsModal.classList.remove("active"));
logsModal.addEventListener("click", (e) => {
  if (e.target === logsModal) logsModal.classList.remove("active");
});

settingsBtn.addEventListener("click", () => {
  settingRepo.value = repo;
  settingToken.value = token;
  settingsModal.classList.add("active");
});

closeSettingsBtn.addEventListener("click", () => settingsModal.classList.remove("active"));
saveSettingsBtn.addEventListener("click", () => {
  repo = settingRepo.value.trim() || DEFAULT_REPO;
  token = settingToken.value.trim() || DEFAULT_TOKEN;
  localStorage.setItem("yt_monitor_repo", repo);
  localStorage.setItem("yt_monitor_token", token);
  settingsModal.classList.remove("active");
  showToast("Configuration saved!");
  fetchRuns();
});

// Initialization
updateCountdowns();
setInterval(updateCountdowns, 1000);
fetchRuns();
