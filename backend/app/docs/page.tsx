"use client";

import "./docs.css";
import { useState } from "react";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={copy}>
      {copied ? "copied!" : "copy"}
    </button>
  );
}

// ── Full device template code (what students flash) ──────────────────────────
const DEVICE_CODE = `#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ESPmDNS.h>
#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include <Preferences.h>

// ═══════════════════════════════════════════
// STEP 1 — SET YOUR UNIQUE DEVICE ID & TYPE
// ═══════════════════════════════════════════
const char* DEVICE_ID   = "my_device_01";  // ← CHANGE THIS (unique per device)
const char* DEVICE_TYPE = "sensor";        // ← sensor | actuator | hybrid

const char* API_URL         = "https://smarthublite.vercel.app/api/device/update";
const char* API_COMMAND_URL = "https://smarthublite.vercel.app/api/device/command";

#define LED_PIN          LED_BUILTIN
#define SENSOR_INTERVAL  10000   // send data every 10s
#define COMMAND_INTERVAL  5000   // poll commands every 5s

// BLE UUIDs — DO NOT CHANGE (must match gateway)
#define BLE_SERVICE_UUID  "0000FFF6-0000-1000-8000-00805F9B34FB"
#define BLE_CHAR_SSID     "0000FFF7-0000-1000-8000-00805F9B34FB"
#define BLE_CHAR_PASS     "0000FFF8-0000-1000-8000-00805F9B34FB"
#define BLE_CHAR_STATUS   "0000FFF9-0000-1000-8000-00805F9B34FB"
#define BLE_CHAR_COMMAND  "0000FFFA-0000-1000-8000-00805F9B34FB"

enum DeviceState { STATE_BLE_ADVERTISING, STATE_CONNECTING_WIFI, STATE_RUNNING };
DeviceState currentState = STATE_BLE_ADVERTISING;

Preferences prefs;
HTTPClient  httpClient;
NimBLECharacteristic* charStatus = nullptr;

String wifiSSID = "", wifiPassword = "";
bool   credsReceived = false;
unsigned long lastSensorSend = 0, lastCommandPoll = 0, lastBlink = 0;

// ═══════════════════════════════════════════
// STEP 2 — HARDWARE INIT
// Initialize your sensors/actuators here
// ═══════════════════════════════════════════
void initHardware() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Example: pinMode(SENSOR_PIN, INPUT);
  // Example: dht.begin();
  // Example: Wire.begin();
}

// ═══════════════════════════════════════════
// STEP 3 — READ YOUR SENSOR DATA
// Replace with real sensor reads.
// Must return a populated JsonObject.
// ═══════════════════════════════════════════
void readSensors(JsonObject& data) {
  // ↓↓↓ REPLACE THESE WITH YOUR ACTUAL SENSOR READS ↓↓↓

  data["temperature"] = 22.5;   // e.g. dht.readTemperature()
  data["humidity"]    = 55.0;   // e.g. dht.readHumidity()
  data["status"]      = "online";

  // ↑↑↑ ADD AS MANY FIELDS AS YOU NEED ↑↑↑
}

// ═══════════════════════════════════════════
// STEP 4 — HANDLE COMMANDS FROM DASHBOARD
// Add your own actions here.
// ═══════════════════════════════════════════
void handleAction(const char* action, JsonObject& cmd) {
  // ↓↓↓ ADD YOUR CUSTOM ACTIONS HERE ↓↓↓

  if (strcmp(action, "toggle") == 0) {
    static bool state = false;
    state = !state;
    digitalWrite(LED_PIN, state ? HIGH : LOW);

  } else if (strcmp(action, "set_value") == 0) {
    int val = cmd["value"] | 0;
    // analogWrite(OUTPUT_PIN, val);

  } else if (strcmp(action, "restart") == 0) {
    ESP.restart();
  }

  // ↑↑↑ ADD MORE ACTIONS AS NEEDED ↑↑↑
}

// ════════════════════════════════════════════════════════════
// INFRASTRUCTURE — do not modify below unless you know why
// ════════════════════════════════════════════════════════════

void log(const String& tag, const String& msg) {
  Serial.printf("[%8lu] [%-10s] %s\\n", millis(), tag.c_str(), msg.c_str());
}

void sendStateUpdate();

void executeCommandJson(const String& json) {
  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, json)) return;
  JsonObject cmd    = doc.containsKey("command") ? doc["command"].as<JsonObject>() : doc.as<JsonObject>();
  const char* action = cmd["action"] | "unknown";
  log("CMD", "action=" + String(action));
  handleAction(action, cmd);
  sendStateUpdate();
}

class SSIDCallback : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* ch, NimBLEConnInfo& c) override {
    wifiSSID = String(ch->getValue().c_str());
  }
};
class PassCallback : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* ch, NimBLEConnInfo& c) override {
    wifiPassword = String(ch->getValue().c_str());
    if (wifiSSID.length() > 0) {
      credsReceived = true;
      prefs.begin("wifi", false);
      prefs.putString("ssid", wifiSSID);
      prefs.putString("pass", wifiPassword);
      prefs.end();
    }
  }
};
class CmdCallback : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* ch, NimBLEConnInfo& c) override {
    executeCommandJson(String(ch->getValue().c_str()));
  }
};

void setupBLE() {
  NimBLEDevice::init(DEVICE_ID);
  NimBLEDevice::setPower(9);
  NimBLEServer*  srv = NimBLEDevice::createServer();
  NimBLEService* svc = srv->createService(BLE_SERVICE_UUID);
  svc->createCharacteristic(BLE_CHAR_SSID,    NIMBLE_PROPERTY::WRITE)->setCallbacks(new SSIDCallback());
  svc->createCharacteristic(BLE_CHAR_PASS,    NIMBLE_PROPERTY::WRITE)->setCallbacks(new PassCallback());
  charStatus = svc->createCharacteristic(BLE_CHAR_STATUS, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  charStatus->setValue("{}");
  svc->createCharacteristic(BLE_CHAR_COMMAND, NIMBLE_PROPERTY::WRITE)->setCallbacks(new CmdCallback());
  svc->start();
  NimBLEDevice::getAdvertising()->addServiceUUID(BLE_SERVICE_UUID);
  NimBLEDevice::getAdvertising()->start();
  log("BLE", "Advertising as: " + String(DEVICE_ID));
}

void updateBLEStatus() {
  if (!charStatus) return;
  StaticJsonDocument<128> d;
  d["device_id"] = DEVICE_ID; d["ip"] = WiFi.localIP().toString(); d["type"] = DEVICE_TYPE;
  char b[128]; serializeJson(d, b);
  charStatus->setValue(b); charStatus->notify();
}

bool connectWiFi(const String& ssid, const String& pass) {
  WiFi.mode(WIFI_STA); WiFi.begin(ssid.c_str(), pass.c_str());
  int n = 0;
  while (WiFi.status() != WL_CONNECTED && n++ < 40) { delay(500); Serial.print("."); }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) { log("WiFi", "IP: " + WiFi.localIP().toString()); return true; }
  return false;
}

void sendSensorData() {
  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  JsonObject data  = doc.createNestedObject("data");
  readSensors(data);
  data["uptime"] = millis() / 1000;
  data["rssi"]   = WiFi.RSSI();
  char buf[512]; serializeJson(doc, buf);
  httpClient.begin(API_URL);
  httpClient.addHeader("Content-Type", "application/json");
  httpClient.setTimeout(10000);
  int code = httpClient.POST(buf);
  log("CLOUD", code >= 200 && code < 300 ? "✅ " + String(code) : "❌ " + String(code));
  httpClient.end();
}

void sendStateUpdate() {
  StaticJsonDocument<128> doc;
  doc["device_id"]      = DEVICE_ID;
  doc["data"]["status"] = "command_executed";
  doc["data"]["uptime"] = millis() / 1000;
  char buf[128]; serializeJson(doc, buf);
  httpClient.begin(API_URL);
  httpClient.addHeader("Content-Type", "application/json");
  httpClient.setTimeout(8000);
  httpClient.POST(buf); httpClient.end();
}

void pollCommands() {
  String url = String(API_COMMAND_URL) + "?device_id=" + String(DEVICE_ID);
  httpClient.begin(url); httpClient.setTimeout(8000);
  int code = httpClient.GET();
  if (code != 200) { httpClient.end(); return; }
  String body = httpClient.getString(); httpClient.end();
  if (body.length() < 3 || body == "[]") return;
  log("CMD-POLL", body.substring(0, 80) + "...");
  StaticJsonDocument<1024> doc;
  if (deserializeJson(doc, body)) return;
  auto process = [](JsonObject cmd) {
    const char* action = cmd["command"]["action"] | "unknown";
    executeCommandJson("{\\\"action\\\":\\\"" + String(action) + "\\\"}");
  };
  if (doc.is<JsonArray>()) for (JsonObject c : doc.as<JsonArray>()) process(c);
  else if (doc.is<JsonObject>()) process(doc.as<JsonObject>());
}

void setup() {
  Serial.begin(115200); delay(1000);
  Serial.println("\\n╔═══════════════════════════════╗");
  Serial.printf ("║  SmartHub Device: %-13s║\\n", DEVICE_ID);
  Serial.println("╚═══════════════════════════════╝");
  initHardware();
  prefs.begin("wifi", true);
  wifiSSID     = prefs.getString("ssid", "");
  wifiPassword = prefs.getString("pass", "");
  prefs.end();
  if (wifiSSID.length() > 0) {
    credsReceived = true; currentState = STATE_CONNECTING_WIFI;
  } else {
    currentState = STATE_BLE_ADVERTISING; setupBLE();
    Serial.println("  Waiting for gateway BLE commissioning...");
  }
}

void loop() {
  if (currentState == STATE_BLE_ADVERTISING) {
    if (millis() - lastBlink > 1000) { lastBlink = millis(); digitalWrite(LED_PIN, !digitalRead(LED_PIN)); }
    if (credsReceived) currentState = STATE_CONNECTING_WIFI;
    return;
  }
  if (currentState == STATE_CONNECTING_WIFI) {
    if (connectWiFi(wifiSSID, wifiPassword)) {
      updateBLEStatus();
      if (MDNS.begin(DEVICE_ID)) {
        MDNS.addService("smarthub","tcp",80);
        MDNS.addServiceTxt("smarthub","tcp","device_id",DEVICE_ID);
      }
      sendSensorData();
      currentState = STATE_RUNNING; lastSensorSend = millis();
      Serial.println("  ✅ COMMISSIONED & RUNNING!");
    } else { delay(5000); }
    return;
  }
  if (currentState == STATE_RUNNING) {
    if (WiFi.status() != WL_CONNECTED) { currentState = STATE_CONNECTING_WIFI; return; }
    if (millis() - lastSensorSend  >= SENSOR_INTERVAL)  { lastSensorSend  = millis(); sendSensorData(); }
    if (millis() - lastCommandPoll >= COMMAND_INTERVAL) { lastCommandPoll = millis(); pollCommands(); }
    delay(10);
  }
}`;

