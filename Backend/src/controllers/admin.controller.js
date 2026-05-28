const User = require("../models/User.model");
const Session = require("../models/Session.model");
const WatchHistory = require("../models/WatchHistory.model");
const SearchHistory = require("../models/SearchHistory.model");
const PlayerEvent = require("../models/PlayerEvent.model");
const { seedAnalyticsData } = require("../db/seedAnalytics");

// Background simulator variables
let trafficIntervalId = null;
let liveSimulatedUsers = [];

// Helper: Generate random live users activity
const generateLiveUsers = async () => {
  try {
    const users = await User.find({ role: "user" }).limit(10);
    if (users.length === 0) return [];

    const routes = ["/", "/tv", "/movies", "/anime", "/cartoon", "/search", "/profile"];
    const actions = ["browsing", "searching", "watching"];
    const watchTitles = ["Interstellar", "The Family Man", "Attack on Titan", "Ben 10", "Inception"];
    
    return users.map((user, index) => {
      const action = actions[Math.floor(Math.random() * actions.length)];
      let currentActivity = "Browsing home page";
      let currentRoute = routes[Math.floor(Math.random() * routes.length)];

      if (action === "searching") {
        currentActivity = `Searching for "${watchTitles[Math.floor(Math.random() * watchTitles.length)]}"`;
        currentRoute = "/search";
      } else if (action === "watching") {
        const title = watchTitles[Math.floor(Math.random() * watchTitles.length)];
        currentActivity = `Watching ${title}`;
        currentRoute = `/movie/${100 + index}`;
      }

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        device: user.device || "Mobile",
        os: user.os || "Android",
        country: user.country || "India",
        route: currentRoute,
        activity: currentActivity,
        updatedAt: new Date()
      };
    });
  } catch (err) {
    return [];
  }
};

// 1. Get Dashboard Home Overview Stats
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    
    // Active today: logged in or active today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySessions = await Session.distinct("userId", { loginTime: { $gte: startOfToday } });
    const todayActiveUsers = todaySessions.length;

    // Online users: active in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineSessions = await Session.distinct("userId", { lastActive: { $gte: fiveMinutesAgo } });
    const onlineCount = onlineSessions.length;

    // Signups
    const newSignups = await User.countDocuments({ createdAt: { $gte: startOfToday } });
    const googleUsers = await User.countDocuments({ googleId: { $exists: true, $ne: null } });
    const emailUsers = totalUsers - googleUsers;

    // Watch statistics
    const watchHistory = await WatchHistory.find({});
    const totalViews = watchHistory.length;
    
    let totalWatchTimeSeconds = 0;
    watchHistory.forEach(item => {
      totalWatchTimeSeconds += (item.progress || 0);
    });
    const totalWatchTimeHours = Math.round(totalWatchTimeSeconds / 3600);

    // Average session duration in minutes (from sessions)
    const sessions = await Session.find({});
    let totalSessionDuration = 0;
    let validSessionCount = 0;
    sessions.forEach(sess => {
      if (sess.lastActive && sess.loginTime) {
        const diff = (sess.lastActive - sess.loginTime) / (60 * 1000); // minutes
        if (diff > 0) {
          totalSessionDuration += diff;
          validSessionCount++;
        }
      }
    });
    const avgSessionDuration = validSessionCount > 0 ? Math.round(totalSessionDuration / validSessionCount) : 0;

    // 7 Days Sparkline Data
    const sparklines = {
      signups: [],
      views: [],
      activeUsers: []
    };
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0,0,0,0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const signupCount = await User.countDocuments({ createdAt: { $gte: dayStart, $lt: dayEnd } });
      const viewCount = await WatchHistory.countDocuments({ watchedAt: { $gte: dayStart, $lt: dayEnd } });
      const daySessions = await Session.distinct("userId", { loginTime: { $gte: dayStart, $lt: dayEnd } });
      
      sparklines.signups.push(signupCount);
      sparklines.views.push(viewCount);
      sparklines.activeUsers.push(daySessions.length);
    }

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        todayActiveUsers,
        onlineUsers: onlineCount,
        newSignups,
        googleUsers,
        emailUsers,
        totalWatchTimeHours,
        totalViews,
        avgSessionDuration,
        sparklines
      }
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error.message);
    res.status(500).json({ error: "Failed to load dashboard statistics." });
  }
};

