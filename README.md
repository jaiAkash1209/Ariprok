# CropSentinel Prototype

This folder now contains a first-phase desktop interface for a pest detection system.

## What is included

- `index.html`: main desktop dashboard
- `styles.css`: visual design and responsive layout
- `app.js`: interaction logic for webcam testing, phone-link preparation, upload preview, and event simulation

## Current scope

This version focuses on interface and workflow only:

- desktop webcam preview for quick testing
- a dedicated phone camera pairing panel
- pest monitoring cards and event timeline
- placeholder zone for future ESP32 + NPK sensor telemetry

## How to run

Open `index.html` in a browser.

For webcam access, a local server is often more reliable than opening the file directly. If needed, run one of these from this folder:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Best path for your phone camera later

Recommended:

1. Create a small mobile web page that uses the phone camera with `getUserMedia`.
2. Stream that video to the desktop dashboard with WebRTC.
3. Feed the same detection results into the ESP32 sensor dashboard.

Fast fallback:

1. Use an IP camera app on the phone.
2. Send the stream URL into the desktop app.
3. Parse the feed in the dashboard/backend later.

## Next phase ideas

- add real pest detection inference
- add phone-to-desktop live streaming
- connect ESP32 over serial, Wi-Fi, or MQTT
- display real NPK values and trigger alerts/actions
