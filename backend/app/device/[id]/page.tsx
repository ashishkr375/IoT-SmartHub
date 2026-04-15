"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import "./device-detail.css";

interface DeviceHistory {
  _id: string;
  device_id: string;
  data: any;
  timestamp: string;
}

export default function DeviceDetailPage() {
  const params = useParams();
  const deviceId = params.id as string;
  
  const [history, setHistory] = useState<DeviceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/device/history?device_id=${deviceId}&page=${page}&limit=${itemsPerPage}`);
      const data = await res.json();
      
      if (data.length < itemsPerPage) {
        setHasMore(false);
      }
      
      setHistory(prev => page === 1 ? data : [...prev, ...data]);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
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

  if (loading && page === 1) {
    return (
      <div className="loading-container">
        <div className="pulse"></div>
        <p>Loading device history...</p>
      </div>
    );
  }

  const latestData = history[0];

  return (
    <div className="device-detail-page">
      <div className="grid-bg"></div>
      
      <header className="detail-header">
        <div className="header-content">
          <a href="/" className="back-btn">← Back to Dashboard</a>
          <h1 className="device-title">{deviceId}</h1>
        </div>
      </header>

      <main className="detail-main">
        {latestData && (
          <section className="current-state">
            <h2 className="section-title">Current State</h2>
            <div className="state-card">
              <div className="state-grid">
                {Object.entries(latestData.data).map(([key, value]) => (
                  <div key={key} className="state-item">
                    <span className="state-key">{key}</span>
                    <span className="state-value">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
              <div className="state-footer">
                <span className="state-time">
                  Last updated: {new Date(latestData.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </section>
        )}

        <section className="history-section">
          <h2 className="section-title">History</h2>
          <div className="history-timeline">
            {history.map((entry, index) => (
              <div key={entry._id} className="history-entry" style={{ animationDelay: `${index * 0.05}s` }}>
                <div className="entry-time">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div className="entry-data">
                  {Object.entries(entry.data).map(([key, value]) => (
                    <div key={key} className="entry-row">
                      <span className="entry-key">{key}</span>
                      <span className="entry-value">{formatValue(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button 
              className="load-more-btn"
              onClick={() => setPage(p => p + 1)}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          )}

          {!hasMore && history.length > 0 && (
            <p className="end-message">No more history</p>
          )}
        </section>
      </main>
    </div>
  );
}