// 2. Get Users list with search and filters
const getUsersList = async (req, res) => {
  try {
    const { search, loginMethod, device, country, page = 1, limit = 10 } = req.query;
    
    const query = {};

    // Search filter (Name or Email)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    // Login Method filter
    if (loginMethod === "google") {
      query.googleId = { $exists: true, $ne: null };
    } else if (loginMethod === "email") {
      query.googleId = { $exists: false };
    }

    // Device filter
    if (device) {
      query.device = device;
    }

    // Country filter
    if (country) {
      query.country = country;
    }

    const currentPage = parseInt(page, 10);
    const limitVal = parseInt(limit, 10);
    
    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * limitVal)
      .limit(limitVal);

    // Retrieve last active time for each user from sessions
    const enrichedUsers = await Promise.all(users.map(async (u) => {
      const lastSession = await Session.findOne({ userId: u._id }).sort({ lastActive: -1 });
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isPremium: u.isPremium,
        device: u.device || "Desktop",
        os: u.os || "Windows",
        country: u.country || "India",
        loginMethod: u.googleId ? "Google" : "Email",
        createdAt: u.createdAt,
        lastActive: lastSession ? lastSession.lastActive : u.updatedAt
      };
    }));

    res.status(200).json({
      success: true,
      users: enrichedUsers,
      pagination: {
        totalUsers,
        totalPages: Math.ceil(totalUsers / limitVal),
        currentPage,
        limit: limitVal
      }
    });
  } catch (error) {
    console.error("Admin Users List Error:", error.message);
    res.status(500).json({ error: "Failed to load user list." });
  }
};

// 3. User Growth & Auth Trends
const getAnalyticsGrowth = async (req, res) => {
  try {
    const { filter = "month" } = req.query;
    let daysToFetch = 30;
    
    if (filter === "week") daysToFetch = 7;
    else if (filter === "year") daysToFetch = 365;

    const signupTrends = [];
    const authTrends = {
      google: [],
      email: []
    };

    const now = new Date();
    
    // Aggregate daily data
    for (let i = daysToFetch - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      
      const daySignups = await User.countDocuments({ createdAt: { $gte: startOfDay, $lt: endOfDay } });
      const dayGoogleSignups = await User.countDocuments({ 
        createdAt: { $gte: startOfDay, $lt: endOfDay },
        googleId: { $exists: true, $ne: null }
      });
      const dayEmailSignups = daySignups - dayGoogleSignups;

      signupTrends.push({ label, count: daySignups });
      authTrends.google.push({ label, count: dayGoogleSignups });
      authTrends.email.push({ label, count: dayEmailSignups });
    }

    // Breakdown metrics
    const totalUsers = await User.countDocuments();
    const googleUsers = await User.countDocuments({ googleId: { $exists: true, $ne: null } });
    const emailUsers = totalUsers - googleUsers;
    
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    const activeSessionsToday = await Session.countDocuments({
      loginTime: { $gte: startOfToday }
    });

    const videoPlaysToday = await WatchHistory.countDocuments({
      watchedAt: { $gte: startOfToday }
    });

    const searchesToday = await SearchHistory.countDocuments({
      timestamp: { $gte: startOfToday }
    });

    res.status(200).json({
      success: true,
      growth: signupTrends,
      authSplit: {
        google: googleUsers,
        email: emailUsers
      },
      authSplitTrends: {
        google: authTrends.google,
        email: authTrends.email
      },
      conversion: {
        activeSessionsToday,
        videoPlaysToday,
        searchesToday
      }
    });
  } catch (error) {
    console.error("Admin Growth Analytics Error:", error.message);
    res.status(500).json({ error: "Failed to load growth analytics." });
  }
};

