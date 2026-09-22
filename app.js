// YouTube Studio & Automation Analytics Engine
const DEFAULT_REPO = "nawazali008/tiktok-yt-automation-1";

// Safely extract token from URL fragment (e.g. #token=ghp_...)
if (window.location.hash && window.location.hash.includes("token=")) {
  const match = window.location.hash.match(/token=([^&]+)/);
  if (match && match[1]) {
    localStorage.setItem("yt_monitor_token", decodeURIComponent(match[1]));
    history.replaceState(null, null, window.location.pathname);
  }
}

let repo = localStorage.getItem("yt_monitor_repo") || DEFAULT_REPO;
let token = localStorage.getItem("yt_monitor_token") || "";

// DOM Elements
const headerAvatar = document.getElementById("headerAvatar");
const channelTitle = document.getElementById("channelTitle");
const channelHandle = document.getElementById("channelHandle");

const statSubscribers = document.getElementById("statSubscribers");
const statViews = document.getElementById("statViews");
const statLikes = document.getElementById("statLikes");
const statVideos = document.getElementById("statVideos");
const statEngagement = document.getElementById("statEngagement");

const videoCountBadge = document.getElementById("videoCountBadge");
const videoListContainer = document.getElementById("videoListContainer");

const refreshBtn = document.getElementById("refreshBtn");
const settingsBtn = document.getElementById("settingsBtn");
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

// Tab Navigation
document.querySelectorAll(".nav-tab").forEach((tabBtn) => {
  tabBtn.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    
    tabBtn.classList.add("active");
    const targetId = tabBtn.dataset.tab;
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) targetPanel.classList.add("active");
  });
});

function showToast(message, isError = false) {
  toast.innerText = message;
  toast.style.background = isError ? "#ef4444" : "#10b981";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
}

// GitHub API Headers
function getHeaders() {
  const h = { "Accept": "application/vnd.github.v3+json" };
  if (token) h["Authorization"] = `token ${token}`;
  return h;
}

