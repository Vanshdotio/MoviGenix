const PlayerEvent = require("../models/PlayerEvent.model");
const SearchHistory = require("../models/SearchHistory.model");
const WatchHistory = require("../models/WatchHistory.model");
const Session = require("../models/Session.model");

// Track video player events (play, pause, buffer, seek, quality, audio)
const trackPlayerEvent = async (req, res) => {
  try {
    const { mediaId, type, title, eventType, details } = req.body;
    if (!mediaId || !type || !title || !eventType) {
      return res.status(400).json({ error: "Missing required tracking parameters." });
    }

    const event = await PlayerEvent.create({
      userId: req.user ? req.user._id : null,
      mediaId,
      type,
      title,
      eventType,
      details: details || {},
    });

    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error("Telemetry PlayerEvent Error:", error.message);
    res.status(500).json({ error: "Failed to log player event." });
  }
};

// Track user searches (query, result counts, success)
const trackSearch = async (req, res) => {
  try {
    const { query, resultsCount } = req.body;
    if (!query && query !== "") {
      return res.status(400).json({ error: "Query is required." });
    }

    const count = parseInt(resultsCount, 10) || 0;
    const success = count > 0;

    const record = await SearchHistory.create({
      userId: req.user ? req.user._id : null,
      query: String(query).trim(),
      resultsCount: count,
      success,
    });

    res.status(201).json({ success: true, record });
  } catch (error) {
    console.error("Telemetry Search Error:", error.message);
    res.status(500).json({ error: "Failed to log search event." });
  }
};

// Track watch progress (updates/creates user WatchHistory)
const trackWatchProgress = async (req, res) => {
  try {
    const { mediaId, type, title, posterPath, progress, duration } = req.body;
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required for progress tracking." });
    }
    if (!mediaId || !type || !title || progress === undefined || !duration) {
      return res.status(400).json({ error: "Missing required tracking parameters." });
    }

    const progression = parseFloat(progress) || 0;
    const dur = parseFloat(duration) || 1;
    const completionPercent = Math.min(Math.round((progression / dur) * 100), 100);
    const completed = completionPercent >= 90; // Considered completed at 90%+

    // Look for existing record
    let record = await WatchHistory.findOne({ userId: req.user._id, mediaId });

    if (record) {
      // If it was already completed and now they are playing from start (< 10%), increment rewatch
      let rewatchCount = record.rewatchCount || 0;
      if (record.completed && progression < 30) {
        rewatchCount += 1;
      }

      record.progress = progression;
      record.duration = dur;
      record.completionPercent = Math.max(record.completionPercent, completionPercent);
      if (completed) {
        record.completed = true;
      }
      record.rewatchCount = rewatchCount;
      record.watchedAt = new Date();
      await record.save();
    } else {
      record = await WatchHistory.create({
        userId: req.user._id,
        mediaId,
        type,
        title,
        posterPath: posterPath || "",
        progress: progression,
        duration: dur,
        completed,
        completionPercent,
        watchedAt: new Date(),
      });
    }

    res.status(200).json({ success: true, record });
  } catch (error) {
    console.error("Telemetry WatchProgress Error:", error.message);
    res.status(500).json({ error: "Failed to log progress." });
  }
};

// Heartbeat endpoint to track real-time user routing and presence
const trackHeartbeat = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(200).json({ success: true, guest: true });
    }

    const { route, activity } = req.body;
    const userAgent = req.headers["user-agent"] || "";
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";

    let device = "Desktop";
    let os = "Windows";

    if (/mobile/i.test(userAgent)) device = "Mobile";
    else if (/tablet/i.test(userAgent)) device = "Tablet";

    if (/windows/i.test(userAgent)) os = "Windows";
    else if (/macintosh|mac os x/i.test(userAgent)) os = "macOS";
    else if (/android/i.test(userAgent)) os = "Android";
    else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";
    else if (/linux/i.test(userAgent)) os = "Linux";

    // Country routing fallback
    const country = req.headers["x-vercel-ip-country"] || "India";

    // Session activity update
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    let session = await Session.findOne({
      userId: req.user._id,
      lastActive: { $gte: thirtyMinutesAgo }
    });

    if (session) {
      session.lastActive = new Date();
      if (route) session.route = route;
      if (activity) session.activity = activity;
      await session.save();
    } else {
      session = await Session.create({
        userId: req.user._id,
        device,
        os,
        country,
        ip,
        userAgent,
        route: route || "/",
        activity: activity || "Browsing",
      });
    }

    // Enriched hardware/location fields in user record
    let userUpdated = false;
    if (!req.user.device || req.user.device === "Unknown") {
      req.user.device = device;
      userUpdated = true;
    }
    if (!req.user.os || req.user.os === "Unknown") {
      req.user.os = os;
      userUpdated = true;
    }
    if (!req.user.country || req.user.country === "Unknown") {
      req.user.country = country;
      userUpdated = true;
    }
    if (userUpdated) {
      await req.user.save();
    }

    res.status(200).json({ success: true, session });
  } catch (error) {
    console.error("Telemetry Heartbeat Error:", error.message);
    res.status(500).json({ error: "Failed to process heartbeat." });
  }
};

module.exports = {
  trackPlayerEvent,
  trackSearch,
  trackWatchProgress,
  trackHeartbeat,
};
