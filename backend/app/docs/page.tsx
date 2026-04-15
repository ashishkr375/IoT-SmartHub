"use client";

import "./docs.css";

export default function DocsPage() {
  return (
    <div className="docs-container">
      <div className="docs-bg"></div>
      
      <nav className="docs-nav">
        <a href="/" className="nav-back">← Dashboard</a>
        <h1 className="nav-title">Developer Docs</h1>
      </nav>

      <main className="docs-content">
        <section className="hero-section">
          <h1 className="hero-title">Build Your Smart Device</h1>
          <p className="hero-subtitle">
            Complete guide to creating Matter-compatible devices that connect to the IoT Hub
          </p>
        </section>

        <section className="section">
          <h2 className="section-title">System Architecture</h2>
          <div className="architecture-diagram">
            <div className="arch-node">
              <div className="node-icon">📱</div>
              <div className="node-label">Your Device<br/>(ESP32)</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="node-icon">🌐</div>
              <div className="node-label">Matter<br/>Protocol</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="node-icon">🔌</div>
              <div className="node-label">Gateway<br/>(ESP32-S3)</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="node-icon">☁️</div>
              <div className="node-label">Cloud<br/>Backend</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="node-icon">💻</div>
              <div className="node-label">Dashboard<br/>(You are here)</div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">How It Works</h2>
          <div className="flow-steps">
            <div className="flow-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Device Powers On</h3>
                <p>Your ESP32 device starts and enables Bluetooth LE advertising for commissioning.</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Gateway Discovers Device</h3>
                <p>The ESP32-S3 gateway scans for BLE devices and detects your device.</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Commissioning via BLE</h3>
                <p>Gateway sends WiFi credentials and network info to your device over BLE.</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Device Joins Network</h3>
                <p>Your device connects to WiFi and joins the Matter fabric.</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number">5</div>
              <div className="step-content">
                <h3>mDNS Discovery</h3>
                <p>Device becomes discoverable on the network via mDNS.</p>
              </div>
            </div>
            <div className="flow-step">
              <div className="step-number">6</div>
              <div className="step-content">
                <h3>Data Flow Begins</h3>
                <p>Device sends updates via Matter → Gateway forwards to cloud via HTTPS.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Device Types & Examples</h2>
          <div className="device-grid">
            <div className="device-card">
              <div className="device-icon">💡</div>
              <h3>Smart Light</h3>
              <div className="device-data">
                <code>
{`{
  "device_id": "light_01",
  "data": {
    "power": true,
    "brightness": 75,
    "color": "#FF5733"
  }
}`}
                </code>
              </div>
            </div>
            <div className="device-card">
              <div className="device-icon">🔒</div>
              <h3>Smart Lock</h3>
              <div className="device-data">
                <code>
{`{
  "device_id": "lock_01",
  "data": {
    "status": "locked",
    "user": "john_doe",
    "method": "fingerprint"
  }
}`}
                </code>
              </div>
            </div>
            <div className="device-card">
              <div className="device-icon">🌡️</div>
              <h3>Temperature Sensor</h3>
              <div className="device-data">
                <code>
{`{
  "device_id": "temp_01",
  "data": {
    "temperature": 22.5,
    "humidity": 45.3,
    "pressure": 1013.25
  }
}`}
                </code>
              </div>
            </div>
            <div className="device-card">
              <div className="device-icon">🪟</div>
              <h3>Smart Curtain</h3>
              <div className="device-data">
                <code>
{`{
  "device_id": "curtain_01",
  "data": {
    "position": 50,
    "moving": false,
    "battery": 85
  }
}`}
                </code>
              </div>
            </div>
            <div className="device-card">
              <div className="device-icon">💧</div>
              <h3>Smart Sprinkler</h3>
              <div className="device-data">
                <code>
{`{
  "device_id": "sprinkler_01",
  "data": {
    "soil_moisture": 35,
    "water_state": "off",
    "schedule": "06:00"
  }
}`}
                </code>
              </div>
            </div>
            <div className="device-card">
              <div className="device-icon">📡</div>
              <h3>IR Blaster</h3>
              <div className="device-data">
                <code>
{`{
  "device_id": "ir_01",
  "data": {
    "last_action": "tv_power",
    "command_code": "0x20DF10EF",
    "protocol": "NEC"
  }
}`}
                </code>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Building Your Device</h2>
          
          <div className="tutorial-section">
            <h3 className="tutorial-title">Hardware Requirements</h3>
            <ul className="requirements-list">
              <li>ESP32 or ESP32-C3 (Matter-compatible)</li>
              <li>USB cable for programming</li>
              <li>Your sensor/actuator components</li>
              <li>Power supply (3.3V or 5V depending on board)</li>
            </ul>
          </div>

          <div className="tutorial-section">
            <h3 className="tutorial-title">Software Setup</h3>
            <div className="code-block">
              <div className="code-header">
                <span>Arduino IDE Setup</span>
              </div>
              <pre>
{`// 1. Install ESP32 board support
// File → Preferences → Additional Board Manager URLs:
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json

// 2. Install required libraries
// Sketch → Include Library → Manage Libraries
// - ArduinoJson
// - ESP Matter (coming soon)

// 3. Select your board
// Tools → Board → ESP32 Dev Module`}
              </pre>
            </div>
          </div>

          <div className="tutorial-section">
            <h3 className="tutorial-title">Basic Device Template</h3>
            <div className="code-block">
              <div className="code-header">
                <span>smart_device.ino</span>
                <button className="copy-btn" onClick={() => {
                  const code = document.querySelector('.device-template-code')?.textContent;
                  if (code) navigator.clipboard.writeText(code);
                }}>Copy</button>
              </div>
              <pre className="device-template-code">
{`#include <WiFi.h>
#include <ArduinoJson.h>

// Device Configuration
const char* DEVICE_ID = "my_device_01";
const char* DEVICE_TYPE = "sensor";  // sensor, actuator, hybrid

// Matter Configuration (placeholder)
// Will be replaced with actual Matter SDK calls

void setup() {
  Serial.begin(115200);
  
  // Initialize your sensors/actuators
  initializeHardware();
  
  // Start BLE advertising for commissioning
  startBLEAdvertising();
  
  Serial.println("Device ready for commissioning");
}

void loop() {
  // Check if commissioned
  if (isCommissioned()) {
    // Read sensor data
    float value = readSensor();
    
    // Send update via Matter
    sendMatterUpdate(value);
    
    // Listen for commands
    handleMatterCommands();
  } else {
    // Wait for commissioning
    handleBLECommissioning();
  }
  
  delay(1000);
}

void initializeHardware() {
  // Initialize your specific hardware
  // Example: pinMode(LED_PIN, OUTPUT);
}

void startBLEAdvertising() {
  // Start BLE advertising with Matter service UUID
  // Gateway will discover this device
}

bool isCommissioned() {
  // Check if device has been commissioned
  // Return true if WiFi credentials received
  return WiFi.status() == WL_CONNECTED;
}

float readSensor() {
  // Read your sensor
  // Example: return analogRead(SENSOR_PIN);
  return 22.5;  // Placeholder
}

void sendMatterUpdate(float value) {
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["data"]["value"] = value;
  doc["data"]["timestamp"] = millis();
  
  // Send via Matter protocol
  // Matter stack will forward to gateway
  // Gateway forwards to cloud
}

void handleMatterCommands() {
  // Listen for commands from gateway
  // Example: toggle, set_value, etc.
}

void handleBLECommissioning() {
  // Handle BLE commissioning process
  // Receive WiFi credentials from gateway
  // Join Matter fabric
}`}
              </pre>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Data Format Specification</h2>
          
          <div className="spec-section">
            <h3 className="spec-title">Device Update Message</h3>
            <p className="spec-description">
              Your device sends updates in this format. The gateway automatically forwards it to the cloud.
            </p>
            <div className="code-block">
              <pre>
{`{
  "device_id": "string (required)",
  "data": {
    // Your custom data - any valid JSON
    "key1": "value1",
    "key2": 123,
    "nested": {
      "key3": true
    }
  }
}`}
              </pre>
            </div>
          </div>

          <div className="spec-section">
            <h3 className="spec-title">Command Message</h3>
            <p className="spec-description">
              Commands sent from the dashboard to your device via the gateway.
            </p>
            <div className="code-block">
              <pre>
{`{
  "device_id": "string (required)",
  "command": {
    "action": "string (required)",
    // Additional parameters
    "value": 100,
    "duration": 5000
  }
}`}
              </pre>
            </div>
          </div>

          <div className="spec-section">
            <h3 className="spec-title">Common Actions</h3>
            <div className="actions-grid">
              <div className="action-item">
                <code>toggle</code>
                <span>Switch on/off state</span>
              </div>
              <div className="action-item">
                <code>set_value</code>
                <span>Set specific value</span>
              </div>
              <div className="action-item">
                <code>status</code>
                <span>Request current status</span>
              </div>
              <div className="action-item">
                <code>restart</code>
                <span>Restart device</span>
              </div>
              <div className="action-item">
                <code>calibrate</code>
                <span>Run calibration</span>
              </div>
              <div className="action-item">
                <code>update</code>
                <span>Trigger OTA update</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Testing Your Device</h2>
          
          <div className="test-section">
            <h3 className="test-title">1. Simulate Device Updates</h3>
            <p>Test sending data to the backend without a physical device:</p>
            <div className="code-block">
              <pre>
{`curl -X POST https://smarthublite.vercel.app/api/device/update \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_id": "test_device_01",
    "data": {
      "temperature": 22.5,
      "humidity": 45.3,
      "status": "online"
    }
  }'`}
              </pre>
            </div>
          </div>

          <div className="test-section">
            <h3 className="test-title">2. Send Test Commands</h3>
            <p>Queue a command for your device:</p>
            <div className="code-block">
              <pre>
{`curl -X POST https://smarthublite.vercel.app/api/device/command \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_id": "test_device_01",
    "command": {
      "action": "toggle"
    }
  }'`}
              </pre>
            </div>
          </div>

          <div className="test-section">
            <h3 className="test-title">3. Monitor Serial Output</h3>
            <p>Open Arduino Serial Monitor at 115200 baud to see device logs:</p>
            <div className="code-block">
              <pre>
{`Device ready for commissioning
BLE advertising started
Waiting for gateway...
Connected to gateway!
WiFi credentials received
Connecting to WiFi...
WiFi connected: 192.168.1.50
Joined Matter fabric
Device commissioned successfully
Sending update: {"temperature": 22.5}
Update sent successfully`}
              </pre>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Advanced Topics</h2>
          
          <div className="advanced-grid">
            <div className="advanced-card">
              <h3>🔐 Security</h3>
              <ul>
                <li>Matter provides end-to-end encryption</li>
                <li>Device certificates managed by Matter stack</li>
                <li>Secure commissioning via BLE</li>
                <li>No hardcoded credentials needed</li>
              </ul>
            </div>
            
            <div className="advanced-card">
              <h3>⚡ Power Management</h3>
              <ul>
                <li>Use deep sleep between updates</li>
                <li>Wake on Matter events</li>
                <li>Battery monitoring and reporting</li>
                <li>Low-power BLE advertising</li>
              </ul>
            </div>
            
            <div className="advanced-card">
              <h3>🔄 OTA Updates</h3>
              <ul>
                <li>Firmware updates over WiFi</li>
                <li>Version management</li>
                <li>Rollback on failure</li>
                <li>Scheduled update windows</li>
              </ul>
            </div>
            
            <div className="advanced-card">
              <h3>📊 Data Persistence</h3>
              <ul>
                <li>Store data in MongoDB (flexible JSON)</li>
                <li>No schema migrations needed</li>
                <li>Query by device_id or timestamp</li>
                <li>Automatic indexing</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Troubleshooting</h2>
          
          <div className="troubleshooting">
            <details className="trouble-item">
              <summary>Device not discovered by gateway</summary>
              <div className="trouble-content">
                <p>Check:</p>
                <ul>
                  <li>BLE is enabled and advertising</li>
                  <li>Device is in commissioning mode</li>
                  <li>Gateway is scanning for devices</li>
                  <li>Devices are within BLE range (10m)</li>
                </ul>
              </div>
            </details>
            
            <details className="trouble-item">
              <summary>Device won't connect to WiFi</summary>
              <div className="trouble-content">
                <p>Verify:</p>
                <ul>
                  <li>WiFi credentials are correct</li>
                  <li>Using 2.4GHz WiFi (ESP32 doesn't support 5GHz)</li>
                  <li>WiFi signal strength is adequate</li>
                  <li>Router allows new device connections</li>
                </ul>
              </div>
            </details>
            
            <details className="trouble-item">
              <summary>Data not appearing in dashboard</summary>
              <div className="trouble-content">
                <p>Debug steps:</p>
                <ul>
                  <li>Check device serial output for errors</li>
                  <li>Verify gateway is forwarding data (check gateway logs)</li>
                  <li>Test API directly with curl</li>
                  <li>Check MongoDB connection</li>
                  <li>Refresh dashboard (auto-updates every 5 seconds)</li>
                </ul>
              </div>
            </details>
            
            <details className="trouble-item">
              <summary>Commands not reaching device</summary>
              <div className="trouble-content">
                <p>Ensure:</p>
                <ul>
                  <li>Device is polling for commands</li>
                  <li>device_id matches exactly</li>
                  <li>Gateway is connected to backend</li>
                  <li>Command format is correct</li>
                </ul>
              </div>
            </details>
          </div>
        </section>

        <section className="section cta-section">
          <h2 className="cta-title">Ready to Build?</h2>
          <p className="cta-text">
            Start creating your smart device and join the IoT Hub ecosystem.
          </p>
          <div className="cta-buttons">
            <a href="/" className="cta-btn primary">View Dashboard</a>
            <a href="https://github.com/project-chip/connectedhomeip" target="_blank" rel="noopener" className="cta-btn secondary">
              Matter SDK →
            </a>
          </div>
        </section>
      </main>

      <footer className="docs-footer">
        <p>IoT Hub Documentation • Built with Matter Protocol</p>
      </footer>
    </div>
  );
}
