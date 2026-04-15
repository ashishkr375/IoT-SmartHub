# Complete Setup Guide

## Step-by-Step Installation

### 1. Setup ESP32-S3 Gateway

**Choose one option:**

#### Option A: Arduino IDE (Recommended - Much Easier!)

1. **Install Arduino IDE**
   - Download: https://www.arduino.cc/en/software
   - Install and open

2. **Add ESP32 Board Support**
   - File → Preferences
   - Add to "Additional Board Manager URLs":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Tools → Board → Boards Manager
   - Search "esp32" and install "esp32 by Espressif Systems"

3. **Install Libraries**
   - Sketch → Include Library → Manage Libraries
   - Install: **PubSubClient** by Nick O'Leary
   - Install: **ArduinoJson** by Benoit Blanchon

4. **Configure and Upload**
   - Open `gateway-arduino/gateway-arduino.ino`
   - Update WiFi SSID, password, and MQTT server IP
   - Tools → Board → esp32 → ESP32S3 Dev Module
   - Tools → Port → Select your COM port
   - Click Upload

See [gateway-arduino/README.md](gateway-arduino/README.md) for complete guide.

#### Option B: ESP-IDF (Advanced Users Only)

#### Windows

1. Download ESP-IDF Windows Installer:
   - Visit: https://dl.espressif.com/dl/esp-idf/
   - Download latest `esp-idf-tools-setup-x.x.x.exe`

2. Run the installer:
   - Install all components (Python, Git, ESP-IDF)
   - Choose installation directory (e.g., `C:\esp-idf`)
   - Wait for installation to complete (may take 10-15 minutes)

3. Verify installation:
   - Open "ESP-IDF PowerShell" from Start Menu
   - Run: `idf.py --version`
   - Should show ESP-IDF version

#### Linux (Ubuntu/Debian)

```bash
# Install prerequisites
sudo apt-get update
sudo apt-get install git wget flex bison gperf python3 python3-pip python3-venv cmake ninja-build ccache libffi-dev libssl-dev dfu-util libusb-1.0-0

# Clone ESP-IDF
mkdir -p ~/esp
cd ~/esp
git clone --recursive https://github.com/espressif/esp-idf.git

# Install ESP-IDF
cd esp-idf
./install.sh esp32s3

# Setup environment (add to ~/.bashrc for permanent)
. ./export.sh
```

#### macOS

```bash
# Install prerequisites
brew install cmake ninja dfu-util

# Clone ESP-IDF
mkdir -p ~/esp
cd ~/esp
git clone --recursive https://github.com/espressif/esp-idf.git

# Install ESP-IDF
cd esp-idf
./install.sh esp32s3

# Setup environment (add to ~/.zshrc for permanent)
. ./export.sh
```

### 2. Install MongoDB

#### Windows

1. Download MongoDB Community Server:
   - Visit: https://www.mongodb.com/try/download/community
   - Download Windows MSI installer

2. Run installer:
   - Choose "Complete" installation
   - Install MongoDB as a Service
   - Install MongoDB Compass (optional GUI)

3. Verify:
   ```powershell
   mongod --version
   ```

#### Linux (Ubuntu/Debian)

```bash
# Import MongoDB public key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add MongoDB repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### macOS

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### 3. Install MQTT Broker (Mosquitto)

#### Windows

1. Download Mosquitto:
   - Visit: https://mosquitto.org/download/
   - Download Windows installer

2. Install and start:
   ```powershell
   # After installation, start service
   net start mosquitto
   ```

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

#### macOS

```bash
brew install mosquitto
brew services start mosquitto
```

### 4. Install Node.js

#### Windows

1. Download Node.js LTS:
   - Visit: https://nodejs.org/
   - Download Windows installer
   - Run installer

#### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### macOS

```bash
brew install node
```

### 5. Setup Backend

```powershell
# Windows PowerShell or bash
cd backend
npm install
```

Copy and configure environment:
```powershell
# Windows
Copy-Item .env.example .env

# Linux/macOS
cp .env.example .env
```

Edit `.env`:
```
MONGO_URI=mongodb://localhost:27017/iot
MQTT_URL=mqtt://localhost:1883
```

### 6. Configure ESP32-S3 Gateway

Edit `gateway/main/wifi.cpp`:
```cpp
strcpy((char*)wifi_config.sta.ssid, "YOUR_WIFI_NAME");
strcpy((char*)wifi_config.sta.password, "YOUR_WIFI_PASSWORD");
```

Edit `gateway/main/mqtt.cpp`:
```cpp
config.broker.address.uri = "mqtt://YOUR_SERVER_IP";  // e.g., "mqtt://192.168.1.100"
```

### 7. Build and Flash ESP32-S3

**Windows (ESP-IDF PowerShell):**
```powershell
cd gateway
idf.py set-target esp32s3
idf.py build
idf.py -p COM5 flash
idf.py monitor
```

**Linux/macOS:**
```bash
cd gateway
idf.py set-target esp32s3
idf.py build
idf.py -p /dev/ttyUSB0 flash  # or /dev/ttyACM0, check with: ls /dev/tty*
idf.py monitor
```

### 8. Start Backend Services

**Terminal 1 - MQTT Worker:**
```powershell
cd backend
npm run mqtt
```

**Terminal 2 - Next.js Server:**
```powershell
cd backend
npm run dev
```

### 9. Access Dashboard

Open browser: http://localhost:3000

## Troubleshooting

### ESP32 Flash Issues

1. **"idf.py not found"**
   - Windows: Use "ESP-IDF PowerShell" not regular PowerShell
   - Linux/macOS: Run `. ~/esp/esp-idf/export.sh` first

2. **"Failed to connect to ESP32"**
   - Hold BOOT button while flashing
   - Check COM port: `idf.py -p list` (Windows) or `ls /dev/tty*` (Linux/macOS)
   - Install USB drivers: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers

3. **Build errors**
   - Run: `idf.py fullclean`
   - Delete `build/` folder
   - Rebuild: `idf.py build`

### MongoDB Issues

1. **"Connection refused"**
   - Check if running: `mongod --version`
   - Windows: Check Services for "MongoDB"
   - Linux: `sudo systemctl status mongod`

2. **"Permission denied"**
   - Linux: `sudo chown -R mongodb:mongodb /var/lib/mongodb`

### MQTT Issues

1. **"Connection refused"**
   - Check if running: `mosquitto -v`
   - Test: `mosquitto_sub -t test`

2. **"Port already in use"**
   - Kill existing: `sudo pkill mosquitto`
   - Restart: `mosquitto -v`

### Backend Issues

1. **"Module not found"**
   - Delete `node_modules/` and `package-lock.json`
   - Run: `npm install`

2. **"Port 3000 already in use"**
   - Change port: `npm run dev -- -p 3001`

## Next Steps

Once everything is running:

1. Monitor ESP32 logs: `idf.py monitor`
2. Check MQTT messages: `mosquitto_sub -t "device/#" -v`
3. View MongoDB data: `mongosh` then `use iot` then `db.devices.find()`
4. Access dashboard: http://localhost:3000

## Production Deployment

See README.md for:
- HTTPS setup with Nginx
- SSL/TLS configuration
- Domain setup
- Firewall rules