const UPDATE_CURL = `curl -X POST https://smarthublite.vercel.app/api/device/update \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_id": "my_device_01",
    "data": {
      "temperature": 24.5,
      "humidity": 60,
      "status": "online"
    }
  }'`;

const COMMAND_CURL = `curl -X POST https://smarthublite.vercel.app/api/device/command \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_id": "my_device_01",
    "command": { "action": "toggle" }
  }'`;

const BROWSER_TEST = `// Run in browser DevTools console (F12 → Console)
fetch("https://smarthublite.vercel.app/api/device/command", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    device_id: "my_device_01",
    command: { action: "toggle" }
  })
}).then(r => r.json()).then(console.log)`;

const SERIAL_OK = `╔═══════════════════════════════╗
║  SmartHub Device: my_device_01║
╚═══════════════════════════════╝
  Waiting for gateway BLE commissioning...
[    1041] [BLE       ] Advertising as: my_device_01
[   12304] [BLE       ] SSID received ── credentials saved
[   12821] [WiFi      ] IP: 192.168.1.47
[   13200] [BLE       ] Status updated: {"device_id":"my_device_01","ip":"192.168.1.47"}
[   14011] [CLOUD     ] ✅ 200
  ✅ COMMISSIONED & RUNNING!
[   24015] [CLOUD     ] ✅ 200
[   29015] [CMD-POLL  ] [{"command":{"action":"toggle"},...}]...
[   29016] [CMD       ] action=toggle
[   29017] [CLOUD     ] ✅ 200`;

