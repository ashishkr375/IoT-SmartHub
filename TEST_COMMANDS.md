# Gateway Testing Commands

## Test from Browser Console

Open your browser console (F12) on `https://smarthublite.vercel.app` and run:

### 1. Test Device Update Endpoint (What Gateway Sends)
```javascript
fetch('/api/device/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    device_id: "gateway_01",
    data: {
      status: "test_from_browser",
      uptime: 123,
      rssi: -45,
      ip: "192.168.1.100",
      free_heap: 150000,
      devices: 0
    }
  })
})
.then(r => r.json())
.then(d => console.log('✅ Success:', d))
.catch(e => console.error('❌ Error:', e));
```

### 2. Check if Gateway Heartbeat is Being Received
```javascript
fetch('/api/devices')
  .then(r => r.json())
  .then(devices => {
    const gateway = devices.find(d => d.device_id.includes('gateway'));
    if (gateway) {
      const age = Date.now() - new Date(gateway.timestamp).getTime();
      console.log('Gateway found:', gateway.device_id);
      console.log('Last seen:', new Date(gateway.timestamp).toLocaleString());
      console.log('Age:', Math.floor(age/1000), 'seconds ago');
      console.log('Status:', age < 60000 ? '🟢 Online' : age < 300000 ? '🟡 Idle' : '🔴 Offline');
    } else {
      console.log('❌ No gateway found in database');
    }
  });
```

### 3. Monitor Real-time Updates (Run this and watch)
```javascript
let lastTimestamp = null;
setInterval(() => {
  fetch('/api/devices')
    .then(r => r.json())
    .then(devices => {
      const gateway = devices.find(d => d.device_id.includes('gateway'));
      if (gateway) {
        if (gateway.timestamp !== lastTimestamp) {
          console.log('🔄 NEW UPDATE:', new Date(gateway.timestamp).toLocaleTimeString(), gateway.data);
          lastTimestamp = gateway.timestamp;
        }
      }
    });
}, 5000); // Check every 5 seconds
```

## Test from Command Line (PowerShell/CMD)

### Test POST to Vercel (Same as ESP32 sends)
```powershell
$body = @{
    device_id = "test_gateway"
    data = @{
        status = "test"
        uptime = 100
    }
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://smarthublite.vercel.app/api/device/update" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Test with curl (if installed)
```bash
curl -X POST https://smarthublite.vercel.app/api/device/update \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test_gateway","data":{"status":"test","uptime":100}}'
```

## Debugging ESP32 HTTPS Issues

### Common Causes When HTTPS Suddenly Stops Working:

1. **Vercel Changed TLS Configuration**
   - Vercel may have updated their TLS version or cipher suites
   - ESP32's TLS library might not support the new configuration

2. **DNS Resolution Issues**
   - Try adding this to your code before `http.begin()`:
   ```cpp
   IPAddress serverIP;
   if (WiFi.hostByName("smarthublite.vercel.app", serverIP)) {
     Serial.printf("[DNS] Resolved to: %s\n", serverIP.toString().c_str());
   } else {
     Serial.println("[DNS] ❌ Failed to resolve hostname");
   }
   ```

3. **Memory Issues**
   - HTTPS uses more memory than HTTP
   - Check free heap: `ESP.getFreeHeap()`
   - If < 50KB, you might have memory fragmentation

4. **Time Sync Issues**
   - HTTPS requires accurate time for certificate validation
   - Add NTP sync:
   ```cpp
   configTime(0, 0, "pool.ntp.org");
   ```

## Quick Fix: Use HTTP Proxy

If HTTPS keeps failing, you can run a local proxy:

### Option 1: Use ngrok (Easiest)
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Expose with ngrok
ngrok http 3000
```
Then update ESP32 code with the ngrok HTTPS URL.

### Option 2: Local HTTP (Most Reliable)
```bash
cd backend
npm run dev
```
Update ESP32 code:
```cpp
const char *API_BASE_URL = "http://YOUR_COMPUTER_IP:3000";
```

Find your IP:
- Windows: `ipconfig` (look for IPv4 Address)
- Mac/Linux: `ifconfig` or `ip addr`

## Test ESP32 Network Connectivity

Add this test function to your ESP32 code:

```cpp
void testConnectivity() {
  Serial.println("\n[TEST] Starting connectivity test...");
  
  // Test 1: DNS Resolution
  IPAddress ip;
  if (WiFi.hostByName("smarthublite.vercel.app", ip)) {
    Serial.printf("[TEST] ✅ DNS: %s\n", ip.toString().c_str());
  } else {
    Serial.println("[TEST] ❌ DNS failed");
    return;
  }
  
  // Test 2: TCP Connection
  WiFiClient client;
  if (client.connect("smarthublite.vercel.app", 443)) {
    Serial.println("[TEST] ✅ TCP connection to port 443");
    client.stop();
  } else {
    Serial.println("[TEST] ❌ TCP connection failed");
    return;
  }
  
  // Test 3: HTTPS GET
  HTTPClient http;
  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  http.begin(secureClient, "https://smarthublite.vercel.app/api/devices");
  int code = http.GET();
  Serial.printf("[TEST] HTTPS GET: %d\n", code);
  http.end();
}
```

Call `testConnectivity()` in `setup()` after WiFi connects.
