#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

/*
  CropSentinel ESP32 IoT node
  Version for 20x4 LCD 2004A with I2C backpack

  Use this sketch if your display is a 2004A 20x4 LCD with I2C module.
  Common I2C addresses are 0x27 or 0x3F.
*/

const char *WIFI_SSID = "DESKTOP-17HKVHA 5137";
const char *WIFI_PASSWORD = "mangai123";
const char *SERVER_URL = "http://ariprok.onrender.com/api/sensors";
const char *DEVICE_ID = "ESP32-GROW-01";

const int SOIL_PIN = 34;
const int DHT_PIN = 4;

#define DHT_TYPE DHT22
// #define DHT_TYPE DHT11

const int SOIL_DRY_RAW = 3200;
const int SOIL_WET_RAW = 1400;

const unsigned long SENSOR_INTERVAL_MS = 3000;
const unsigned long POST_INTERVAL_MS = 15000;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

LiquidCrystal_I2C lcd(0x27, 20, 4);
DHT dht(DHT_PIN, DHT_TYPE);

int soilRaw = 0;
int soilPercent = 0;
float humidityValue = NAN;
float temperatureValue = NAN;
String wifiState = "BOOT";
String postState = "WAIT";
unsigned long lastSensorReadMs = 0;
unsigned long lastPostMs = 0;
unsigned long lastWifiRetryMs = 0;

int clampValue(int value, int minValue, int maxValue)
{
  if (value < minValue)
    return minValue;
  if (value > maxValue)
    return maxValue;
  return value;
}

int readSoilPercent()
{
  soilRaw = analogRead(SOIL_PIN);
  long mapped = map(soilRaw, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100);
  return clampValue((int)mapped, 0, 100);
}

String formatNumberOrDash(float value, int decimals)
{
  if (isnan(value))
    return "--";
  return String(value, decimals);
}

void connectWiFi()
{
  if (WiFi.status() == WL_CONNECTED)
  {
    wifiState = "ONLINE";
    return;
  }

  wifiState = "CONNECT";
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startMs < 12000)
  {
    delay(400);
  }

  wifiState = (WiFi.status() == WL_CONNECTED) ? "ONLINE" : "OFFLINE";
}

void ensureWiFi()
{
  if (WiFi.status() == WL_CONNECTED)
  {
    wifiState = "ONLINE";
    return;
  }

  if (millis() - lastWifiRetryMs >= WIFI_RETRY_INTERVAL_MS)
  {
    lastWifiRetryMs = millis();
    connectWiFi();
  }
}

void readSensors()
{
  soilPercent = readSoilPercent();
  humidityValue = dht.readHumidity();
  temperatureValue = dht.readTemperature();
}

void printTelemetryToSerial()
{
  Serial.print("{\"deviceId\":\"");
  Serial.print(DEVICE_ID);
  Serial.print("\",\"soil_raw\":");
  Serial.print(soilRaw);
  Serial.print(",\"moisture\":");
  Serial.print(soilPercent);
  Serial.print(",\"humidity\":");
  if (isnan(humidityValue))
    Serial.print("null");
  else
    Serial.print(humidityValue, 1);
  Serial.print(",\"temperature\":");
  if (isnan(temperatureValue))
    Serial.print("null");
  else
    Serial.print(temperatureValue, 1);
  Serial.println("}");
}

bool postTelemetry()
{
  if (WiFi.status() != WL_CONNECTED)
  {
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

  if (httpCode > 0)
  {
    Serial.print("HTTP ");
    Serial.println(httpCode);
    Serial.println(http.getString());
  }
  else
  {
    Serial.print("POST failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return ok;
}

void clearLine(int row)
{
  lcd.setCursor(0, row);
  lcd.print("                    ");
}

void printLine(int row, const String &value)
{
  clearLine(row);
  lcd.setCursor(0, row);
  lcd.print(value.substring(0, 20));
}

void updateDisplay()
{
  printLine(0, "CropSentinel Node");
  printLine(1, "Soil:" + String(soilPercent) + "% Hum:" + formatNumberOrDash(humidityValue, 1));
  printLine(2, "Temp:" + formatNumberOrDash(temperatureValue, 1) + "C " + wifiState);
  printLine(3, "Post:" + postState);
}

void setupDisplay()
{
  lcd.init();
  lcd.backlight();
  lcd.clear();
  printLine(0, "CropSentinel Boot");
  printLine(1, "ESP32 + LCD2004");
  printLine(2, "Addr: 0x27");
  printLine(3, "Starting...");
  delay(1200);
}

void setup()
{
  Serial.begin(115200);
  delay(500);

  analogReadResolution(12);
  Wire.begin(21, 22);
  setupDisplay();

  dht.begin();
  connectWiFi();

  readSensors();
  printTelemetryToSerial();
  updateDisplay();
}

void loop()
{
  ensureWiFi();

  if (millis() - lastSensorReadMs >= SENSOR_INTERVAL_MS)
  {
    lastSensorReadMs = millis();
    readSensors();
    printTelemetryToSerial();
    updateDisplay();
  }

  if (millis() - lastPostMs >= POST_INTERVAL_MS)
  {
    lastPostMs = millis();
    postTelemetry();
    updateDisplay();
  }
}
