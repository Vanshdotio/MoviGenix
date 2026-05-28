const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect, adminProtect, optionalProtect } = require("../middlewares/auth.middleware");
const {
  createAd,
  getAds,
  updateAd,
  deleteAd,
  getAdStats,
  getActiveAds,
  trackAdView,
  trackAdClick,
  trackAdComplete,
  trackAdSkip,
} = require("../controllers/ads.controller");

// Ensure upload folder exists in the project root
const uploadDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|mp4|webm/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (jpeg/jpg/png/gif) and video (mp4/webm) files are allowed!"));
    }
  },
});

const adUploadFields = upload.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

// Admin Endpoints
router.post("/admin/ads", protect, adminProtect, adUploadFields, createAd);
router.get("/admin/ads", protect, adminProtect, getAds);
router.get("/admin/ads/stats", protect, adminProtect, getAdStats);
router.put("/admin/ads/:id", protect, adminProtect, adUploadFields, updateAd);
router.delete("/admin/ads/:id", protect, adminProtect, deleteAd);

// Player/Public Endpoints
router.get("/player/active", optionalProtect, getActiveAds);
router.post("/player/:id/view", optionalProtect, trackAdView);
router.post("/player/:id/click", optionalProtect, trackAdClick);
router.post("/player/:id/complete", optionalProtect, trackAdComplete);
router.post("/player/:id/skip", optionalProtect, trackAdSkip);

module.exports = router;
