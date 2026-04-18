# CropSentinel IoT Starter

CropSentinel is now a local full-app starter for a pest-detection system that can combine:

- phone camera or desktop webcam input
- MATLAB pest detection results
- ESP32 + environment telemetry
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

## Product Docs

This repo now also includes product-planning docs for a real deployment:

- `docs/product-architecture.md`
- `docs/bom.md`
- `docs/pilot-plan.md`

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
    "moisture": 37,
    "humidity": 68.2,
    "temperature": 29.4
  }
}
```

Firmware starter:

- `esp32/cropsentinel_esp32.ino`
- `esp32/cropsentinel_esp32_lcd2004.ino` for LCD `2004A` with I2C backpack

Before uploading to the ESP32, edit these values in the sketch:

```cpp
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL = "http://YOUR_PC_IP:8000/api/sensors";
```

Important:
- if the website is running on your computer, use your computer's local IP, not `localhost`
- the ESP32 and your computer must be on the same Wi-Fi network
- the sketch currently assumes an `SSD1306 OLED`, `DHT22`, and an analog moisture sensor
- if your display is `2004A`, use the LCD-specific sketch and notes in `esp32/DISPLAY_NOTES.md`

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
3. Upload the ESP32 firmware and verify live sensor posts to `/api/sensors`.
4. Add a decision engine for pesticide advice or automated action.
