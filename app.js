const state = {
  currentMode: "desktop",
  stream: null,
  pollTimer: null,
};

const ui = {
  sourceModes: document.getElementById("sourceModes"),
  liveVideo: document.getElementById("liveVideo"),
  videoPlaceholder: document.getElementById("videoPlaceholder"),
  detectionBox: document.getElementById("detectionBox"),
  detectionLabel: document.getElementById("detectionLabel"),
  placeholderTitle: document.getElementById("placeholderTitle"),
  placeholderText: document.getElementById("placeholderText"),
  fileInput: document.getElementById("fileInput"),
  startSession: document.getElementById("startSession"),
  simulateAlert: document.getElementById("simulateAlert"),
  simulateTelemetry: document.getElementById("simulateTelemetry"),
  desktopConnect: document.getElementById("desktopConnect"),
  phonePair: document.getElementById("phonePair"),
  connectStream: document.getElementById("connectStream"),
  streamInput: document.getElementById("streamInput"),
  systemStatus: document.getElementById("systemStatus"),
  riskValue: document.getElementById("riskValue"),
  pairingStatus: document.getElementById("pairingStatus"),
  matlabStatus: document.getElementById("matlabStatus"),
  esp32Status: document.getElementById("esp32Status"),
  deviceId: document.getElementById("deviceId"),
  lastSync: document.getElementById("lastSync"),
  phoneBadge: document.getElementById("phoneBadge"),
  fpsBadge: document.getElementById("fpsBadge"),
  framesReviewed: document.getElementById("framesReviewed"),
  pestsFlagged: document.getElementById("pestsFlagged"),
  lastEvent: document.getElementById("lastEvent"),
  leafRisk: document.getElementById("leafRisk"),
  trapRisk: document.getElementById("trapRisk"),
  soilRisk: document.getElementById("soilRisk"),
  soilRiskText: document.getElementById("soilRiskText"),
  nitrogenValue: document.getElementById("nitrogenValue"),
  nitrogenHint: document.getElementById("nitrogenHint"),
  phosphorusValue: document.getElementById("phosphorusValue"),
  phosphorusHint: document.getElementById("phosphorusHint"),
  potassiumValue: document.getElementById("potassiumValue"),
  potassiumHint: document.getElementById("potassiumHint"),
  environmentValue: document.getElementById("environmentValue"),
  environmentHint: document.getElementById("environmentHint"),
  timeline: document.getElementById("timeline"),
  timelineTemplate: document.getElementById("timelineTemplate"),
  clearLog: document.getElementById("clearLog"),
};

