# Gateway Connection Troubleshooting

## Issue: Gateway shows "Idle" or "Disconnected" on UI

### Symptoms
- Serial monitor shows: `[HTTP] POST /api/device/update → -1`
- Gateway status shows "idle" or "disconnected" on dashboard
- No heartbeat updates received

### Root Cause
HTTP POST requests from ESP32 to backend are failing (error code -1 = connection failed)

### Solutions

#### Option 1: Local Development (Recommended for Testing)

1. **Run backend locally:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Find your computer's local IP:**
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`

3. **Update gateway code** (`gateway-arduino/gateway-arduino.ino` line 23):
   ```cpp
   const char *API_BASE_URL = "http://192.168.1.100:3000";  // Use YOUR local IP
   ```

4. **Upload to ESP32** and monitor serial output

#### Option 2: Use HTTPS with Vercel (Production)

The updated code now includes SSL/TLS support:

1. **Verify changes applied:**
   - `WiFiClientSecure` included
   - `secureClient.setInsecure()` called for HTTPS URLs
   - Timeout increased to 15 seconds

2. **Upload updated code to ESP32**

3. **Monitor serial output** - should now show HTTP 200 responses

#### Option 3: Use ngrok for Remote Testing

1. **Start backend locally:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Expose with ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Update gateway with ngrok URL:**
   ```cpp
   const char *API_BASE_URL = "https://xxxx-xx-xx-xx-xx.ngrok-free.app";
   ```

### Verification Steps

1. **Check Serial Monitor Output:**
   ```
   [HTTP] POST /api/device/update → 200  ✅ Success
   [HTTP] POST /api/device/update → -1   ❌ Connection failed
   [HTTP] POST /api/device/update → 500  ⚠️  Server error
   ```

2. **Expected Heartbeat Flow:**
   - Every 30 seconds: `[Status] Sending: {"device_id":"gateway_01",...}`
   - Followed by: `[HTTP] POST /api/device/update → 200`

3. **Check Dashboard:**
   - Gateway status should show "Connected" (green)
   - Last heartbeat timestamp should update every 30 seconds

### Common Issues

#### WiFi Connection Problems
```
[WiFi] Lost — reconnecting...
```
**Fix:** Check WiFi credentials in code (lines 20-21)

#### HTTPS Certificate Errors
```
[HTTP] POST /api/device/update → ERROR: connection refused
```
**Fix:** Use `setInsecure()` (already added) or add proper CA certificate

#### Backend Not Running
```
[HTTP] POST /api/device/update → -1
```
**Fix:** Ensure backend is running and accessible from ESP32's network

#### MongoDB Connection Issues
Check backend logs for:
```
MongooseError: connect ECONNREFUSED
```
**Fix:** Update `MONGO_URI` in `backend/.env`

### Debug Commands

**Test backend from ESP32's network:**
```bash
curl -X POST http://YOUR_IP:3000/api/device/update \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test","data":{"status":"test"}}'
```

**Check if backend is accessible:**
```bash
curl http://YOUR_IP:3000/api/devices
```

### Next Steps After Fix

Once gateway connects successfully:
1. Gateway status will show "Connected" (green dot)
2. Heartbeat timestamp updates every 30 seconds
3. Device scans will populate the dashboard
4. Commands sent from UI will reach devices