// 4. Content Analytics
const getContentInsights = async (req, res) => {
  try {
    // Helper function to aggregate top lists by type
    const getTopList = async (mediaType, limit = 5) => {
      const aggregation = await WatchHistory.aggregate([
        { $match: { type: mediaType } },
        { $group: {
            _id: "$mediaId",
            title: { $first: "$title" },
            posterPath: { $first: "$posterPath" },
            views: { $sum: 1 },
            totalWatchTime: { $sum: "$progress" },
            avgCompletion: { $avg: "$completionPercent" },
            completions: { $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] } }
        }},
        { $sort: { views: -1 } },
        { $limit: limit }
      ]);

      return aggregation.map(item => ({
        id: item._id,
        title: item.title,
        posterPath: item.posterPath,
        views: item.views,
        watchTimeHours: Math.round(item.totalWatchTime / 3600),
        completionPercent: Math.round(item.avgCompletion || 0),
        completions: item.completions
      }));
    };

    const topMovies = await getTopList("movie");
    const topTV = await getTopList("tv");
    const topAnime = await getTopList("anime");
    const topCartoon = await getTopList("cartoon");

    // Top 10 Overall Content Insights
    const topOverall = await WatchHistory.aggregate([
      { $group: {
          _id: "$mediaId",
          title: { $first: "$title" },
          type: { $first: "$type" },
          posterPath: { $first: "$posterPath" },
          views: { $sum: 1 },
          watchTime: { $sum: "$progress" },
          avgCompletion: { $avg: "$completionPercent" },
          rewatches: { $sum: "$rewatchCount" }
      }},
      { $sort: { views: -1 } },
      { $limit: 10 }
    ]);

    const overallInsights = topOverall.map(item => {
      // simulate drop rate: inversely related to completion
      const completion = Math.round(item.avgCompletion || 0);
      const dropRate = 100 - completion;
      
      return {
        id: item._id,
        title: item.title,
        type: item.type,
        posterPath: item.posterPath,
        views: item.views,
        watchTimeHours: Math.round(item.watchTime / 3600),
        completionPercent: completion,
        dropRatePercent: dropRate,
        rewatchCount: item.rewatches
      };
    });

    res.status(200).json({
      success: true,
      topMovies,
      topTV,
      topAnime,
      topCartoon,
      overallInsights
    });
  } catch (error) {
    console.error("Content Insights Error:", error.message);
    res.status(500).json({ error: "Failed to load content insights." });
  }
};

