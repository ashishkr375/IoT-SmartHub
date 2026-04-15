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
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    } finally {
      setLoading(false);
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
          <h1 className="title">
            <span className="title-main">IoT Hub</span>
            <span className="title-sub">Device Network Monitor</span>
          </h1>
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