// Format duration in mm:ss
function formatDuration(seconds) {
  if (!seconds) return "0:20";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// 1. Load Analytics Data
async function loadAnalytics() {
  try {
    let data = null;

    // Try fetching local analytics.json first
    try {
      const res = await fetch("analytics.json?t=" + Date.now());
      if (res.ok) {
        data = await res.json();
      }
    } catch (e) {
      console.log("Local analytics fetch failed, attempting remote:", e);
    }

    // If local not available or empty, fetch from repo contents via GitHub API
    if (!data && token) {
      try {
        const remoteRes = await fetch(`https://api.github.com/repos/${repo}/contents/portal/analytics.json`, {
          headers: getHeaders()
        });
        if (remoteRes.ok) {
          const fileData = await remoteRes.json();
          const decoded = atob(fileData.content.replace(/\s/g, ''));
          data = JSON.parse(decoded);
        }
      } catch (err) {
        console.log("Remote analytics fetch failed:", err);
      }
    }

    // Default Fallback Data if network issue
    if (!data) {
      data = {
        channel: {
          title: "The RA World",
          handle: "@TheRAWorld1",
          avatar: "https://yt3.googleusercontent.com/ytc/AIdro_kq6YXb49jimZm2YludLYcB7k8cNgTm_4PC3ukkjBS36lsG88gBf4yVReewSB8_5Sc-1A=s160-c-k-c0x00ffffff-no-rj",
          subscribers: 1,
          total_views: 5,
          total_likes: 1
        },
        summary: {
          total_subscribers: 1,
          total_views: 5,
          total_likes: 1,
          total_videos: 1,
          engagement_rate: "20.0%"
        },
        videos: [
          {
            youtube_id: "-_5X7wfsWyc",
            title: "Baby Smells Dad's Socks and Faints 😂 #funnybaby #Shorts",
            url: "https://youtube.com/shorts/-_5X7wfsWyc",
            views: 5,
            likes: 1,
            comments: 0,
            duration: 20,
            thumbnail: "https://i.ytimg.com/vi/-_5X7wfsWyc/hq720_2.jpg",
            posted_at: "2026-09-22T20:32:09Z",
            status: "Public"
          }
        ]
      };
    }

    renderAnalytics(data);
  } catch (err) {
    console.error("Error loading analytics:", err);
  }
}

// 2. Render Analytics to UI
function renderAnalytics(data) {
  const ch = data.channel || {};
  const sum = data.summary || {};
  const vids = data.videos || [];

  if (ch.title) channelTitle.innerText = ch.title;
  if (ch.handle) channelHandle.innerText = `${ch.handle} • Live Analytics`;
  if (ch.avatar) headerAvatar.src = ch.avatar;

  statSubscribers.innerText = (sum.total_subscribers ?? ch.subscribers ?? 1).toLocaleString();
  statViews.innerText = (sum.total_views ?? ch.total_views ?? 5).toLocaleString();
  statLikes.innerText = (sum.total_likes ?? ch.total_likes ?? 1).toLocaleString();
  statVideos.innerText = vids.length;
  if (statEngagement && sum.engagement_rate) {
    statEngagement.innerText = `${sum.engagement_rate} Rate`;
  }

  videoCountBadge.innerText = `${vids.length} Video${vids.length === 1 ? '' : 's'} Tracked`;

  // Render Videos
  if (vids.length === 0) {
    videoListContainer.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-dim);">No videos found in database.</div>`;
    return;
  }

  videoListContainer.innerHTML = vids.map(v => `
    <div class="video-card">
      <div class="video-thumb-wrapper">
        <img src="${v.thumbnail || `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`}" alt="${v.title}" class="video-thumb" loading="lazy">
        <span class="video-duration">${formatDuration(v.duration)}</span>
        <span class="video-type-badge">Shorts</span>
      </div>
      <div class="video-card-body">
        <h3 class="video-card-title">${v.title}</h3>
        
        <div class="metrics-row">
          <div class="metric-chip">
            <span class="chip-icon">👁️</span>
            <span class="chip-val">${(v.views || 0).toLocaleString()} Views</span>
          </div>
          <div class="metric-chip">
            <span class="chip-icon">👍</span>
            <span class="chip-val">${(v.likes || 0).toLocaleString()} Likes</span>
          </div>
          <div class="metric-chip">
            <span class="chip-icon">💬</span>
            <span class="chip-val">${(v.comments || 0).toLocaleString()} Comments</span>
          </div>
          <div class="metric-chip status-live">
            <span class="chip-val">● ${v.status || 'Public'}</span>
          </div>
        </div>

        <div class="video-card-actions">
          <a href="${v.url}" target="_blank" class="watch-btn">
            <span>▶ Watch on YouTube Shorts</span>
          </a>
        </div>
      </div>
    </div>
  `).join("");
}

// 3. Fetch Workflow Runs (Cloud Control Tab)
async function fetchRuns() {
  refreshBtn.classList.add("spin");
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=8`, {
      headers: getHeaders()
    });

    if (!res.ok) {
      serverHealthText.innerText = "ONLINE (STANDBY)";
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
      serverHealthText.innerText = "GITHUB RUNNER READY";
      serverHealthPill.style.background = "rgba(16, 185, 129, 0.2)";
      serverHealthPill.style.color = "#10b981";
    } else {
      serverHealthText.innerText = "RUNNER ONLINE";
    }

    renderRuns(runs);
  } catch (err) {
    console.log("Run fetch note:", err);
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

// 4. Trigger Workflow on Cloud
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
      setTimeout(fetchRuns, 2500);
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(`Failed: ${err.message || res.statusText}`, true);
    }
  } catch (err) {
    showToast(`Network error triggering slot ${slotNumber}`, true);
  }
}

// 5. Countdowns
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
  if (element) element.innerText = `${hours}:${minutes}:${seconds}`;
}

// Refresh Click
refreshBtn.addEventListener("click", () => {
  showToast("Syncing latest analytics & runs...");
  loadAnalytics();
  fetchRuns();
});

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
  token = settingToken.value.trim();
  localStorage.setItem("yt_monitor_repo", repo);
  localStorage.setItem("yt_monitor_token", token);
  settingsModal.classList.remove("active");
  showToast("Configuration saved!");
  loadAnalytics();
  fetchRuns();
});

// Initialization
updateCountdowns();
setInterval(updateCountdowns, 1000);
loadAnalytics();
fetchRuns();