const modeMessages = {
  desktop: {
    title: "Desktop webcam ready",
    text: "Use this mode for quick local testing while the backend waits for MATLAB and ESP32 payloads.",
  },
  phone: {
    title: "Phone camera bridge planned",
    text: "This mode will accept your mobile stream session once we wire the phone camera sender page.",
  },
  upload: {
    title: "Upload a field image or clip",
    text: "Use this mode to test the dashboard with recorded crop media before a live stream is attached.",
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

function setBadgeText(status, pairingStatus) {
  if (state.currentMode === "phone") {
    ui.phoneBadge.textContent = pairingStatus === "Session Saved" ? "Target Stored" : "WebRTC / IP Camera";
    return;
  }

  ui.phoneBadge.textContent = status === "Alert" ? "Attention Needed" : "Planned Connection";
}

function showVideo() {
  ui.liveVideo.style.display = "block";
  ui.videoPlaceholder.style.display = "none";
}

function showPlaceholder() {
  ui.liveVideo.style.display = "none";
  ui.videoPlaceholder.style.display = "grid";
}

function hideDetectionOverlay() {
  ui.detectionBox.classList.add("is-hidden");
}

function renderDetectionOverlay(latestDetection) {
  const box = latestDetection?.boundingBox;
  if (!box) {
    hideDetectionOverlay();
    return;
  }

  ui.detectionBox.style.left = `${box.x * 100}%`;
  ui.detectionBox.style.top = `${box.y * 100}%`;
  ui.detectionBox.style.width = `${box.width * 100}%`;
  ui.detectionBox.style.height = `${box.height * 100}%`;
  ui.detectionLabel.textContent = `${latestDetection.pestName} ${(latestDetection.confidence * 100).toFixed(0)}%`;
  ui.detectionBox.classList.remove("is-hidden");
}

function formatLastSync(value) {
  if (!value) {
    return "Not synced";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderSensorValue(value, suffix = "") {
  return typeof value === "number" ? `${value}${suffix}` : "--";
}

function renderTimeline(events) {
  ui.timeline.innerHTML = "";

  events.forEach((event) => {
    const fragment = ui.timelineTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".timeline__item");
    item.querySelector(".timeline__time").textContent = new Date(event.time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    item.querySelector("h3").textContent = event.title;
    item.querySelector("p").textContent = event.body;
    ui.timeline.append(item);
  });
}

function applyState(data) {
  ui.systemStatus.textContent = data.systemStatus;
  ui.riskValue.textContent = data.currentRisk;
  ui.pairingStatus.textContent = data.pairingStatus;
  ui.matlabStatus.textContent = data.matlabStatus;
  ui.esp32Status.textContent = data.esp32Status;
  ui.deviceId.textContent = data.deviceId;
  ui.lastSync.textContent = formatLastSync(data.lastSync);
  ui.framesReviewed.textContent = String(data.session.framesReviewed).padStart(3, "0");
  ui.pestsFlagged.textContent = String(data.session.pestsFlagged).padStart(2, "0");
  ui.lastEvent.textContent = data.session.lastEvent;
  ui.leafRisk.textContent = data.detection.leafRisk;
  ui.trapRisk.textContent = data.detection.trapRisk;
  ui.soilRisk.textContent = data.detection.soilRisk;
  ui.soilRiskText.textContent = data.detection.soilRiskText;
  ui.streamInput.value = data.phoneStreamTarget || "";
  ui.fpsBadge.textContent = data.fps;

  ui.nitrogenValue.textContent = renderSensorValue(data.sensors.nitrogen, " mg/kg");
  ui.phosphorusValue.textContent = renderSensorValue(data.sensors.phosphorus, " mg/kg");
  ui.potassiumValue.textContent = renderSensorValue(data.sensors.potassium, " mg/kg");

  const temperature = renderSensorValue(data.sensors.temperature, " C");
  const moisture = renderSensorValue(data.sensors.moisture, "%");
  ui.environmentValue.textContent = temperature === "--" && moisture === "--" ? "--" : `${temperature} / ${moisture}`;
  ui.environmentHint.textContent =
    typeof data.sensors.temperature === "number" || typeof data.sensors.moisture === "number"
      ? "Temperature / moisture values received from the latest ESP32 payload."
      : "Temperature and moisture will appear here from the ESP32 payload.";

  ui.nitrogenHint.textContent =
    typeof data.sensors.nitrogen === "number"
      ? "Latest nitrogen value received from the field node."
      : "To be read from NPK probe via ESP32 serial/Wi-Fi.";
  ui.phosphorusHint.textContent =
    typeof data.sensors.phosphorus === "number"
      ? "Latest phosphorus value received from the field node."
      : "Reserved for nutrient trend alerts and crop advisory logic.";
  ui.potassiumHint.textContent =
    typeof data.sensors.potassium === "number"
      ? "Latest potassium value received from the field node."
      : "Will feed health scoring alongside camera-based pest detection.";

  renderDetectionOverlay(data.detection.latest);
  setBadgeText(data.systemStatus, data.pairingStatus);

  if (Array.isArray(data.events)) {
    renderTimeline(data.events);
  }
}

async function callApi(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || `Request failed with ${response.status}`);
  }

  return response.json();
}

async function refreshState() {
  try {
    const data = await callApi("/api/state", { method: "GET" });
    applyState(data);
  } catch (error) {
    ui.systemStatus.textContent = "Backend Offline";
    ui.lastEvent.textContent = "Start node server.js to enable live IoT features";
    ui.fpsBadge.textContent = "Offline";
    hideDetectionOverlay();
  }
}

async function postPhoneTarget(target) {
  await callApi("/api/phone-stream", {
    method: "POST",
    body: JSON.stringify({ target }),
  });
  await refreshState();
}

async function simulateDetection() {
  try {
    await callApi("/api/detections", {
      method: "POST",
      body: JSON.stringify({
        pestName: "Aphid Cluster",
        confidence: 0.78,
        source: "MATLAB Demo",
        zone: "Leaf Cluster B",
        boundingBox: {
          x: 0.3,
          y: 0.22,
          width: 0.23,
          height: 0.28,
        },
        fps: 24,
        framesReviewed: 30,
      }),
    });
    await refreshState();
  } catch (error) {
    ui.lastEvent.textContent = error.message;
  }
}

async function simulateTelemetry() {
  try {
    await callApi("/api/sensors", {
      method: "POST",
      body: JSON.stringify({
        deviceId: "ESP32-GROW-01",
        sensors: {
          nitrogen: 42,
          phosphorus: 24,
          potassium: 29,
          moisture: 37,
          temperature: 29.4,
        },
      }),
    });
    await refreshState();
  } catch (error) {
    ui.lastEvent.textContent = error.message;
  }
}

async function clearBackendLog() {
  try {
    await callApi("/api/reset", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await refreshState();
  } catch (error) {
    ui.lastEvent.textContent = error.message;
  }
}

async function startDesktopCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    ui.lastEvent.textContent = "Webcam not supported in this browser";
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
    ui.liveVideo.controls = false;
    ui.liveVideo.src = "";
    ui.liveVideo.srcObject = stream;
    showVideo();
    setMode("desktop");
    ui.systemStatus.textContent = "Monitoring";
    ui.fpsBadge.textContent = "24 FPS";
    ui.lastEvent.textContent = "Desktop webcam active";
  } catch (error) {
    showPlaceholder();
    ui.lastEvent.textContent = "Camera permission blocked";
  }
}

function preparePhoneMode() {
  setMode("phone");
  ui.pairingStatus.textContent = "Ready to Pair";
  ui.phoneBadge.textContent = "WebRTC / IP Camera";
  ui.lastEvent.textContent = "Phone pairing prepared";
}

async function connectFutureStream() {
  const value = ui.streamInput.value.trim();
  if (!value) {
    ui.lastEvent.textContent = "Enter a future stream URL or session code";
    return;
  }

  try {
    await postPhoneTarget(value);
  } catch (error) {
    ui.lastEvent.textContent = error.message;
  }
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
  ui.liveVideo.controls = true;
  ui.liveVideo.srcObject = null;
  ui.liveVideo.src = URL.createObjectURL(file);
  showVideo();
  ui.liveVideo.play().catch(() => {});
  ui.lastEvent.textContent = `Loaded ${file.name}`;
  ui.fpsBadge.textContent = "Review";
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
ui.simulateTelemetry.addEventListener("click", simulateTelemetry);
ui.connectStream.addEventListener("click", connectFutureStream);
ui.fileInput.addEventListener("change", handleFileLoad);
ui.clearLog.addEventListener("click", clearBackendLog);

setMode("desktop");
hideDetectionOverlay();
refreshState();
state.pollTimer = window.setInterval(refreshState, 4000);
