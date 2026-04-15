# ESP32-S3 Gateway - Arduino Version

Single-file Arduino sketch for ESP32-S3 Matter Controller with HTTPS bridge to backend.

## Quick Start

### 1. Install Arduino IDE

Download from: https://www.arduino.cc/en/software

### 2. Install ESP32 Board Support

1. Open Arduino IDE
2. Go to **File → Preferences**
3. Add to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Boards Manager**
5. Search for "esp32"
6. Install "esp32 by Espressif Systems"

### 3. Install Required Libraries

Go to **Sketch → Include Library → Manage Libraries** and install:

- **ArduinoJson** by Benoit Blanchon (for JSON parsing)

### 4. Configure the Sketch

Open `gateway-arduino.ino` and update:

```cpp
// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend API Configuration
const char* API_BASE_URL = "https://smarthublite.vercel.app";
```

### 5. Select Board and Port

1. Go to **Tools → Board → esp32 → ESP32S3 Dev Module**
2. Configure board settings:
   - **USB CDC On Boot**: Enabled
   - **Upload Speed**: 921600
   - **USB Mode**: Hardware CDC and JTAG
3. Go to **Tools → Port** and select your ESP32 COM port

### 6. Upload

1. Click **Upload** button (→)
2. If upload fails, hold the **BOOT** button on ESP32 and click Upload again
3. Open **Serial Monitor** (Tools → Serial Monitor) at 115200 baud

## Features

- WiFi connectivity with auto-reconnect
- HTTPS REST API communication
- Matter device controller (framework ready)
- Command polling from backend
- JSON message parsing
- Heartbeat status updates every 30 seconds
- Built-in LED control via commands
- Simulated sensor data publishing
- Generic device data forwarding
- BLE commissioning support (Matter)

## API Endpoints

### POST /api/device/update
Gateway sends device data to backend.

### GET /api/device/command?device_id=gateway_01
Gateway polls for pending commands.

## Message Format

### Device Update (ESP32 → Backend via HTTPS POST)
```json
{
  "device_id": "gateway_01",
  "data": {
    "status": "online",
    "uptime": 12345,
    "rssi": -45,
    "ip": "192.168.1.50",
    "free_heap": 234567
  }
}
```

### Sensor Data (ESP32 → Backend)
```json
{
  "device_id": "sensor_01",
  "data": {
    "temperature": 22.5,
    "humidity": 45.3,
    "timestamp": 12345678
  }
}
```

### Command (Backend → ESP32 via polling)
```json
{
  "device_id": "gateway_01",
  "command": {
    "action": "toggle"
  }
}
```

## Available Commands

Send these via the web dashboard:

### Toggle LED
```json
{
  "device_id": "gateway_01",
  "command": { "action": "toggle" }
}
```

### Get Status
```json
{
  "device_id": "gateway_01",
  "command": { "action": "status" }
}
```

### Restart Device
```json
{
  "device_id": "gateway_01",
  "command": { "action": "restart" }
}
```

## Testing

### Test Device Update
```bash
curl -X POST https://smarthublite.vercel.app/api/device/update \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test_01","data":{"temperature":22.5}}'
```

### Test Command Queue
```bash
curl -X POST https://smarthublite.vercel.app/api/device/command \
  -H "Content-Type: application/json" \
  -d '{"device_id":"gateway_01","command":{"action":"toggle"}}'
```

### Check Pending Commands
```bash
curl "https://smarthublite.vercel.app/api/device/command?device_id=gateway_01"
```

## Troubleshooting

### Upload Failed
- Hold BOOT button during upload
- Check correct COM port selected
- Try lower upload speed (115200)
- Install USB drivers: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

### WiFi Not Connecting
- Check SSID and password
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Check WiFi signal strength

### HTTPS Connection Failed
- Verify backend URL is correct
- Check internet connectivity
- Ensure firewall allows HTTPS (port 443)
- Test backend: `curl https://smarthublite.vercel.app/api/devices`

### Serial Monitor Shows Garbage
- Set baud rate to 115200
- Enable "Both NL & CR" line ending

## Customization

### Add Your Own Sensors

```cpp
void loop() {
  // Read your sensor
  float temp = readTemperatureSensor();
  float humidity = readHumiditySensor();
  
  // Send to backend
  sendSensorData("my_sensor", temp, humidity);
  
  delay(5000);
}
```

### Add Matter Device Support

```cpp
void processMatterEvents() {
  // Poll Matter device
  JsonObject attributes = readMatterDevice("matter_device_01");
  
  // Forward to backend
  sendMatterDeviceUpdate("matter_device_01", attributes);
}
```

### Handle Custom Commands

```cpp
void handleCommand(const char* json) {
  // ... existing code ...
  
  if (strcmp(action, "my_action") == 0) {
    // Your custom action
    doSomething();
  }
}
```

## Pin Configuration

Default ESP32-S3 pins you can use:

- **LED_BUILTIN**: GPIO2 (built-in LED)
- **I2C**: SDA=GPIO21, SCL=GPIO22
- **SPI**: MOSI=GPIO23, MISO=GPIO19, SCK=GPIO18
- **UART**: TX=GPIO1, RX=GPIO3
- **ADC**: GPIO1-GPIO10 (analog input)

## Next Steps

1. Connect real sensors (DHT22, BME280, etc.)
2. Implement Matter SDK integration
3. Commission Matter devices via BLE
4. Add OTA (Over-The-Air) updates
5. Implement device provisioning UI
6. Add TLS certificate pinning for security

## Resources

- ESP32 Arduino Core: https://github.com/espressif/arduino-esp32
- ArduinoJson: https://arduinojson.org/
- Matter SDK: https://github.com/project-chip/connectedhomeip
- ESP32 Pinout: https://randomnerdtutorials.com/esp32-pinout-reference-gpios/
- Backend API: https://smarthublite.vercel.app
