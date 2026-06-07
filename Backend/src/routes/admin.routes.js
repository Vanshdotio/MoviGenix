const express = require("express");
const router = express.Router();
const { protect, adminProtect, superAdminProtect } = require("../middlewares/auth.middleware");
const {
  getDashboardStats,
  getUsersList,
  getAnalyticsGrowth,
  getContentInsights,
  getPlayerWatch,
  getLiveActivity,
  toggleTrafficSimulator,
  resetAnalyticsData,
  promoteUserToAdmin,
  toggleUserPremium,
  getUserDetails,
  updateUserDetails,
  toggleUserSuspension,
  deleteUser,
  getContentRatings,
  updateContentRating,
  addContentRating,
} = require("../controllers/admin.controller");

// Admin promotion endpoint (open or protected by login, so developers can activate admin easily)
router.post("/promote", promoteUserToAdmin);

// Dashboard routes (strictly restricted to administrators)
router.get("/dashboard-stats", protect, adminProtect, getDashboardStats);
router.get("/users-list", protect, adminProtect, getUsersList);
router.get("/analytics-growth", protect, adminProtect, getAnalyticsGrowth);
router.get("/content-insights", protect, adminProtect, getContentInsights);
router.get("/player-watch", protect, adminProtect, getPlayerWatch);
router.get("/live-activity", protect, adminProtect, getLiveActivity);
router.post("/simulate-traffic", protect, adminProtect, toggleTrafficSimulator);
router.post("/reset-analytics", protect, adminProtect, resetAnalyticsData);
router.post("/toggle-premium", protect, adminProtect, toggleUserPremium);

// User Management Routes
router.get("/users/:id", protect, adminProtect, getUserDetails);
router.put("/users/:id", protect, adminProtect, updateUserDetails);
router.put("/users/:id/suspend", protect, adminProtect, toggleUserSuspension);
router.delete("/users/:id", protect, adminProtect, superAdminProtect, deleteUser);

// Content Rating Classification Routes
router.get("/content-ratings", protect, adminProtect, getContentRatings);
router.put("/content-ratings/:id", protect, adminProtect, updateContentRating);
router.post("/content-ratings/add", protect, adminProtect, addContentRating);

module.exports = router;
