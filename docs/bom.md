# CropSentinel BOM

This BOM separates `prototype-safe` parts from `product-leaning` parts.

## Pilot Build BOM

| Module | Recommended Part | Why |
|---|---|---|
| Controller | ESP32 DevKit | Fast development, Wi-Fi built in |
| Display | SSD1306 128x64 OLED I2C | Simple local status and service screen |
| Moisture | Capacitive soil moisture sensor | Better for long-term use than resistive probes |
| Temp/Humidity | SHT31 preferred, DHT22 acceptable for pilot | Better accuracy and stability |
| Camera | Phone camera or fixed USB/IP camera | Fast pilot path with existing workflow |
| Enclosure | IP65 weather-resistant enclosure | Needed for outdoor use |
| Power | Regulated 5V supply | Stable field node operation |
| Connectors | Screw terminal / JST / waterproof connectors | Better serviceability than jumper wires |

## Prototype Parts Still Acceptable For Bench Work

| Part | Use Status | Note |
|---|---|---|
| DHT22 | Acceptable | Good for early integration |
| Resistive moisture probe | Testing only | Replace before deployment |
| Breadboard wiring | Testing only | Not field-safe |

## Not In Scope For Version 1

- UV sensor
- IR sensor
- servo
- relay automation

These can return later if the product genuinely needs them.

## Suggested Spare Stock

- 1 extra ESP32
- 1 extra display
- 1 spare moisture sensor
- 1 spare humidity sensor
- spare connectors and wires

Spare stock matters because field failures are usually connector or sensor failures first.
