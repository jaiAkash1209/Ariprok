# ESP32 Wiring

This version uses only:

- ESP32 dev board
- SSD1306 OLED 128x64 I2C display
- DHT11 or DHT22 humidity/temperature sensor
- Analog soil moisture sensor

## Pin Map

- `OLED SDA` -> `GPIO 21`
- `OLED SCL` -> `GPIO 22`
- `DHT data` -> `GPIO 4`
- `Soil moisture AO` -> `GPIO 34`

## Power Notes

- `OLED VCC` -> `3.3V`
- `OLED GND` -> `GND`
- `DHT VCC` -> `3.3V` or `5V` depending on module
- `DHT GND` -> `GND`
- `Soil sensor VCC` -> based on module type
- `Soil sensor GND` -> `GND`

Important:
- connect all grounds together
- many analog moisture sensors are noisy; calibrate `SOIL_DRY_RAW` and `SOIL_WET_RAW`
- if your DHT module is a bare sensor, add the required pull-up resistor on the data line

## What Appears On The Display

- soil moisture percentage
- humidity
- temperature
- Wi-Fi state
- post state to the website

## Website Connection

Set this in the sketch:

```cpp
const char* SERVER_URL = "http://192.168.1.10:8000/api/sensors";
```

Use your laptop/PC local IP address, not `localhost`.

## Example Payload Sent By ESP32

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
