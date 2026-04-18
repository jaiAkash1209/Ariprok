# CropSentinel IoT Starter

CropSentinel is now a local full-app starter for a pest-detection system that can combine:

- phone camera or desktop webcam input
- MATLAB pest detection results
- ESP32 + NPK + environment telemetry
- a single desktop dashboard for alerts and farm-health status

## Files

- `index.html`: dashboard UI
- `styles.css`: responsive visual styling
- `app.js`: browser-side dashboard logic
- `server.js`: local Node server and REST API
- `matlab/send_detection_example.m`: MATLAB starter to push pest detections into the app

## Run The App

From `F:\Ariprok`:

```powershell
node server.js
```

Then open:

```text
http://localhost:8000
```

## What Works Now

- full local dashboard served by Node
- live desktop webcam preview
- backend API for phone stream target
- backend API for MATLAB detection payloads
- backend API for ESP32 sensor payloads
- event timeline and risk state driven by backend data
- demo buttons for simulated pest and sensor events

## MATLAB Integration

MATLAB can post detections to:

```text
POST http://localhost:8000/api/detections
```

Example payload:

```json
{
  "pestName": "Aphid Cluster",
  "confidence": 0.84,
  "source": "MATLAB",
  "zone": "Leaf Cluster A",
  "boundingBox": {
    "x": 0.30,
    "y": 0.22,
    "width": 0.23,
    "height": 0.28
  },
  "fps": 24,
  "framesReviewed": 30
}
```

`boundingBox` uses normalized values from `0` to `1`, so the dashboard can draw the detection square on top of the live camera view.

Starter script:

- `matlab/send_detection_example.m`

## ESP32 Integration

ESP32 can post telemetry to:

```text
POST http://localhost:8000/api/sensors
```

Example payload:

```json
{
  "deviceId": "ESP32-GROW-01",
  "sensors": {
    "nitrogen": 42,
    "phosphorus": 24,
    "potassium": 29,
    "moisture": 37,
    "temperature": 29.4
  }
}
```

## API Endpoints

- `GET /api/state`: current dashboard state
- `POST /api/phone-stream`: save phone stream URL or session code
- `POST /api/detections`: ingest MATLAB pest detections
- `POST /api/sensors`: ingest ESP32 telemetry
- `POST /api/demo/seed`: inject demo detection and telemetry data
- `POST /api/reset`: reset dashboard state

## Suggested Next Steps

1. Connect your real MATLAB detection code to `/api/detections`.
2. Build the phone camera sender page or IP-camera stream hook.
3. Write ESP32 firmware to send NPK and environment data to `/api/sensors`.
4. Add a decision engine for pesticide advice or automated action.
