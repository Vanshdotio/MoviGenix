import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const telemetryClient = axios.create({
  baseURL: `${BACKEND_URL}/api/telemetry`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Attach Bearer token from localStorage to every request
telemetryClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Track player events (play, pause, buffer, quality, audio)
 */
export const trackPlayerEvent = async (mediaId, type, title, eventType, details = {}) => {
  try {
    await telemetryClient.post("/event", {
      mediaId: String(mediaId),
      type,
      title,
      eventType,
      details,
    });
  } catch (err) {
    console.warn("Failed to send player telemetry:", err.message);
  }
};

/**
 * Track searches
 */
export const trackSearch = async (query, resultsCount) => {
  try {
    await telemetryClient.post("/search", {
      query,
      resultsCount: parseInt(resultsCount, 10) || 0,
    });
  } catch (err) {
    console.warn("Failed to send search telemetry:", err.message);
  }
};

/**
 * Track watch progress (periodic checkpoints, saves history)
 */
export const trackWatchProgress = async (mediaId, type, title, posterPath, progress, duration) => {
  try {
    await telemetryClient.post("/progress", {
      mediaId: String(mediaId),
      type,
      title,
      posterPath: posterPath || "",
      progress: parseFloat(progress) || 0,
      duration: parseFloat(duration) || 0,
    });
  } catch (err) {
    console.warn("Failed to send progress telemetry:", err.message);
  }
};

/**
 * Send a periodic heartbeat representing user's current location/route and activity.
 */
export const trackHeartbeat = async (route, activity) => {
  try {
    await telemetryClient.post("/heartbeat", { route, activity });
  } catch (err) {
    console.debug("Failed to send heartbeat telemetry:", err.message);
  }
};

export default telemetryClient;
