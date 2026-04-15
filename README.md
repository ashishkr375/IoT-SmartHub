# IoT Matter + MQTT Gateway System

Production-ready IoT system with ESP32-S3 gateway, Next.js backend, and MongoDB storage.

## Architecture

```
ESP Devices (Matter/Custom)
         ↓
ESP32-S3 Gateway (Matter + MQTT Bridge)
         ↓
MQTT Broker (TLS optional)
         ↓
Next.js Backend (API + MQTT Worker)
         ↓
MongoDB
         ↓
Web Dashboard
```

## Components

### 1. ESP32-S3 Gateway

**Two Options Available:**

#### Option A: Arduino IDE (Recommended - Easier) 📁 `gateway-arduino/`

Single .ino file, easy to deploy with Arduino IDE.

**Quick Setup:**
1. Install Arduino IDE
2. Add ESP32 board support
3. Install libraries: PubSubClient, ArduinoJson
4. Update WiFi/MQTT config in sketch
5. Upload to ESP32-S3

See [gateway-arduino/README.md](gateway-arduino/README.md) for detailed instructions.

#### Option B: ESP-IDF (Advanced) 📁 `gateway/`

Matter-enabled gateway that bridges IoT devices to MQTT.

**Features:**
- WiFi connectivity
- MQTT client with command handling
- Matter/CHIP bridge support
- Generic JSON forwarding

**Prerequisites:**

Install ESP-IDF first:

Windows:
1. Download ESP-IDF installer: https://dl.espressif.com/dl/esp-idf/
2. Run `esp-idf-tools-setup-x.x.x.exe`
3. Follow installer prompts (install all components)
4. Open "ESP-IDF PowerShell" from Start Menu (not regular PowerShell)

Linux/macOS:
```bash
mkdir -p ~/esp
cd ~/esp
git clone --recursive https://github.com/espressif/esp-idf.git
cd esp-idf
./install.sh esp32s3
. ./export.sh
```

**Flash Instructions:**

Windows (use ESP-IDF PowerShell):
```powershell
cd gateway
idf.py set-target esp32s3
idf.py build
idf.py -p COM5 flash
idf.py monitor
```

Linux/macOS:
```bash
cd gateway
idf.py set-target esp32s3
idf.py build
idf.py -p /dev/ttyUSB0 flash
idf.py monitor
```

**Troubleshooting:**
- If flash fails, hold BOOT button and retry
- Update WiFi credentials in `main/wifi.cpp`
- Update MQTT broker URL in `main/mqtt.cpp`
- Windows: Must use "ESP-IDF PowerShell" not regular PowerShell

### 2. Next.js Backend (`backend/`)

API server with MQTT worker for device data ingestion.

**Setup:**

Windows PowerShell:
```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit .env with your MongoDB and MQTT URLs
```

Linux/macOS:
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB and MQTT URLs
```

**Run:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

Or deploy to Vercel:
```bash
vercel
```

### 3. Database

MongoDB for device data storage.

**Option A: MongoDB Atlas (Cloud - Recommended for Vercel)**

1. Create free account: https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Get connection string
4. Add to Vercel environment variables or `.env`

**Option B: Local MongoDB**

**Install:**
```bash
# Ubuntu/Debian
sudo apt install mongodb

# macOS
brew install mongodb-community

# Windows
# Download from mongodb.com
```

**Start:**
```bash
mongod --dbpath /path/to/data
```

### 4. MQTT Broker

**Install Mosquitto:**
```bash
# Ubuntu/Debian
sudo apt install mosquitto mosquitto-clients

# macOS
brew install mosquitto

# Windows
# Download from mosquitto.org
```

**Start:**
```bash
mosquitto -v
```

## HTTPS Setup

### Using Nginx

1. Install Nginx:
```bash
sudo apt install nginx
```

2. Get SSL certificate:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

3. Copy nginx config:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/iot
sudo ln -s /etc/nginx/sites-available/iot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## API Endpoints

### POST /api/device/update
Store device data from gateway.

**Request:**
```json
{
  "device_id": "sensor_01",
  "data": { "temperature": 22.5, "humidity": 45 }
}
```

### GET /api/devices
Fetch latest 100 device updates.

**Response:**
```json
[
  {
    "_id": "...",
    "device_id": "sensor_01",
    "data": { "temperature": 22.5, "humidity": 45 },
    "timestamp": "2026-04-15T10:30:00Z"
  }
]
```

### POST /api/device/command
Queue command for device.

**Request:**
```json
{
  "device_id": "sensor_01",
  "command": { "action": "toggle" }
}
```

### GET /api/device/command?device_id=gateway_01
Gateway polls for pending commands.

**Response:**
```json
[
  {
    "_id": "...",
    "device_id": "sensor_01",
    "command": { "action": "toggle" },
    "status": "delivered"
  }
]
```

## MQTT Topics

- `device/update` - Device data updates (ESP → Backend)
- `device/command` - Device commands (Backend → ESP)

## Development Workflow

1. Start MongoDB (local or use MongoDB Atlas)
2. Start Next.js: `npm run dev`
3. Update ESP32 config with your Vercel URL
4. Flash ESP32-S3 gateway
5. Open http://localhost:3000 (or your Vercel URL)

## Next Steps

- [ ] Implement WebSocket for live updates
- [ ] Add device grouping and filtering
- [ ] Create rule engine for automation
- [ ] Add OTA firmware updates
- [ ] Implement user authentication
- [ ] Add device provisioning UI
- [ ] Create mobile app

## Quick Start

**First time setup?** See [SETUP.md](SETUP.md) for detailed installation instructions.

**Already have prerequisites installed?**

1. Configure ESP32 WiFi in `gateway-arduino/gateway-arduino.ino`
2. Update API_BASE_URL to your Vercel URL: `https://smarthublite.vercel.app`
3. Setup backend: `cd backend && npm install && cp .env.example .env`
4. Configure MongoDB URI in `.env` (local or Atlas)
5. Deploy to Vercel or run locally: `npm run dev`
6. Flash ESP32-S3 using Arduino IDE
7. Open your dashboard URL

## Configuration

### ESP32-S3
Edit `gateway-arduino/gateway-arduino.ino`:
```cpp
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_BASE_URL = "https://smarthublite.vercel.app";
```

### Backend
Edit `backend/.env`:
```
MONGO_URI=mongodb://localhost:27017/iot
# Or use MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/iot
```

For Vercel deployment, add environment variable in Vercel dashboard.

## License

MIT
