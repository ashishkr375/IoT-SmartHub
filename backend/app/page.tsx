"use client";

import { useEffect, useState } from "react";
import "./styles.css";

interface Device {
  _id: string;
  device_id: string;
  data: any;
  timestamp: string;
}

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<"connected" | "disconnected" | "idle">("disconnected");
  const [lastGatewayHeartbeat, setLastGatewayHeartbeat] = useState<Date | null>(null);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/devices");
      const data = await res.json();
      setDevices(data);
      
      // Check for gateway heartbeat
      checkGatewayStatus(data);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkGatewayStatus = (deviceList: Device[]) => {
    // Look for gateway device (device_id starts with "gateway")
    const gateway = deviceList.find(d => d.device_id.toLowerCase().includes("gateway"));
    
    if (gateway) {
      const lastSeen = new Date(gateway.timestamp);
      const age = Date.now() - lastSeen.getTime();
      
      setLastGatewayHeartbeat(lastSeen);
      
      if (age < 60000) {
        setGatewayStatus("connected");
      } else if (age < 300000) {
        setGatewayStatus("idle");
      } else {
        setGatewayStatus("disconnected");
      }
    } else {
      setGatewayStatus("disconnected");
      setLastGatewayHeartbeat(null);
    }
  };

  const sendCommand = async (deviceId: string, action: string = "toggle") => {
    try {
      await fetch("/api/device/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          command: { action }
        })
      });
      setSelectedDevice(deviceId);
      setTimeout(() => setSelectedDevice(null), 1000);
    } catch (error) {
      console.error("Failed to send command:", error);
    }
  };

  const getDeviceStatus = (device: Device) => {
    const age = Date.now() - new Date(device.timestamp).getTime();
    if (age < 60000) return "online";
    if (age < 300000) return "idle";
    return "offline";
  };

  const formatValue = (value: any): string => {
    if (typeof value === "number") {
      return value.toFixed(2);
    }
    if (typeof value === "boolean") {
      return value ? "ON" : "OFF";
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="pulse"></div>
        <p>Initializing system...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="grid-bg"></div>
      
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="title">
              <span className="title-main">IoT Hub</span>
              <span className="title-sub">Device Network Monitor</span>
            </h1>
            <div className={`gateway-status ${gatewayStatus}`}>
              <span className="gateway-dot"></span>
              <span className="gateway-label">
                Gateway {gatewayStatus === "connected" ? "Connected" : gatewayStatus === "idle" ? "Idle" : "Disconnected"}
              </span>
              {lastGatewayHeartbeat && (
                <span className="gateway-time">
                  {new Date(lastGatewayHeartbeat).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div className="stats">
            <div className="stat">
              <span className="stat-value">{devices.length}</span>
              <span className="stat-label">Devices</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {devices.filter(d => getDeviceStatus(d) === "online").length}
              </span>
              <span className="stat-label">Online</span>
            </div>
            <a href="/docs" className="docs-link">
              📚 Developer Docs
            </a>
          </div>
        </div>
      </header>

      <main className="main">
        {devices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <h2>No devices detected</h2>
            <p>Waiting for device connections...</p>
          </div>
        ) : (
          <div className="device-grid">
            {devices.map((device, index) => {
              const status = getDeviceStatus(device);
              const isSelected = selectedDevice === device.device_id;
              
              return (
                <div
                  key={device._id}
                  className={`device-card ${status} ${isSelected ? "selected" : ""}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="device-header">
                    <div className="device-info">
                      <h3 className="device-name">{device.device_id}</h3>
                      <span className={`status-badge ${status}`}>
                        <span className="status-dot"></span>
                        {status}
                      </span>
                    </div>
                    <div className="device-actions">
                      <button
                        className="action-btn"
                        onClick={() => sendCommand(device.device_id, "toggle")}
                        title="Toggle"
                      >
                        ⚡
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => sendCommand(device.device_id, "status")}
                        title="Refresh"
                      >
                        ↻
                      </button>
                    </div>
                  </div>

                  <div className="device-data">
                    {Object.entries(device.data).map(([key, value]) => (
                      <div key={key} className="data-row">
                        <span className="data-key">{key}</span>
                        <span className="data-value">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="device-footer">
                    <span className="timestamp">
                      {new Date(device.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
