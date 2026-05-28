const Ad = require("../models/Ad.model");

// Admin Ads CRUD Operations

// 1. Create a new ad
const createAd = async (req, res) => {
  try {
    const {
      title,
      description,
      videoUrl,
      thumbnail,
      placement,
      midRollTime,
      skipAfter,
      smartSkip,
      isActive,
      startDate,
      endDate,
      priority,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required." });
    }

    // Resolve file uploads if present (from multer)
    let finalVideoUrl = videoUrl;
    let finalThumbnail = thumbnail;

    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        finalVideoUrl = `/uploads/${req.files.video[0].filename}`;
      }
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        finalThumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
      }
    }

    if (!finalVideoUrl) {
      return res.status(400).json({ error: "Ad Video File or Video URL is required." });
    }

    const newAd = await Ad.create({
      title,
      description: description || "",
      videoUrl: finalVideoUrl,
      thumbnail: finalThumbnail || "",
      placement: placement || "pre-roll",
      midRollTime: Number(midRollTime) || 600,
      skipAfter: skipAfter !== undefined ? Number(skipAfter) : 5,
      smartSkip: smartSkip !== undefined ? smartSkip === "true" || smartSkip === true : true,
      isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      priority: Number(priority) || 0,
    });

    res.status(201).json({ success: true, ad: newAd });
  } catch (error) {
    console.error("Create Ad Error:", error.message);
    res.status(500).json({ error: "Failed to create advertisement." });
  }
};

// 2. Get all ads (for Admin Dashboard list)
const getAds = async (req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, ads });
  } catch (error) {
    console.error("Get Ads Error:", error.message);
    res.status(500).json({ error: "Failed to retrieve advertisements." });
  }
};

// 3. Update an ad
const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Resolve file uploads if present
    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        updateData.videoUrl = `/uploads/${req.files.video[0].filename}`;
      }
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        updateData.thumbnail = `/uploads/${req.files.thumbnail[0].filename}`;
      }
    }

    // Cast numbers/booleans explicitly if they are sent as strings in form-data
    if (updateData.midRollTime !== undefined) updateData.midRollTime = Number(updateData.midRollTime);
    if (updateData.skipAfter !== undefined) updateData.skipAfter = Number(updateData.skipAfter);
    if (updateData.smartSkip !== undefined) {
      updateData.smartSkip = updateData.smartSkip === "true" || updateData.smartSkip === true;
    }
    if (updateData.priority !== undefined) updateData.priority = Number(updateData.priority);
    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive === "true" || updateData.isActive === true;
    }

    const updatedAd = await Ad.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedAd) {
      return res.status(404).json({ error: "Advertisement not found." });
    }

    res.status(200).json({ success: true, ad: updatedAd });
  } catch (error) {
    console.error("Update Ad Error:", error.message);
    res.status(500).json({ error: "Failed to update advertisement." });
  }
};

// 4. Delete an ad
const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAd = await Ad.findByIdAndDelete(id);
    if (!deletedAd) {
      return res.status(404).json({ error: "Advertisement not found." });
    }
    res.status(200).json({ success: true, message: "Advertisement deleted successfully." });
  } catch (error) {
    console.error("Delete Ad Error:", error.message);
    res.status(500).json({ error: "Failed to delete advertisement." });
  }
};

// 5. Get Ad Dashboard Stats
const getAdStats = async (req, res) => {
  try {
    const totalAds = await Ad.countDocuments();
    const now = new Date();

    const activeAds = await Ad.countDocuments({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    const scheduledAds = await Ad.countDocuments({
      isActive: true,
      startDate: { $gt: now },
    });

    // Run aggregation to sum metrics
    const totals = await Ad.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
          totalClicks: { $sum: "$clicks" },
          totalCompletions: { $sum: "$completions" },
          totalSkips: { $sum: "$skips" },
          totalWatchTime: { $sum: "$totalWatchTime" },
        },
      },
    ]);

    const stats = totals[0] || {
      totalViews: 0,
      totalClicks: 0,
      totalCompletions: 0,
      totalSkips: 0,
      totalWatchTime: 0,
    };

    const totalViews = stats.totalViews;
    const totalClicks = stats.totalClicks;
    const totalCompletions = stats.totalCompletions;
    const totalSkips = stats.totalSkips;
    const totalWatchTime = stats.totalWatchTime;

    // Rates calculation
    const completionRate = totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0;
    const skipRate = totalViews > 0 ? Math.round((totalSkips / totalViews) * 100) : 0;
    const ctr = totalViews > 0 ? Number(((totalClicks / totalViews) * 100).toFixed(2)) : 0;
    const averageWatch = totalViews > 0 ? Number((totalWatchTime / totalViews).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      stats: {
        totalAds,
        activeAds,
        scheduledAds,
        totalViews,
        totalClicks,
        totalCompletions,
        totalSkips,
        completionRate,
        skipRate,
        ctr,
        averageWatch,
      },
    });
  } catch (error) {
    console.error("Get Ad Stats Error:", error.message);
    res.status(500).json({ error: "Failed to load advertisement statistics." });
  }
};

// Player-facing Ads Operations

// 6. Get active ads (pre-roll, mid-roll, post-roll) to load in player
const getActiveAds = async (req, res) => {
  try {
    // If user is logged in and is Premium, skip ads
    if (req.user && req.user.isPremium) {
      return res.status(200).json({ success: true, ads: [] });
    }

    const now = new Date();
    const ads = await Ad.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ priority: -1, createdAt: -1 });

    res.status(200).json({ success: true, ads });
  } catch (error) {
    console.error("Get Active Ads Error:", error.message);
    res.status(500).json({ error: "Failed to load active advertisements." });
  }
};

// 7. Track view / start play of an ad
const trackAdView = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
    if (!ad) return res.status(404).json({ error: "Ad not found." });
    res.status(200).json({ success: true, views: ad.views });
  } catch (error) {
    console.error("Track Ad View Error:", error.message);
    res.status(500).json({ error: "Failed to track ad view." });
  }
};

// 8. Track click on an ad
const trackAdClick = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findByIdAndUpdate(id, { $inc: { clicks: 1 } }, { new: true });
    if (!ad) return res.status(404).json({ error: "Ad not found." });
    res.status(200).json({ success: true, clicks: ad.clicks });
  } catch (error) {
    console.error("Track Ad Click Error:", error.message);
    res.status(500).json({ error: "Failed to track ad click." });
  }
};

// 9. Track ad completion
const trackAdComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const { watchedDuration } = req.body;
    const ad = await Ad.findByIdAndUpdate(
      id,
      { $inc: { completions: 1, totalWatchTime: Number(watchedDuration) || 0 } },
      { new: true }
    );
    if (!ad) return res.status(404).json({ error: "Ad not found." });
    res.status(200).json({ success: true, completions: ad.completions });
  } catch (error) {
    console.error("Track Ad Complete Error:", error.message);
    res.status(500).json({ error: "Failed to track ad completion." });
  }
};

// 10. Track ad skipped
const trackAdSkip = async (req, res) => {
  try {
    const { id } = req.params;
    const { watchedDuration } = req.body;
    const ad = await Ad.findByIdAndUpdate(
      id,
      { $inc: { skips: 1, totalWatchTime: Number(watchedDuration) || 0 } },
      { new: true }
    );
    if (!ad) return res.status(404).json({ error: "Ad not found." });
    res.status(200).json({ success: true, skips: ad.skips });
  } catch (error) {
    console.error("Track Ad Skip Error:", error.message);
    res.status(500).json({ error: "Failed to track ad skip." });
  }
};

module.exports = {
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
};