// 5. Player, Searches, Device & Heatmap Analytics
const getPlayerWatch = async (req, res) => {
  try {
    // Player Events
    const playCount = await PlayerEvent.countDocuments({ eventType: "play" });
    const pauseCount = await PlayerEvent.countDocuments({ eventType: "pause" });
    const bufferCount = await PlayerEvent.countDocuments({ eventType: "buffer" });
    const qualityCount = await PlayerEvent.countDocuments({ eventType: "quality_change" });

    const watchHistory = await WatchHistory.find({});
    let totalWatchTime = 0;
    watchHistory.forEach(item => {
      totalWatchTime += (item.progress || 0);
    });
    const avgWatchTimeMinutes = watchHistory.length > 0 ? Math.round((totalWatchTime / watchHistory.length) / 60) : 0;

    // Search Logs
    const searches = await SearchHistory.find({}).sort({ timestamp: -1 }).limit(10);
    const totalSearches = await SearchHistory.countDocuments();
    const successfulSearches = await SearchHistory.countDocuments({ success: true });
    
    // Top 5 searched titles
    const topSearched = await SearchHistory.aggregate([
      { $group: { _id: "$query", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Device breakdown
    const devicesList = await User.aggregate([
      { $group: { _id: "$device", count: { $sum: 1 } } }
    ]);
    const devicesSplit = { Desktop: 0, Mobile: 0, Tablet: 0 };
    devicesList.forEach(d => {
      if (d._id in devicesSplit) devicesSplit[d._id] = d.count;
    });

    // OS Breakdown
    const osList = await User.aggregate([
      { $group: { _id: "$os", count: { $sum: 1 } } }
    ]);
    const osSplit = {};
    osList.forEach(o => {
      if (o._id) osSplit[o._id] = o.count;
    });

    // Heatmap data: activity by hours (Morning, Afternoon, Evening, Night)
    const heatmap = {
      morning: 0,   // 6 AM - 12 PM
      afternoon: 0, // 12 PM - 6 PM
      evening: 0,   // 6 PM - 12 AM
      night: 0      // 12 AM - 6 AM
    };

    const watchRecords = await WatchHistory.find({}).select("watchedAt");
    watchRecords.forEach(rec => {
      if (rec.watchedAt) {
        const hour = new Date(rec.watchedAt).getHours();
        if (hour >= 6 && hour < 12) heatmap.morning++;
        else if (hour >= 12 && hour < 18) heatmap.afternoon++;
        else if (hour >= 18 && hour < 24) heatmap.evening++;
        else heatmap.night++;
      }
    });

    // Continue Watching Stats: resumed vs dropped
    const usersCountWithContinue = await User.countDocuments({ 
      $or: [
        { "continueWatching.movie.0": { $exists: true } },
        { "continueWatching.tv.0": { $exists: true } },
        { "continueWatching.anime.0": { $exists: true } },
        { "continueWatching.cartoon.0": { $exists: true } }
      ]
    });

    // Average resume time: average of progress of active watch sessions
    const activeWatchHistory = await WatchHistory.find({ completed: false });
    let totalProgressSeconds = 0;
    activeWatchHistory.forEach(item => {
      totalProgressSeconds += (item.progress || 0);
    });
    const avgResumeTimeMinutes = activeWatchHistory.length > 0
      ? Math.round((totalProgressSeconds / activeWatchHistory.length) / 60)
      : 0;

    res.status(200).json({
      success: true,
      player: {
        playCount,
        pauseCount,
        bufferCount,
        qualityCount,
        avgWatchTimeMinutes
      },
      searches: {
        total: totalSearches,
        successPercent: totalSearches > 0 ? Math.round((successfulSearches / totalSearches) * 100) : 100,
        recent: searches,
        top: topSearched.map(item => ({ query: item._id, count: item.count }))
      },
      devices: devicesSplit,
      os: osSplit,
      heatmap,
      continueWatching: {
        resumedUsers: usersCountWithContinue,
        avgResumeTimeMinutes
      }
    });
  } catch (error) {
    console.error("Player analytics error:", error.message);
    res.status(500).json({ error: "Failed to load player analytics." });
  }
};

// 6. Real-time Live Users Endpoint
const getLiveActivity = async (req, res) => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    // Fetch real sessions active in the last 15 minutes
    const activeSessions = await Session.find({
      lastActive: { $gte: fifteenMinutesAgo }
    }).populate("userId", "name email device os country");

    const liveUsers = activeSessions.map(session => {
      const u = session.userId || {};
      return {
        id: session._id,
        name: u.name || "Guest User",
        email: u.email || "guest@movigenix.com",
        device: session.device || u.device || "Unknown",
        os: session.os || u.os || "Unknown",
        country: session.country || u.country || "Unknown",
        route: session.route || "/",
        activity: session.activity || "Browsing",
        updatedAt: session.lastActive
      };
    });

    res.status(200).json({
      success: true,
      simulationActive: false,
      liveUsers
    });
  } catch (error) {
    console.error("Live Activity Error:", error.message);
    res.status(500).json({ error: "Failed to fetch live activity." });
  }
};

// 7. Toggle Real-time Traffic Simulator (Disabled for Live Analysis Mode)
const toggleTrafficSimulator = async (req, res) => {
  return res.status(200).json({
    success: true,
    simulationActive: false,
    message: "Traffic simulator is disabled. Live analysis mode is active."
  });
};

// 8. Force Reset Analytics Database
const resetAnalyticsData = async (req, res) => {
  try {
    await seedAnalyticsData(true); // force = true
    res.status(200).json({ success: true, message: "Database re-seeded successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset analytics database." });
  }
};

// 9. Promote User to Admin
const promoteUserToAdmin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found with this email." });
    }

    user.role = "admin";
    await user.save();

    res.status(200).json({ success: true, message: `User ${user.email} promoted to Admin.` });
  } catch (error) {
    res.status(500).json({ error: "Failed to promote user." });
  }
};

const toggleUserPremium = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    user.isPremium = !user.isPremium;
    await user.save();

    res.status(200).json({ success: true, isPremium: user.isPremium, message: `Premium status updated for ${user.email}.` });
  } catch (error) {
    console.error("Toggle Premium Error:", error.message);
    res.status(500).json({ error: "Failed to toggle premium status." });
  }
};

module.exports = {
  getDashboardStats,
  getUsersList,
  getAnalyticsGrowth,
  getContentInsights,
  getPlayerWatch,
  getLiveActivity,
  toggleTrafficSimulator,
  resetAnalyticsData,
  promoteUserToAdmin,
  toggleUserPremium
};
