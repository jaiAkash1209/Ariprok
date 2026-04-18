const state = {
  currentMode: "desktop",
  stream: null,
  framesReviewed: 0,
  pestsFlagged: 0,
};

const ui = {
  sourceModes: document.getElementById("sourceModes"),
  liveVideo: document.getElementById("liveVideo"),
  videoPlaceholder: document.getElementById("videoPlaceholder"),
  placeholderTitle: document.getElementById("placeholderTitle"),
  placeholderText: document.getElementById("placeholderText"),
  fileInput: document.getElementById("fileInput"),
  startSession: document.getElementById("startSession"),
  simulateAlert: document.getElementById("simulateAlert"),
  desktopConnect: document.getElementById("desktopConnect"),
  phonePair: document.getElementById("phonePair"),
  connectStream: document.getElementById("connectStream"),
  streamInput: document.getElementById("streamInput"),
  systemStatus: document.getElementById("systemStatus"),
  riskValue: document.getElementById("riskValue"),
  pairingStatus: document.getElementById("pairingStatus"),
  phoneBadge: document.getElementById("phoneBadge"),
  fpsBadge: document.getElementById("fpsBadge"),
  framesReviewed: document.getElementById("framesReviewed"),
  pestsFlagged: document.getElementById("pestsFlagged"),
  lastEvent: document.getElementById("lastEvent"),
  leafRisk: document.getElementById("leafRisk"),
  trapRisk: document.getElementById("trapRisk"),
  timeline: document.getElementById("timeline"),
  timelineTemplate: document.getElementById("timelineTemplate"),
  clearLog: document.getElementById("clearLog"),
};

const modeMessages = {
  desktop: {
    title: "Desktop webcam ready",
    text: "Use this mode for quick testing on the same machine before we connect the phone stream.",
  },
  phone: {
    title: "Phone camera bridge planned",
    text: "This UI is ready for a future WebRTC or IP-camera connection from your mobile device.",
  },
  upload: {
    title: "Upload a field image or clip",
    text: "Great for testing pest screens with existing crop footage before a live stream is attached.",
  },
};

function setMode(mode) {
  state.currentMode = mode;
  [...ui.sourceModes.querySelectorAll("[data-mode]")].forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });

  const content = modeMessages[mode];
  ui.placeholderTitle.textContent = content.title;
  ui.placeholderText.textContent = content.text;
}

function setMonitoringState(status) {
  ui.systemStatus.textContent = status;
  ui.fpsBadge.textContent = status === "Monitoring" ? "24 FPS" : status;
}

function updateStats() {
  ui.framesReviewed.textContent = String(state.framesReviewed).padStart(3, "0");
  ui.pestsFlagged.textContent = String(state.pestsFlagged).padStart(2, "0");
}

function addLog(title, body) {
  const fragment = ui.timelineTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".timeline__item");
  item.querySelector(".timeline__time").textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  item.querySelector("h3").textContent = title;
  item.querySelector("p").textContent = body;
  ui.timeline.prepend(item);
}

function showVideo() {
  ui.liveVideo.style.display = "block";
  ui.videoPlaceholder.style.display = "none";
}

function showPlaceholder() {
  ui.liveVideo.style.display = "none";
  ui.videoPlaceholder.style.display = "grid";
}

async function startDesktopCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    addLog("Camera not supported", "This browser does not allow webcam access in the current environment.");
    ui.lastEvent.textContent = "Webcam not supported";
    return;
  }

  try {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    state.stream = stream;
    ui.liveVideo.srcObject = stream;
    showVideo();
    setMode("desktop");
    setMonitoringState("Monitoring");
    ui.riskValue.textContent = "Scanning";
    ui.lastEvent.textContent = "Desktop webcam active";
    addLog("Desktop feed connected", "Live camera has started. Detection overlays can now be attached in the next phase.");
  } catch (error) {
    showPlaceholder();
    addLog("Camera permission blocked", "Webcam access was denied or unavailable. You can still test the UI with an uploaded field clip.");
    ui.lastEvent.textContent = "Camera permission blocked";
  }
}

function preparePhoneMode() {
  setMode("phone");
  setMonitoringState("Pairing");
  ui.pairingStatus.textContent = "Ready to Pair";
  ui.phoneBadge.textContent = "WebRTC / IP Camera";
  ui.lastEvent.textContent = "Phone pairing prepared";
  addLog("Phone bridge prepared", "The desktop dashboard is staged for a future mobile camera connection.");
}

function simulateDetection() {
  state.framesReviewed += 24;
  state.pestsFlagged += 1;
  updateStats();
  setMonitoringState("Monitoring");
  ui.riskValue.textContent = "Medium";
  ui.leafRisk.textContent = "Possible Aphids";
  ui.trapRisk.textContent = "Check Needed";
  ui.lastEvent.textContent = "Leaf anomaly detected";
  addLog("Pest candidate flagged", "Movement and leaf damage pattern matched a watchlist condition. Review this zone and validate with the next AI model.");
}

function connectFutureStream() {
  const value = ui.streamInput.value.trim();
  if (!value) {
    addLog("Missing stream target", "Enter a future session code or phone stream URL before connecting.");
    return;
  }

  ui.pairingStatus.textContent = "Session Saved";
  ui.phoneBadge.textContent = "Awaiting Backend";
  ui.lastEvent.textContent = "Phone stream target stored";
  addLog("Connection placeholder saved", `Stored future phone stream target: ${value}`);
}

function handleFileLoad(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }

  setMode("upload");
  showVideo();
  ui.liveVideo.src = URL.createObjectURL(file);
  ui.liveVideo.srcObject = null;
  ui.liveVideo.controls = true;
  ui.liveVideo.muted = true;
  ui.liveVideo.play().catch(() => {});
  setMonitoringState("Reviewing");
  ui.riskValue.textContent = "Manual Review";
  ui.lastEvent.textContent = `Loaded ${file.name}`;
  addLog("Reference media loaded", `Loaded ${file.name} for offline pest review and UI testing.`);
}

function clearTimeline() {
  ui.timeline.innerHTML = "";
  addLog("Log cleared", "The event feed was reset for the next monitoring session.");
}

ui.sourceModes.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button) {
    return;
  }
  setMode(button.dataset.mode);
});

ui.startSession.addEventListener("click", startDesktopCamera);
ui.desktopConnect.addEventListener("click", startDesktopCamera);
ui.phonePair.addEventListener("click", preparePhoneMode);
ui.simulateAlert.addEventListener("click", simulateDetection);
ui.connectStream.addEventListener("click", connectFutureStream);
ui.fileInput.addEventListener("change", handleFileLoad);
ui.clearLog.addEventListener("click", clearTimeline);

updateStats();
setMode("desktop");