export default function DocsPage() {
  return (
    <div className="docs-container">
      <div className="grid-bg" />

      {/* ── NAV ── */}
      <nav className="docs-nav">
        <div className="nav-left">
          <a href="/" className="nav-back">← back</a>
          <span className="nav-logo">smarthub<span>/</span>docs</span>
        </div>
        <span className="nav-badge">v2.0 · NimBLE</span>
      </nav>

      <main className="docs-main">

        {/* ── HERO ── */}
        <div className="hero">
          <div className="hero-tag">SmartHub IoT Platform</div>
          <h1>Connect your ESP32.<br/>No boilerplate.<br/><em>Just your logic.</em></h1>
          <p className="hero-desc">
            Flash the template, fill in your sensor reads and actions,
            power on next to the gateway — you're live on the dashboard in under 2 minutes.
          </p>
          <div className="hero-stats">
            <div className="stat-item"><span className="stat-num">3</span><span className="stat-label">Steps to connect</span></div>
            <div className="stat-item"><span className="stat-num">5s</span><span className="stat-label">Command latency</span></div>
            <div className="stat-item"><span className="stat-num">∞</span><span className="stat-label">Device types</span></div>
          </div>
        </div>

        {/* ── ARCHITECTURE ── */}
        <section className="section">
          <div className="section-header">
            <span className="section-num">01</span>
            <h2 className="section-title">System Architecture</h2>
            <div className="section-line" />
          </div>

          <div className="arch-diagram">
            <div className="arch-node">
              <div className="arch-node-icon">📟</div>
              <div className="arch-node-label"><strong>Your ESP32</strong>sensor / actuator</div>
            </div>
            <div className="arch-arrow">──BLE──›</div>
            <div className="arch-node">
              <div className="arch-node-icon">🔌</div>
              <div className="arch-node-label"><strong>Gateway</strong>ESP32-S3</div>
            </div>
            <div className="arch-arrow">──HTTPS──›</div>
            <div className="arch-node">
              <div className="arch-node-icon">☁️</div>
              <div className="arch-node-label"><strong>Cloud API</strong>Vercel + MongoDB</div>
            </div>
            <div className="arch-arrow">‹──poll──›</div>
            <div className="arch-node">
              <div className="arch-node-icon">💻</div>
              <div className="arch-node-label"><strong>Dashboard</strong>smarthublite.vercel.app</div>
            </div>
          </div>

          <div style={{marginTop:"1.5rem"}}>
            <div className="flow-steps">
              {[
                ["01","BLE Commissioning","Gateway scans every 15s. Your device advertises. Gateway connects, sends WiFi creds over BLE.","BLE"],
                ["02","WiFi Join","Device receives SSID + password, connects, reports IP back to gateway via BLE status characteristic.","WiFi"],
                ["03","Data Push","Device POSTs sensor data every 10s directly to the cloud API. Any JSON you want — no schema.","HTTPS"],
                ["04","Command Flow","Dashboard → POST /api/device/command → Device polls every 5s → executes your handleAction()","HTTPS"],
                ["05","Heartbeat","Gateway sends heartbeat every 30s. Device appears online in dashboard.","HTTPS"],
              ].map(([num, title, desc, badge]) => (
                <div className="flow-step" key={num}>
                  <span className="step-num">{num}</span>
                  <div className="step-body">
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                  <span className={`step-badge badge-${badge.toLowerCase()}`}>{badge}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── QUICK START CODE ── */}
        <section className="section">
          <div className="section-header">
            <span className="section-num">02</span>
            <h2 className="section-title">Device Template</h2>
            <div className="section-line" />
          </div>

          <p style={{color:"var(--muted)",marginBottom:"1.5rem",fontSize:"0.95rem",lineHeight:"1.7"}}>
            This is the <strong style={{color:"var(--text)"}}>complete working code</strong>. 
            You only need to edit <strong style={{color:"var(--green)"}}>3 sections</strong> marked with STEP comments.
            Everything else — BLE, commissioning, WiFi, cloud push, command polling — is handled for you.
          </p>

          {/* what to change */}
          <div className="customize-zone">
            <div className="customize-header">
              <span className="zone-tag">EDIT THESE</span>
              <span>3 sections you need to fill in</span>
            </div>
            <div className="customize-body">
              <div className="customize-fields">
                <div className="field-row">
                  <span className="field-name">STEP 1 · DEVICE_ID</span>
                  <span className="field-desc">Unique string per device e.g. <code style={{color:"var(--orange)"}}>light_01</code>, <code style={{color:"var(--orange)"}}>temp_kitchen</code>. Must match exactly when sending commands from dashboard.</span>
                </div>
                <div className="field-row">
                  <span className="field-name">STEP 2 · initHardware()</span>
                  <span className="field-desc">Call <code style={{color:"var(--orange)"}}>pinMode()</code>, <code style={{color:"var(--orange)"}}>Wire.begin()</code>, sensor <code style={{color:"var(--orange)"}}>.begin()</code> etc. Runs once at startup.</span>
                </div>
                <div className="field-row">
                  <span className="field-name">STEP 3 · readSensors()</span>
                  <span className="field-desc">Populate the <code style={{color:"var(--orange)"}}>data</code> JSON object with your readings. Any keys you add appear on the dashboard automatically.</span>
                </div>
                <div className="field-row">
                  <span className="field-name">STEP 4 · handleAction()</span>
                  <span className="field-desc">Add <code style={{color:"var(--orange)"}}>if strcmp(action, "your_action")</code> cases. Called when dashboard sends a command to your device.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="code-wrap">
            <div className="code-header">
              <span className="code-filename">SmartHubDevice.ino</span>
              <CopyBtn text={DEVICE_CODE} />
            </div>
            <div className="code-scroll">
              <pre>{DEVICE_CODE}</pre>
            </div>
          </div>

          <div style={{
            padding:"1rem 1.25rem",
            background:"var(--bg2)",
            border:"1px solid var(--border2)",
            borderRadius:"6px",
            marginTop:"1rem"
          }}>
            <p style={{fontFamily:"var(--mono)",fontSize:"0.78rem",color:"var(--muted)",lineHeight:"1.8"}}>
              <span style={{color:"var(--green)"}}>Libraries required →</span>{" "}
              NimBLE-Arduino <span style={{color:"var(--muted)"}}>by h2zero (2.x)</span>
              {"  ·  "}ArduinoJson <span style={{color:"var(--muted)"}}>by Benoit Blanchon</span>
              <br/>
              <span style={{color:"var(--green)"}}>Board settings →</span>{" "}
              ESP32S3 Dev Module · USB CDC On Boot: Enabled · Partition: Huge APP (3MB No OTA)
            </p>
          </div>
        </section>

        {/* ── DEVICE TYPES ── */}
        <section className="section">
          <div className="section-header">
            <span className="section-num">03</span>
            <h2 className="section-title">Device Examples</h2>
            <div className="section-line" />
          </div>
          <p style={{color:"var(--muted)",marginBottom:"1.5rem",fontSize:"0.9rem"}}>
            What your <code style={{color:"var(--cyan)",fontFamily:"var(--mono)"}}>readSensors()</code> output looks like for different device types.
          </p>
          <div className="device-grid">
            {[
              { icon:"💡", name:"Smart Light", type:"actuator", json:`{\n  <span class="jk">"device_id"</span>: <span class="js">"light_01"</span>,\n  <span class="jk">"data"</span>: {\n    <span class="jk">"power"</span>:      <span class="jb">true</span>,\n    <span class="jk">"brightness"</span>: <span class="jn">75</span>,\n    <span class="jk">"color"</span>:      <span class="js">"#FF5733"</span>\n  }\n}` },
              { icon:"🌡️", name:"Temp Sensor", type:"sensor", json:`{\n  <span class="jk">"device_id"</span>: <span class="js">"temp_01"</span>,\n  <span class="jk">"data"</span>: {\n    <span class="jk">"temperature"</span>: <span class="jn">22.5</span>,\n    <span class="jk">"humidity"</span>:    <span class="jn">45.3</span>,\n    <span class="jk">"pressure"</span>:    <span class="jn">1013.2</span>\n  }\n}` },
              { icon:"🔒", name:"Smart Lock", type:"actuator", json:`{\n  <span class="jk">"device_id"</span>: <span class="js">"lock_01"</span>,\n  <span class="jk">"data"</span>: {\n    <span class="jk">"status"</span>: <span class="js">"locked"</span>,\n    <span class="jk">"user"</span>:   <span class="js">"john_doe"</span>,\n    <span class="jk">"method"</span>: <span class="js">"rfid"</span>\n  }\n}` },
              { icon:"💧", name:"Sprinkler", type:"hybrid", json:`{\n  <span class="jk">"device_id"</span>: <span class="js">"sprinkler_01"</span>,\n  <span class="jk">"data"</span>: {\n    <span class="jk">"soil_moisture"</span>: <span class="jn">35</span>,\n    <span class="jk">"water_state"</span>:   <span class="js">"off"</span>,\n    <span class="jk">"battery"</span>:       <span class="jn">92</span>\n  }\n}` },
              { icon:"📡", name:"IR Blaster", type:"actuator", json:`{\n  <span class="jk">"device_id"</span>: <span class="js">"ir_01"</span>,\n  <span class="jk">"data"</span>: {\n    <span class="jk">"last_action"</span>:  <span class="js">"tv_power"</span>,\n    <span class="jk">"protocol"</span>:     <span class="js">"NEC"</span>,\n    <span class="jk">"command_code"</span>: <span class="js">"0x20DF10EF"</span>\n  }\n}` },
              { icon:"🪟", name:"Smart Curtain", type:"hybrid", json:`{\n  <span class="jk">"device_id"</span>: <span class="js">"curtain_01"</span>,\n  <span class="jk">"data"</span>: {\n    <span class="jk">"position"</span>: <span class="jn">50</span>,\n    <span class="jk">"moving"</span>:   <span class="jb">false</span>,\n    <span class="jk">"battery"</span>:  <span class="jn">85</span>\n  }\n}` },
            ].map((d) => (
              <div className="device-card" key={d.name}>
                <div className="device-card-top">
                  <span className="device-icon">{d.icon}</span>
                  <div>
                    <h3>{d.name}</h3>
                    <span className="device-card-type">{d.type}</span>
                  </div>
                </div>
                <div className="device-json" dangerouslySetInnerHTML={{__html: d.json}} />
              </div>
            ))}
          </div>
        </section>

        {/* ── API REFERENCE ── */}
        <section className="section">
          <div className="section-header">
            <span className="section-num">04</span>
            <h2 className="section-title">API Reference</h2>
            <div className="section-line" />
          </div>

          <div className="api-grid">
            {/* POST update */}
            <div className="api-card">
              <div className="api-card-header">
                <span className="method-badge method-post">POST</span>
                <span className="api-path">/api/device/update</span>
                <span className="api-desc">Push data to dashboard</span>
              </div>
              <div className="api-card-body">
                <p>Called automatically by the device every 10 seconds. Any JSON fields inside <code style={{color:"var(--cyan)",fontFamily:"var(--mono)"}}>data</code> appear on the dashboard instantly.</p>
                <div className="code-wrap">
                  <div className="code-header">
                    <span className="code-filename">curl · test without hardware</span>
                    <CopyBtn text={UPDATE_CURL} />
                  </div>
                  <div className="code-scroll"><pre>{UPDATE_CURL}</pre></div>
                </div>
              </div>
            </div>

            {/* POST command */}
            <div className="api-card">
              <div className="api-card-header">
                <span className="method-badge method-post">POST</span>
                <span className="api-path">/api/device/command</span>
                <span className="api-desc">Queue a command</span>
              </div>
              <div className="api-card-body">
                <p>Queue a command from the dashboard or any HTTP client. Device polls this endpoint every 5 seconds and calls <code style={{color:"var(--cyan)",fontFamily:"var(--mono)"}}>handleAction()</code> with the action string.</p>
                <div className="code-wrap">
                  <div className="code-header">
                    <span className="code-filename">curl</span>
                    <CopyBtn text={COMMAND_CURL} />
                  </div>
                  <div className="code-scroll"><pre>{COMMAND_CURL}</pre></div>
                </div>
                <div className="code-wrap" style={{marginTop:"1rem"}}>
                  <div className="code-header">
                    <span className="code-filename">browser console (F12)</span>
                    <CopyBtn text={BROWSER_TEST} />
                  </div>
                  <div className="code-scroll"><pre>{BROWSER_TEST}</pre></div>
                </div>

                <div className="actions-grid">
                  {[
                    ["toggle",    "Flip on/off state"],
                    ["set_value", "Set a numeric value"],
                    ["status",    "Report current state"],
                    ["restart",   "Reboot the device"],
                    ["calibrate", "Run calibration"],
                    ["custom",    "Add your own in handleAction()"],
                  ].map(([code, desc]) => (
                    <div className="action-pill" key={code}>
                      <code>{code}</code>
                      <span>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* GET command */}
            <div className="api-card">
              <div className="api-card-header">
                <span className="method-badge method-get">GET</span>
                <span className="api-path">/api/device/command?device_id=xxx</span>
                <span className="api-desc">Fetch pending commands</span>
              </div>
              <div className="api-card-body">
                <p>The device calls this automatically every 5s. Returns an array of pending commands. You do not need to call this manually.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── EXPECTED SERIAL OUTPUT ── */}
        <section className="section">
          <div className="section-header">
            <span className="section-num">05</span>
            <h2 className="section-title">Expected Serial Output</h2>
            <div className="section-line" />
          </div>
          <p style={{color:"var(--muted)",marginBottom:"1.25rem",fontSize:"0.9rem"}}>
            Open Arduino IDE → Tools → Serial Monitor at <strong style={{color:"var(--text)"}}>115200 baud</strong>. This is what a successful commissioning + command looks like.
          </p>
          <div className="serial-log">
            <div className="serial-titlebar">
              <span className="serial-dot dot-r"/><span className="serial-dot dot-y"/><span className="serial-dot dot-g"/>
              <span className="serial-title">Serial Monitor — 115200 baud</span>
            </div>
            <div className="serial-body">
              <div className="sl-dim">╔═══════════════════════════════╗</div>
              <div className="sl-dim">║  SmartHub Device: my_device_01║</div>
              <div className="sl-dim">╚═══════════════════════════════╝</div>
              <div>{"  Waiting for gateway BLE commissioning..."}</div>
              <div><span className="sl-info">[    1041] [BLE      ] </span>Advertising as: my_device_01</div>
              <div className="sl-dim">{"  ."}</div>
              <div><span className="sl-info">[   12304] [BLE      ] </span>SSID received ── credentials saved</div>
              <div>{"                  Connecting to WiFi.........."}</div>
              <div><span className="sl-ok">[   12821] [WiFi     ] </span>IP: 192.168.1.47</div>
              <div><span className="sl-ok">[   14011] [CLOUD    ] </span>✅ 200</div>
              <div className="sl-ok">{"  ✅ COMMISSIONED & RUNNING!"}</div>
              <div><span className="sl-ok">[   24015] [CLOUD    ] </span>✅ 200</div>
              <div><span className="sl-info">[   29015] [CMD-POLL ] </span>{`[{"command":{"action":"toggle"},...}]...`}</div>
              <div><span className="sl-warn">[   29016] [CMD      ] </span>action=toggle</div>
              <div><span className="sl-ok">[   29017] [CLOUD    ] </span>✅ 200</div>
            </div>
          </div>
        </section>

        {/* ── TROUBLESHOOTING ── */}
        <section className="section">
          <div className="section-header">
            <span className="section-num">06</span>
            <h2 className="section-title">Troubleshooting</h2>
            <div className="section-line" />
          </div>
          <div className="trouble-list">
            {[
              ["Device not discovered by gateway",
               ["Gateway scans every 15s — wait up to 30s after powering on",
                "Check Serial Monitor shows 'Advertising as: ...' line",
                "Keep devices within 5m BLE range during commissioning",
                "If stuck, erase flash (Tools → Erase All Flash) and reflash"]],
              ["Commission fails / BLE connect error",
               ["Gateway retries 3 times — watch gateway serial for attempt logs",
                "Power cycle both devices and try again",
                "Ensure only one device is advertising at a time when testing"]],
              ["WiFi connects but data not on dashboard",
               ["Confirm DEVICE_ID has no spaces or special characters",
                "Check Serial shows '✅ 200' after CLOUD posts",
                "Dashboard auto-refreshes every 5s — wait a moment",
                "Test API directly with the curl command in section 04"]],
              ["Commands sent but device doesn't respond",
               ["Device polls every 5s — up to 5s delay is normal",
                "Confirm device_id in command matches DEVICE_ID exactly (case-sensitive)",
                "Check Serial shows CMD-POLL and CMD lines",
                "Verify your handleAction() has the correct action string comparison"]],
              ["Saved WiFi creds wrong / need to re-commission",
               ["In Arduino IDE: Tools → Erase All Flash Before Sketch Upload → Enable, flash once, disable again",
                "Or add prefs.begin(\"wifi\",false); prefs.clear(); prefs.end(); to setup() temporarily"]],
            ].map(([q, answers]) => (
              <details className="trouble" key={q as string}>
                <summary>{q as string}</summary>
                <div className="trouble-body">
                  <ul>{(answers as string[]).map(a => <li key={a}>{a}</li>)}</ul>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="cta">
          <h2>Ready to <em>ship</em>?</h2>
          <p>Power on your ESP32 next to the gateway and watch it appear on the dashboard.</p>
          <div className="cta-btns">
            <a href="/" className="btn btn-primary">Open Dashboard →</a>
            <a href="https://github.com/h2zero/NimBLE-Arduino" target="_blank" rel="noopener" className="btn btn-outline">NimBLE Library</a>
          </div>
        </div>

      </main>

      <footer className="docs-footer">
        SmartHub IoT Platform · NimBLE 2.x · ArduinoJson · ESP32-S3
      </footer>
    </div>
  );
}