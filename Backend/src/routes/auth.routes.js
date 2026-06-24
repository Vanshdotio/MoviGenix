const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const {
  signup,
  login,
  googleLogin,
  logout,
  getProfile,
  updateProfile,
  toggleFavorite,
  toggleWatchlist,
  addContinueWatching,
  removeContinueWatching,
  forgotPassword,
  toggleNotifyMe,
  getNotifyMeList,
} = require("../controllers/auth.controller");

// Public auth routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/logout", logout);

// Protected user routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/favorites/toggle", protect, toggleFavorite);
router.post("/watchlist/toggle", protect, toggleWatchlist);
router.post("/continue-watching", protect, addContinueWatching);
router.post("/continue-watching/remove", protect, removeContinueWatching);

// Notify Me routes
router.post("/notify-me", protect, toggleNotifyMe);
router.get("/notify-me", protect, getNotifyMeList);

module.exports = router;
