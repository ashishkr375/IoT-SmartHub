/*
 * ============================================================
 * SmartHub Gateway - ESP32-S3
 * NimBLE-Arduino 2.x compatible
 *
 * FIX LOG (vs previous version):
 *  1. NimBLEAdvertisedDeviceCallbacks → NimBLEScanCallbacks  (2.x rename)
 *  2. onResult signature → onResult(const NimBLEAdvertisedDevice*)
 *  3. MDNS.IP(i) → MDNS.address(i)
 *  4. NimBLEAddress(const char*) → NimBLEAddress(std::string, type)
 *  5. writeValue(buf, len) → writeValue(std::string)  (avoids ambiguous overload)
 *  6. setAdvertisedDeviceCallbacks → setScanCallbacks  (2.x rename)
 *  7. bleScan->start() — onScanEnd callback handles completion
 *
 * Required Libraries (Arduino Library Manager):
 *   - NimBLE-Arduino  by h2zero   (2.x)
 *   - ArduinoJson     by Benoit Blanchon
 *
 * Board  : ESP32S3 Dev Module
 * USB CDC On Boot : Enabled
 * Partition: Huge APP (3MB No OTA)
 * ============================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>
#include <NimBLEDevice.h>
#include <map>

// ============================================================
// CONFIGURATION — UPDATE THESE
// ============================================================

const char *WIFI_SSID = "Ashish-Personal";
const char *WIFI_PASSWORD = "ashu@2003";

const char *API_BASE_URL = "https://smarthublite.vercel.app";
const char *API_UPDATE_ENDPOINT = "/api/device/update";
const char *API_COMMAND_ENDPOINT = "/api/device/command";

const char *GATEWAY_DEVICE_ID = "gateway_01";

// ============================================================
// BLE UUIDs — must match client devices exactly
// ============================================================

#define BLE_SERVICE_UUID "0000FFF6-0000-1000-8000-00805F9B34FB"
#define BLE_CHAR_SSID "0000FFF7-0000-1000-8000-00805F9B34FB"
#define BLE_CHAR_PASS "0000FFF8-0000-1000-8000-00805F9B34FB"
#define BLE_CHAR_STATUS "0000FFF9-0000-1000-8000-00805F9B34FB"
#define BLE_CHAR_COMMAND "0000FFFA-0000-1000-8000-00805F9B34FB"

// ============================================================
// TIMING
// ============================================================

const uint32_t HEARTBEAT_INTERVAL = 30000;
const uint32_t COMMAND_POLL_INTERVAL = 1000;
const uint32_t BLE_SCAN_INTERVAL = 15000;
const uint32_t BLE_SCAN_DURATION_MS = 5000; // NimBLE 2.x uses milliseconds!
const uint32_t MDNS_REFRESH_INTERVAL = 60000;

// ============================================================
// DEVICE REGISTRY
// ============================================================

struct DeviceInfo
{
  String ip;
  String mac;
  String deviceType;
  unsigned long lastSeen;
  bool commissioned;
};

std::map<String, DeviceInfo> deviceRegistry;

// ============================================================
// GLOBALS
// ============================================================

HTTPClient http;
NimBLEScan *bleScan = nullptr;
bool bleScanning = false;
// Device found during scan — connect from loop(), NOT from inside onResult callback
const NimBLEAdvertisedDevice *pendingDevice = nullptr;

unsigned long lastHeartbeat = 0;
unsigned long lastCommandPoll = 0;
unsigned long lastBLEScan = 0;
unsigned long lastMDNSRefresh = 0;

// ============================================================
// FORWARD DECLARATIONS
// ============================================================

void commissionDeviceViaBLE(const NimBLEAdvertisedDevice *device);
void controlDeviceViaHTTP(const String &ip, const String &deviceId, JsonObject command);
void controlDeviceViaBLE(const String &deviceId, JsonObject command);
void processCommand(JsonObject cmd);
void pollCommands();
void sendStatusUpdate(const char *status);
bool sendHTTPPost(const char *endpoint, const char *payload);
void discoverMDNSDevices();
void processMatterEvents();

// ============================================================
// BLE SCAN CALLBACKS — NimBLE 2.x API
// FIX 1+2: extends NimBLEScanCallbacks, onResult takes const ptr
// ============================================================

class GatewayScanCallbacks : public NimBLEScanCallbacks
{
public:
  void onResult(const NimBLEAdvertisedDevice *device) override
  {
    if (!device->isAdvertisingService(NimBLEUUID(BLE_SERVICE_UUID)))
    {
      return;
    }

    String mac = String(device->getAddress().toString().c_str());

    Serial.println("───────────────────────────────────────");
    Serial.println("[BLE] SmartHub device found!");
    Serial.println("  MAC : " + mac);
    Serial.println("  Name: " + String(device->getName().c_str()));
    Serial.printf("  RSSI: %d dBm\n", device->getRSSI());
    Serial.println("───────────────────────────────────────");

    for (auto &kv : deviceRegistry)
    {
      if (kv.second.mac == mac && kv.second.commissioned)
      {
        kv.second.lastSeen = millis();
        Serial.println("[BLE] Already commissioned: " + kv.first);
        return;
      }
    }

    // Save pointer and let loop() handle connection outside scan context
    pendingDevice = device;
    NimBLEDevice::getScan()->stop();
  }

  // FIX 7: onScanEnd replaces the old start() lambda
  void onScanEnd(const NimBLEScanResults &results, int reason) override
  {
    Serial.printf("[BLE] Scan ended — %d device(s). Reason=%d\n",
                  results.getCount(), reason);
    bleScanning = false;
  }
};

// ============================================================
// BLE COMMISSIONING
// ============================================================

void commissionDeviceViaBLE(const NimBLEAdvertisedDevice *device)
{
  String mac = String(device->getAddress().toString().c_str());
  Serial.println("[Commission] Starting for: " + mac);

  // Give BLE radio time to fully exit scan mode before connecting
  delay(500);

  NimBLEClient *client = NimBLEDevice::createClient();
  client->setConnectionParams(12, 12, 0, 51);
  // NimBLE 2.x: setConnectTimeout is in MILLISECONDS
  client->setConnectTimeout(10000); // 10 seconds

  // Retry connect up to 3 times
  bool connected = false;
  for (int attempt = 1; attempt <= 3; attempt++)
  {
    Serial.printf("[Commission] Connect attempt %d/3...\n", attempt);
    if (client->connect(device))
    {
      connected = true;
      break;
    }
    Serial.println("[Commission] Retrying in 1s...");
    delay(1000);
  }

  if (!connected)
  {
    Serial.println("[Commission] ❌ BLE connect failed after 3 attempts");
    NimBLEDevice::deleteClient(client);
    return;
  }
  Serial.println("[Commission] ✅ BLE connected");

  NimBLERemoteService *svc = client->getService(BLE_SERVICE_UUID);
  if (!svc)
  {
    Serial.println("[Commission] ❌ Service not found");
    client->disconnect();
    NimBLEDevice::deleteClient(client);
    return;
  }

  // Write SSID — FIX 5: std::string overload avoids ambiguous writeValue(buf,len)
  NimBLERemoteCharacteristic *ssidChar = svc->getCharacteristic(BLE_CHAR_SSID);
  if (ssidChar && ssidChar->canWrite())
  {
    ssidChar->writeValue(std::string(WIFI_SSID));
    Serial.println("[Commission] → SSID sent");
  }

  // Write Password
  NimBLERemoteCharacteristic *passChar = svc->getCharacteristic(BLE_CHAR_PASS);
  if (passChar && passChar->canWrite())
  {
    passChar->writeValue(std::string(WIFI_PASSWORD));
    Serial.println("[Commission] → Password sent");
  }

  // Poll status char until device reports IP
  Serial.println("[Commission] Waiting for device WiFi...");
  NimBLERemoteCharacteristic *statusChar = svc->getCharacteristic(BLE_CHAR_STATUS);

  String deviceId = "";
  String deviceIp = "";
  String deviceType = "unknown";

  if (statusChar && statusChar->canRead())
  {
    for (int i = 0; i < 24; i++)
    {
      delay(1000);
      Serial.print(".");
      String val = String(statusChar->readValue().c_str());

      if (val.length() > 4)
      {
        StaticJsonDocument<256> jdoc;
        if (!deserializeJson(jdoc, val))
        {
          deviceId = jdoc["device_id"] | "";
          deviceIp = jdoc["ip"] | "";
          deviceType = jdoc["type"] | "unknown";
          if (deviceId.length() > 0 && deviceIp.length() > 0)
          {
            Serial.println();
            Serial.println("[Commission] ✅ Confirmed!");
            Serial.println("  device_id: " + deviceId);
            Serial.println("  ip       : " + deviceIp);
            Serial.println("  type     : " + deviceType);
            break;
          }
        }
      }
    }
    Serial.println();
  }

  client->disconnect();
  NimBLEDevice::deleteClient(client);

  if (deviceId.length() == 0)
  {
    Serial.println("[Commission] ❌ No confirmation — aborting");
    return;
  }

  // Register
  DeviceInfo info;
  info.ip = deviceIp;
  info.mac = mac;
  info.deviceType = deviceType;
  info.lastSeen = millis();
  info.commissioned = true;
  deviceRegistry[deviceId] = info;
  Serial.println("[Commission] ✅ Registered: " + deviceId);

  // Notify cloud
  StaticJsonDocument<256> payload;
  payload["device_id"] = deviceId;
  payload["data"]["status"] = "commissioned";
  payload["data"]["ip"] = deviceIp;
  payload["data"]["type"] = deviceType;
  payload["data"]["gateway"] = GATEWAY_DEVICE_ID;
  char buf[256];
  serializeJson(payload, buf);
  sendHTTPPost(API_UPDATE_ENDPOINT, buf);
}

// ============================================================
// mDNS DISCOVERY
// ============================================================

void discoverMDNSDevices()
{
  Serial.println("[mDNS] Querying _smarthub._tcp...");
  int count = MDNS.queryService("smarthub", "tcp");
  if (count == 0)
    count = MDNS.queryService("matter", "tcp");
  Serial.printf("[mDNS] Found %d device(s)\n", count);

  for (int i = 0; i < count; i++)
  {
    String host = MDNS.hostname(i);

    // FIX 3: address() replaces IP() in ESP32 Arduino Core 3.x
    String ip = MDNS.address(i).toString();

    String deviceId = "";
    String devType = "unknown";

    for (int t = 0; t < MDNS.numTxt(i); t++)
    {
      String key = MDNS.txtKey(i, t);
      String val = MDNS.txt(i, t);
      if (key == "device_id")
        deviceId = val;
      if (key == "type")
        devType = val;
    }
    if (deviceId.length() == 0)
      deviceId = host;

    Serial.printf("[mDNS] %s → %s\n", deviceId.c_str(), ip.c_str());

    if (deviceRegistry.find(deviceId) == deviceRegistry.end())
    {
      DeviceInfo info;
      info.commissioned = true;
      info.deviceType = devType;
      deviceRegistry[deviceId] = info;
    }
    deviceRegistry[deviceId].ip = ip;
    deviceRegistry[deviceId].lastSeen = millis();
  }
}

// ============================================================
// COMMAND POLLING
// ============================================================

void pollCommands()
{
  if (WiFi.status() != WL_CONNECTED)
    return;

  String url = String(API_BASE_URL) + API_COMMAND_ENDPOINT + "?device_id=" + GATEWAY_DEVICE_ID;

  http.begin(url);
  http.setTimeout(2500);
  int code = http.GET();

  if (code != 200)
  {
    if (code > 0)
      Serial.printf("[Poll] HTTP %d\n", code);
    http.end();
    return;
  }

  String body = http.getString();
  http.end();

  if (body.length() < 3 || body == "[]" || body == "{}")
    return;
  Serial.println("[Poll] Commands: " + body);

  StaticJsonDocument<2048> doc;
  if (deserializeJson(doc, body))
    return;

  if (doc.is<JsonArray>())
  {
    for (JsonObject cmd : doc.as<JsonArray>())
      processCommand(cmd);
  }
  else if (doc.is<JsonObject>())
  {
    processCommand(doc.as<JsonObject>());
  }
}

void processCommand(JsonObject cmd)
{
  const char *targetId = cmd["device_id"];
  JsonObject command = cmd["command"];
  if (!targetId || command.isNull())
    return;

  const char *action = command["action"] | "unknown";
  Serial.printf("[Command] → %s | action=%s\n", targetId, action);

  // Gateway itself
  if (strcmp(targetId, GATEWAY_DEVICE_ID) == 0)
  {
    if (strcmp(action, "status") == 0)
      sendStatusUpdate("online");
    else if (strcmp(action, "restart") == 0)
    {
      sendStatusUpdate("restarting");
      delay(500);
      ESP.restart();
    }
    else if (strcmp(action, "scan") == 0)
      lastBLEScan = 0;
    else if (strcmp(action, "list_devices") == 0)
    {
      StaticJsonDocument<1024> reg;
      JsonArray arr = reg.createNestedArray("devices");
      for (auto &kv : deviceRegistry)
      {
        JsonObject d = arr.createNestedObject();
        d["device_id"] = kv.first;
        d["ip"] = kv.second.ip;
        d["type"] = kv.second.deviceType;
      }
      StaticJsonDocument<1024> upd;
      upd["device_id"] = GATEWAY_DEVICE_ID;
      upd["data"] = reg.as<JsonObject>();
      char buf[1024];
      serializeJson(upd, buf);
      sendHTTPPost(API_UPDATE_ENDPOINT, buf);
    }
    return;
  }

  // Forward to child device
  auto it = deviceRegistry.find(String(targetId));
  if (it == deviceRegistry.end())
  {
    Serial.printf("[Command] ⚠️  Unknown: %s\n", targetId);
    return;
  }

  if (it->second.ip.length() > 0)
  {
    controlDeviceViaHTTP(it->second.ip, String(targetId), command);
  }
  else
  {
    controlDeviceViaBLE(String(targetId), command);
  }
}

// ============================================================
// DEVICE CONTROL — HTTP (fast path, device on same WiFi)
// ============================================================

void controlDeviceViaHTTP(const String &ip, const String &deviceId, JsonObject command)
{
  String url = "http://" + ip + "/command";

  StaticJsonDocument<256> payload;
  payload["device_id"] = deviceId;
  payload["command"] = command;
  char buf[256];
  serializeJson(payload, buf);

  Serial.printf("[HTTP→Dev] %s | %s\n", deviceId.c_str(), buf);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  int code = http.POST(buf);

  if (code > 0)
  {
    Serial.printf("[HTTP→Dev] %d: %s\n", code, http.getString().c_str());
  }
  else
  {
    Serial.printf("[HTTP→Dev] ❌ %s\n", http.errorToString(code).c_str());
    deviceRegistry[deviceId].ip = ""; // clear stale IP, will retry BLE
  }
  http.end();
}

// ============================================================
// DEVICE CONTROL — BLE (fallback, device not on WiFi yet)
// ============================================================

void controlDeviceViaBLE(const String &deviceId, JsonObject command)
{
  auto it = deviceRegistry.find(deviceId);
  if (it == deviceRegistry.end() || it->second.mac.length() == 0)
    return;

  // FIX 4: NimBLEAddress requires (std::string, uint8_t type) in 2.x
  NimBLEAddress addr(std::string(it->second.mac.c_str()), BLE_ADDR_PUBLIC);

  NimBLEClient *client = NimBLEDevice::createClient();
  client->setConnectTimeout(8);
  if (!client->connect(addr))
  {
    Serial.println("[BLE→Dev] ❌ " + deviceId);
    NimBLEDevice::deleteClient(client);
    return;
  }

  NimBLERemoteService *svc = client->getService(BLE_SERVICE_UUID);
  if (svc)
  {
    NimBLERemoteCharacteristic *cmdChar = svc->getCharacteristic(BLE_CHAR_COMMAND);
    if (cmdChar && cmdChar->canWrite())
    {
      char buf[256];
      serializeJson(command, buf);
      cmdChar->writeValue(std::string(buf)); // FIX 5
      Serial.println("[BLE→Dev] ✅ " + deviceId);
    }
  }

  client->disconnect();
  NimBLEDevice::deleteClient(client);
}

// ============================================================
// HTTP HELPERS
// ============================================================

bool sendHTTPPost(const char *endpoint, const char *payload)
{
  if (WiFi.status() != WL_CONNECTED)
    return false;
  String url = String(API_BASE_URL) + endpoint;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  int code = http.POST(payload);
  Serial.printf("[HTTP] POST %s → %d\n", endpoint, code);
  http.end();
  return (code >= 200 && code < 300);
}

void sendStatusUpdate(const char *status)
{
  StaticJsonDocument<256> doc;
  doc["device_id"] = GATEWAY_DEVICE_ID;
  doc["data"]["status"] = status;
  doc["data"]["uptime"] = millis() / 1000;
  doc["data"]["rssi"] = WiFi.RSSI();
  doc["data"]["ip"] = WiFi.localIP().toString();
  doc["data"]["free_heap"] = ESP.getFreeHeap();
  doc["data"]["devices"] = (int)deviceRegistry.size();
  char buf[512];
  serializeJson(doc, buf);
  sendHTTPPost(API_UPDATE_ENDPOINT, buf);
}

// ============================================================
// WIFI
// ============================================================

void setupWiFi()
{
  Serial.print("[WiFi] Connecting to " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries++ < 40)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("[WiFi] ✅ IP: " + WiFi.localIP().toString());
  }
  else
  {
    Serial.println("[WiFi] ❌ Failed");
  }
}

// ============================================================
// SETUP
// ============================================================

void setup()
{
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║   SmartHub Gateway  -  ESP32-S3      ║");
  Serial.println("║   NimBLE 2.x  |  ArduinoJson         ║");
  Serial.println("╚══════════════════════════════════════╝");

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  setupWiFi();

  // mDNS
  if (MDNS.begin("smarthub-gateway"))
  {
    MDNS.addService("smarthub", "tcp", 80);
    Serial.println("[mDNS] ✅ smarthub-gateway.local");
  }

  // BLE — FIX 6: setScanCallbacks (was setAdvertisedDeviceCallbacks)
  NimBLEDevice::init("SmartHub-GW");
  NimBLEDevice::setPower(9); // 2.x: plain dBm int, not ESP_PWR_LVL_P9

  bleScan = NimBLEDevice::getScan();
  bleScan->setScanCallbacks(new GatewayScanCallbacks(), false);
  bleScan->setActiveScan(true);
  bleScan->setInterval(100);
  bleScan->setWindow(99);
  Serial.println("[BLE] ✅ Scanner ready");

  if (WiFi.status() == WL_CONNECTED)
  {
    discoverMDNSDevices();
    sendStatusUpdate("online");
  }

  Serial.println("[Setup] ✅ Gateway ready — " + String(API_BASE_URL));
  Serial.println("════════════════════════════════════════");
}

// ============================================================
// LOOP
// ============================================================

void loop()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("[WiFi] Lost — reconnecting...");
    WiFi.disconnect();
    delay(1000);
    setupWiFi();
    return;
  }

  unsigned long now = millis();

  if (now - lastCommandPoll >= COMMAND_POLL_INTERVAL)
  {
    lastCommandPoll = now;
    pollCommands();
  }

  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL)
  {
    lastHeartbeat = now;
    sendStatusUpdate("heartbeat");
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  }

  // Commission pending device (pointer saved from scan callback, connect in loop)
  if (pendingDevice != nullptr)
  {
    const NimBLEAdvertisedDevice *dev = pendingDevice;
    pendingDevice = nullptr; // clear before commission so scan can resume after
    commissionDeviceViaBLE(dev);
  }

  // NimBLE 2.x: start() takes MILLISECONDS not seconds
  if (!bleScanning && pendingDevice == nullptr && (now - lastBLEScan >= BLE_SCAN_INTERVAL))
  {
    lastBLEScan = now;
    bleScanning = true;
    Serial.println("[BLE] Starting scan...");
    bleScan->start(BLE_SCAN_DURATION_MS); // 5000ms = 5 seconds
  }

  if (now - lastMDNSRefresh >= MDNS_REFRESH_INTERVAL)
  {
    lastMDNSRefresh = now;
    discoverMDNSDevices();
  }

  processMatterEvents();
  delay(10);
}

// ============================================================
// SENSOR SIMULATION (remove once real devices connected)
// ============================================================

void processMatterEvents()
{
  static unsigned long lastSim = 0;
  if (millis() - lastSim > 10000)
  {
    lastSim = millis();
    StaticJsonDocument<256> doc;
    doc["device_id"] = "sensor_01";
    doc["data"]["temperature"] = 20.0f + (random(0, 100) / 10.0f);
    doc["data"]["humidity"] = 40.0f + (random(0, 200) / 10.0f);
    doc["data"]["simulated"] = true;
    char buf[256];
    serializeJson(doc, buf);
    sendHTTPPost(API_UPDATE_ENDPOINT, buf);
  }
}
