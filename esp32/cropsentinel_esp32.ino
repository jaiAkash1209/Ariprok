#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

/*
  CropSentinel ESP32 IoT node

  Final hardware for this version:
  - ESP32
  - SSD1306 128x64 I2C OLED display
  - Soil moisture sensor (analog)
  - DHT11/DHT22 humidity + temperature sensor

  What it does:
  - Reads soil moisture, humidity, and temperature
  - Shows values on the OLED display
  - Connects to Wi-Fi
  - Posts sensor data to the CropSentinel website/backend

  Important:
  - Do not use "localhost" as SERVER_URL on the ESP32.
  - If the website runs on your laptop, use your laptop's LAN IP:
    Example: http://192.168.1.10:8000/api/sensors
*/

// ----------------------------
// User settings
// ----------------------------
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL = "http://192.168.1.10:8000/api/sensors";
const char* DEVICE_ID = "ESP32-GROW-01";

// ----------------------------
// Pin configuration
// ----------------------------
const int SOIL_PIN = 34;
const int DHT_PIN = 4;

// I2C OLED pins on many ESP32 boards:
// SDA -> GPIO 21
// SCL -> GPIO 22

// ----------------------------
// Sensor configuration
// ----------------------------
#define DHT_TYPE DHT22
// If you have DHT11 instead, change to:
// #define DHT_TYPE DHT11

// Moisture calibration:
// Measure raw value in dry air and in wet soil, then adjust.
const int SOIL_DRY_RAW = 3200;
const int SOIL_WET_RAW = 1400;

const unsigned long SENSOR_INTERVAL_MS = 3000;
const unsigned long POST_INTERVAL_MS = 15000;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

// ----------------------------
// OLED setup
// ----------------------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ----------------------------
// Sensor objects
// ----------------------------
DHT dht(DHT_PIN, DHT_TYPE);

// ----------------------------
// State
// ----------------------------
int soilRaw = 0;
int soilPercent = 0;
float humidityValue = NAN;
float temperatureValue = NAN;
String wifiState = "BOOT";
String postState = "WAIT";
unsigned long lastSensorReadMs = 0;
unsigned long lastPostMs = 0;
unsigned long lastWifiRetryMs = 0;

int clampValue(int value, int minValue, int maxValue) {
  if (value < minValue) {
    return minValue;
  }
  if (value > maxValue) {
    return maxValue;
  }
  return value;
}

int readSoilPercent() {
  soilRaw = analogRead(SOIL_PIN);
  long mapped = map(soilRaw, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100);
  return clampValue((int)mapped, 0, 100);
}

String formatNumberOrDash(float value, int decimals) {
  if (isnan(value)) {
    return "--";
  }
  return String(value, decimals);
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiState = "ONLINE";
    return;
  }

  wifiState = "CONNECT";
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startMs < 12000) {
    delay(400);
  }

  wifiState = (WiFi.status() == WL_CONNECTED) ? "ONLINE" : "OFFLINE";
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiState = "ONLINE";
    return;
  }

  if (millis() - lastWifiRetryMs >= WIFI_RETRY_INTERVAL_MS) {
    lastWifiRetryMs = millis();
    connectWiFi();
  }
}

void readSensors() {
  soilPercent = readSoilPercent();
  humidityValue = dht.readHumidity();
  temperatureValue = dht.readTemperature();
}

void printTelemetryToSerial() {
  Serial.print("{\"deviceId\":\"");
  Serial.print(DEVICE_ID);
  Serial.print("\",\"soil_raw\":");
  Serial.print(soilRaw);
  Serial.print(",\"moisture\":");
  Serial.print(soilPercent);
  Serial.print(",\"humidity\":");
  if (isnan(humidityValue)) {
    Serial.print("null");
  } else {
    Serial.print(humidityValue, 1);
  }
  Serial.print(",\"temperature\":");
  if (isnan(temperatureValue)) {
    Serial.print("null");
  } else {
    Serial.print(temperatureValue, 1);
  }
  Serial.println("}");
}

bool postTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    postState = "NO WIFI";
    return false;
  }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  payload += "\"sensors\":{";
  payload += "\"moisture\":" + String(soilPercent) + ",";
  payload += "\"humidity\":";
  payload += isnan(humidityValue) ? "null" : String(humidityValue, 1);
  payload += ",";
  payload += "\"temperature\":";
  payload += isnan(temperatureValue) ? "null" : String(temperatureValue, 1);
  payload += "}}";

  int httpCode = http.POST(payload);
  bool ok = httpCode > 0 && httpCode < 300;
  postState = ok ? "POST OK" : ("ERR " + String(httpCode));

  if (httpCode > 0) {
    Serial.print("HTTP ");
    Serial.println(httpCode);
    Serial.println(http.getString());
  } else {
    Serial.print("POST failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return ok;
}

void drawHeader() {
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print("CropSentinel Node");
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);
}

void drawBody() {
  display.setCursor(0, 14);
  display.print("Soil: ");
  display.print(soilPercent);
  display.print("%");

  display.setCursor(0, 26);
  display.print("Hum : ");
  display.print(formatNumberOrDash(humidityValue, 1));
  display.print("%");

  display.setCursor(0, 38);
  display.print("Temp: ");
  display.print(formatNumberOrDash(temperatureValue, 1));
  display.print("C");

  display.setCursor(0, 50);
  display.print("Net : ");
  display.print(wifiState);
}

void drawFooterStatus() {
  display.fillRect(88, 48, 40, 16, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setCursor(92, 52);
  display.print(postState);
  display.setTextColor(SSD1306_WHITE);
}

void updateDisplay() {
  display.clearDisplay();
  drawHeader();
  drawBody();
  drawFooterStatus();
  display.display();
}

void setupDisplay() {
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED not found. Check wiring/address.");
    return;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(8, 22);
  display.println("CropSentinel Boot");
  display.setCursor(12, 38);
  display.println("ESP32 IoT Node");
  display.display();
  delay(1200);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  analogReadResolution(12);
  Wire.begin();
  setupDisplay();

  dht.begin();
  connectWiFi();

  readSensors();
  printTelemetryToSerial();
  updateDisplay();
}

void loop() {
  ensureWiFi();

  if (millis() - lastSensorReadMs >= SENSOR_INTERVAL_MS) {
    lastSensorReadMs = millis();
    readSensors();
    printTelemetryToSerial();
    updateDisplay();
  }

  if (millis() - lastPostMs >= POST_INTERVAL_MS) {
    lastPostMs = millis();
    postTelemetry();
    updateDisplay();
  }
}
