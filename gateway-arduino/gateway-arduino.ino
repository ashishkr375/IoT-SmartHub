/*
 * Smart Home Gateway - ESP32-S3
 * Matter Controller + HTTPS Bridge
 * 
 * Architecture:
 * Matter Devices → ESP32-S3 Gateway → HTTPS → Next.js Backend → MongoDB → Dashboard
 * 
 * Required Libraries (Install via Arduino Library Manager):
 * - ArduinoJson by Benoit Blanchon
 * - WiFi (built-in)
 * - HTTPClient (built-in)
 * 
 * Board: ESP32S3 Dev Module
 * Upload Speed: 921600
 * USB CDC On Boot: Enabled
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend API Configuration
const char* API_BASE_URL = "https://io-t-smart-hub.vercel.app";
const char* API_UPDATE_ENDPOINT = "/api/device/update";
const char* API_COMMAND_ENDPOINT = "/api/device/command";

// Device Configuration
const char* DEVICE_ID = "gateway_01";

// ============================================
// GLOBAL OBJECTS
// ============================================

HTTPClient http;

unsigned long lastHeartbeat = 0;
const long HEARTBEAT_INTERVAL = 30000;  // 30 seconds

unsigned long lastCommandPoll = 0;
const long COMMAND_POLL_INTERVAL = 5000;  // 5 seconds

// ============================================
// WIFI FUNCTIONS
// ============================================

void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println();
    Serial.println("WiFi connection failed!");
  }
}

// ============================================
// HTTP API FUNCTIONS
// ============================================

bool sendHTTPPost(const char* endpoint, const char* jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return false;
  }

  String url = String(API_BASE_URL) + String(endpoint);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    Serial.print("Response: ");
    Serial.println(response);
    http.end();
    return true;
  } else {
    Serial.print("HTTP Error code: ");
    Serial.println(httpResponseCode);
    http.end();
    return false;
  }
}

String fetchCommands() {
  if (WiFi.status() != WL_CONNECTED) {
    return "";
  }

  String url = String(API_BASE_URL) + String(API_COMMAND_ENDPOINT) + "?device_id=" + String(DEVICE_ID);
  
  http.begin(url);
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    http.end();
    return response;
  } else {
    http.end();
    return "";
  }
}

void handleCommand(const char* json) {
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, json);

  if (error) {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  const char* deviceId = doc["device_id"];
  JsonObject command = doc["command"];

  if (!deviceId || command.isNull()) {
    Serial.println("Invalid command format");
    return;
  }

  Serial.print("Command for device: ");
  Serial.println(deviceId);

  // Check if command is for this gateway
  if (strcmp(deviceId, DEVICE_ID) == 0) {
    const char* action = command["action"];
    
    if (action) {
      Serial.print("Executing action: ");
      Serial.println(action);

      // Handle different actions
      if (strcmp(action, "toggle") == 0) {
        digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
        sendStatusUpdate("toggled");
      } else if (strcmp(action, "status") == 0) {
        sendStatusUpdate("online");
      } else if (strcmp(action, "restart") == 0) {
        Serial.println("Restarting...");
        delay(1000);
        ESP.restart();
      }
    }
  } else {
    // Forward command to Matter device
    Serial.print("Forwarding command to Matter device: ");
    Serial.println(deviceId);
    controlMatterDevice(deviceId, command);
  }
}

void pollCommands() {
  String response = fetchCommands();
  
  if (response.length() > 0) {
    Serial.println("Received commands:");
    Serial.println(response);
    
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error && doc.is<JsonArray>()) {
      JsonArray commands = doc.as<JsonArray>();
      for (JsonObject cmd : commands) {
        char buffer[512];
        serializeJson(cmd, buffer);
        handleCommand(buffer);
      }
    } else if (!error) {
      char buffer[512];
      serializeJson(doc, buffer);
      handleCommand(buffer);
    }
  }
}

// ============================================
// DEVICE FUNCTIONS
// ============================================

void sendStatusUpdate(const char* status) {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  
  JsonObject data = doc.createNestedObject("data");
  data["status"] = status;
  data["uptime"] = millis() / 1000;
  data["rssi"] = WiFi.RSSI();
  data["ip"] = WiFi.localIP().toString();
  data["free_heap"] = ESP.getFreeHeap();

  char buffer[256];
  serializeJson(doc, buffer);
  
  sendHTTPPost(API_UPDATE_ENDPOINT, buffer);
}

void sendSensorData(const char* deviceId, float temperature, float humidity) {
  StaticJsonDocument<256> doc;
  doc["device_id"] = deviceId;
  
  JsonObject data = doc.createNestedObject("data");
  data["temperature"] = temperature;
  data["humidity"] = humidity;
  data["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);
  
  sendHTTPPost(API_UPDATE_ENDPOINT, buffer);
}

void sendGenericUpdate(const char* deviceId, const char* rawJson) {
  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceId;
  
  // Parse raw JSON and add as data
  StaticJsonDocument<256> dataDoc;
  DeserializationError error = deserializeJson(dataDoc, rawJson);
  
  if (!error) {
    doc["data"] = dataDoc.as<JsonObject>();
  } else {
    doc["data"]["raw"] = rawJson;
  }

  char buffer[512];
  serializeJson(doc, buffer);
  
  sendHTTPPost(API_UPDATE_ENDPOINT, buffer);
}

void sendMatterDeviceUpdate(const char* deviceId, JsonObject attributes) {
  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceId;
  doc["data"] = attributes;
  doc["timestamp"] = millis();

  char buffer[512];
  serializeJson(doc, buffer);
  
  sendHTTPPost(API_UPDATE_ENDPOINT, buffer);
}

// ============================================
// SETUP
// ============================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("========================================");
  Serial.println("ESP32-S3 Smart Home Gateway");
  Serial.println("Matter Controller + HTTPS Bridge");
  Serial.println("========================================");

  // Setup built-in LED
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // Connect to WiFi
  setupWiFi();

  // Initialize Matter stack
  initializeMatter();

  // Send online status
  if (WiFi.status() == WL_CONNECTED) {
    sendStatusUpdate("online");
  }

  Serial.println("Setup complete!");
  Serial.println("Backend: " + String(API_BASE_URL));
  Serial.println("========================================");
}

// ============================================
// MAIN LOOP
// ============================================

void loop() {
  // Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, reconnecting...");
    setupWiFi();
    return;
  }

  unsigned long now = millis();

  // Poll for commands from backend
  if (now - lastCommandPoll > COMMAND_POLL_INTERVAL) {
    lastCommandPoll = now;
    pollCommands();
  }

  // Send heartbeat
  if (now - lastHeartbeat > HEARTBEAT_INTERVAL) {
    lastHeartbeat = now;
    sendStatusUpdate("heartbeat");
  }

  // Process Matter events
  processMatterEvents();

  // Example: Simulate sensor data every 10 seconds
  static unsigned long lastSensorRead = 0;
  if (now - lastSensorRead > 10000) {
    lastSensorRead = now;
    
    // Simulate temperature and humidity readings
    float temp = 20.0 + (random(0, 100) / 10.0);
    float humidity = 40.0 + (random(0, 200) / 10.0);
    
    sendSensorData("sensor_01", temp, humidity);
  }

  delay(10);  // Small delay to prevent watchdog issues
}

// ============================================
// MATTER FUNCTIONS
// ============================================

void initializeMatter() {
  Serial.println("Initializing Matter stack...");
  
  // Initialize Matter/CHIP controller
  // This will be implemented with actual Matter SDK
  
  Serial.println("Matter stack initialized");
  Serial.println("Ready for device commissioning");
}

void processMatterEvents() {
  // Poll Matter stack for events
  // When a Matter device sends an update, forward it to backend
  
  // Example: If Matter device "fan_01" reports speed change
  // StaticJsonDocument<256> doc;
  // doc["speed"] = 75;
  // doc["power"] = true;
  // sendMatterDeviceUpdate("fan_01", doc.as<JsonObject>());
}

void commissionMatterDevice() {
  Serial.println("Starting Matter commissioning...");
  Serial.println("1. Enable BLE on device");
  Serial.println("2. Scan for devices");
  Serial.println("3. Send WiFi credentials via BLE");
  Serial.println("4. Device joins Matter fabric");
  Serial.println("5. Device becomes discoverable via mDNS");
  
  // Actual implementation will use Matter SDK
}

void discoverMatterDevices() {
  Serial.println("Discovering Matter devices via mDNS...");
  
  // Use mDNS to find commissioned devices
  // Register them internally
}

void controlMatterDevice(const char* deviceId, JsonObject command) {
  Serial.print("Controlling Matter device: ");
  Serial.println(deviceId);
  
  // Map command to Matter cluster/attribute
  // Example: {"action": "toggle"} → OnOff cluster toggle command
  
  const char* action = command["action"];
  
  if (action) {
    Serial.print("Action: ");
    Serial.println(action);
    
    // Send Matter command to device
    // Device will respond with updated state
    // Forward that state to backend via sendMatterDeviceUpdate()
  }
}
