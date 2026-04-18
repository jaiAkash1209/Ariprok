const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 8000);
const ROOT = __dirname;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function nowStamp() {
  return new Date().toISOString();
}

const state = {
  systemStatus: "Standby",
  currentRisk: "Low",
  pairingStatus: "Not Paired",
  phoneStreamTarget: "",
  matlabStatus: "Waiting",
  esp32Status: "Waiting",
  deviceId: "ESP32-GROW-01",
  lastSync: null,
  fps: "Idle",
  session: {
    framesReviewed: 0,
    pestsFlagged: 0,
    lastEvent: "No alerts yet",
  },
  detection: {
    leafRisk: "Monitoring",
    trapRisk: "Stable",
    soilRisk: "Pending Sync",
    soilRiskText: "ESP32 telemetry will set the nutrient and soil-health summary for this card.",
    latest: null,
  },
  sensors: {
    nitrogen: null,
    phosphorus: null,
    potassium: null,
    moisture: null,
    humidity: null,
    temperature: null,
  },
  events: [
    {
      title: "System armed",
      body: "The dashboard backend is running and waiting for the first detection or sensor payload.",
      time: nowStamp(),
    },
  ],
};

function pushEvent(title, body) {
  state.events.unshift({ title, body, time: nowStamp() });
  state.events = state.events.slice(0, 20);
  state.session.lastEvent = title;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function normalizeBoundingBox(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const x = normalizeNumber(input.x);
  const y = normalizeNumber(input.y);
  const width = normalizeNumber(input.width);
  const height = normalizeNumber(input.height);

  if ([x, y, width, height].some((value) => value === null)) {
    return null;
  }

  return {
    x: clamp(x),
    y: clamp(y),
    width: clamp(width),
    height: clamp(height),
  };
}

function setRiskLevel() {
  const latestConfidence = state.detection.latest?.confidence ?? 0;
  const latestPest = state.detection.latest?.pestName;
  const moisture = state.sensors.moisture;
  const nitrogen = state.sensors.nitrogen;

  if (latestPest && latestConfidence >= 0.85) {
    state.currentRisk = "High";
    state.systemStatus = "Alert";
    return;
  }

  if (
    (latestPest && latestConfidence >= 0.6) ||
    (typeof moisture === "number" && moisture < 25) ||
    (typeof nitrogen === "number" && nitrogen < 30)
  ) {
    state.currentRisk = "Medium";
    state.systemStatus = "Monitoring";
    return;
  }

  if (state.esp32Status === "Connected" || state.matlabStatus === "Connected") {
    state.currentRisk = "Low";
    state.systemStatus = "Monitoring";
    return;
  }

  state.currentRisk = "Low";
  state.systemStatus = "Standby";
}

function applySensorPayload(payload) {
  const sensors = payload.sensors || payload;
  state.esp32Status = "Connected";
  state.deviceId = payload.deviceId || state.deviceId;
  state.lastSync = nowStamp();
  state.sensors.nitrogen = normalizeNumber(sensors.nitrogen);
  state.sensors.phosphorus = normalizeNumber(sensors.phosphorus);
  state.sensors.potassium = normalizeNumber(sensors.potassium);
  state.sensors.moisture = normalizeNumber(sensors.moisture);
  state.sensors.humidity = normalizeNumber(sensors.humidity);
  state.sensors.temperature = normalizeNumber(sensors.temperature);

  const lowMoisture = typeof state.sensors.moisture === "number" && state.sensors.moisture < 25;
  const lowNpk =
    typeof state.sensors.nitrogen === "number" &&
    typeof state.sensors.phosphorus === "number" &&
    typeof state.sensors.potassium === "number" &&
    (state.sensors.nitrogen < 30 || state.sensors.phosphorus < 20 || state.sensors.potassium < 20);

  if (lowMoisture || lowNpk) {
    state.detection.soilRisk = "Needs Attention";
    state.detection.soilRiskText = "Soil readings are outside the preferred range. Review irrigation and nutrient dosing.";
  } else {
    state.detection.soilRisk = "Stable";
    state.detection.soilRiskText = "Latest sensor payload looks healthy for moisture and NPK balance.";
  }

  setRiskLevel();
  pushEvent(
    "ESP32 telemetry received",
    `Device ${state.deviceId} pushed fresh NPK and environment values into the dashboard.`
  );
}

function applyDetectionPayload(payload) {
  const pestName = payload.pestName || payload.label || "Unknown pest";
  const confidence = normalizeNumber(payload.confidence) ?? 0;
  const boundingBox = normalizeBoundingBox(payload.boundingBox || payload.bbox) || {
    x: 0.28,
    y: 0.22,
    width: 0.24,
    height: 0.3,
  };
  state.matlabStatus = "Connected";
  state.lastSync = nowStamp();
  state.session.framesReviewed += normalizeNumber(payload.framesReviewed) ?? 24;
  state.session.pestsFlagged += 1;
  state.fps = payload.fps ? `${payload.fps} FPS` : "24 FPS";
  state.detection.leafRisk = pestName;
  state.detection.trapRisk = confidence >= 0.8 ? "Immediate Check" : "Watch Zone";
  state.detection.latest = {
    pestName,
    confidence,
    source: payload.source || "MATLAB",
    zone: payload.zone || "Leaf Cluster A",
    boundingBox,
    time: nowStamp(),
  };

  setRiskLevel();
  pushEvent(
    "Detection ingested",
    `${pestName} reported with ${(confidence * 100).toFixed(0)}% confidence from ${state.detection.latest.source}.`
  );
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(payload, null, 2));
}

