const express = require("express");
const router = express.Router();
const { protect, optionalProtect } = require("../middlewares/auth.middleware");
const {
  trackPlayerEvent,
  trackSearch,
  trackWatchProgress,
  trackHeartbeat,
} = require("../controllers/telemetry.controller");

router.post("/event", optionalProtect, trackPlayerEvent);
router.post("/search", optionalProtect, trackSearch);
router.post("/progress", protect, trackWatchProgress);
router.post("/heartbeat", protect, trackHeartbeat);

module.exports = router;