function notFound(response) {
  sendJson(response, 404, { error: "Not found" });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Payload too large"));
      }
    });
    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

function serveStatic(requestPath, response) {
  const target = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(ROOT, path.normalize(target));

  if (!filePath.startsWith(ROOT)) {
    notFound(response);
    return;
  }

  fs.readFile(filePath, (error, buffer) => {
    if (error) {
      if (error.code === "ENOENT") {
        notFound(response);
        return;
      }

      sendJson(response, 500, { error: "Unable to read file" });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
    });
    response.end(buffer);
  });
}

function seedDemoData() {
  applySensorPayload({
    deviceId: "ESP32-GROW-01",
    sensors: {
      nitrogen: 42,
      phosphorus: 24,
      potassium: 29,
      moisture: 37,
      humidity: 68.2,
      temperature: 29.4,
    },
  });

  applyDetectionPayload({
    pestName: "Aphid Cluster",
    confidence: 0.78,
    source: "MATLAB",
    zone: "Leaf Cluster B",
    boundingBox: {
      x: 0.31,
      y: 0.24,
      width: 0.21,
      height: 0.26,
    },
    fps: 24,
    framesReviewed: 32,
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/state") {
    setRiskLevel();
    sendJson(response, 200, state);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/phone-stream") {
    try {
      const payload = await readBody(request);
      state.phoneStreamTarget = String(payload.target || "").trim();
      state.pairingStatus = state.phoneStreamTarget ? "Session Saved" : "Not Paired";
      pushEvent(
        "Phone stream updated",
        state.phoneStreamTarget
          ? `Dashboard saved the phone stream target: ${state.phoneStreamTarget}.`
          : "Phone stream target was cleared."
      );
      sendJson(response, 200, { ok: true, pairingStatus: state.pairingStatus });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/sensors") {
    try {
      const payload = await readBody(request);
      applySensorPayload(payload);
      sendJson(response, 200, { ok: true, sensors: state.sensors, lastSync: state.lastSync });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/detections") {
    try {
      const payload = await readBody(request);
      applyDetectionPayload(payload);
      sendJson(response, 200, { ok: true, detection: state.detection.latest, risk: state.currentRisk });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/demo/seed") {
    seedDemoData();
    sendJson(response, 200, { ok: true, state });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/reset") {
    state.systemStatus = "Standby";
    state.currentRisk = "Low";
    state.pairingStatus = "Not Paired";
    state.phoneStreamTarget = "";
    state.matlabStatus = "Waiting";
    state.esp32Status = "Waiting";
    state.deviceId = "ESP32-GROW-01";
    state.lastSync = null;
    state.fps = "Idle";
    state.session.framesReviewed = 0;
    state.session.pestsFlagged = 0;
    state.session.lastEvent = "No alerts yet";
    state.detection.leafRisk = "Monitoring";
    state.detection.trapRisk = "Stable";
    state.detection.soilRisk = "Pending Sync";
    state.detection.soilRiskText = "ESP32 telemetry will set the nutrient and soil-health summary for this card.";
    state.detection.latest = null;
    state.sensors = {
      nitrogen: null,
      phosphorus: null,
      potassium: null,
      moisture: null,
      humidity: null,
      temperature: null,
    };
    state.events = [
      {
        title: "System reset",
        body: "The backend state was reset and is waiting for fresh payloads.",
        time: nowStamp(),
      },
    ];

    sendJson(response, 200, { ok: true });
    return;
  }

  serveStatic(url.pathname, response);
});

server.listen(PORT, () => {
  console.log(`CropSentinel server running at http://localhost:${PORT}`);
});
