const mongoose = require("mongoose");

const AdSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    videoUrl: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: "",
    },
    placement: {
      type: String,
      enum: ["pre-roll", "mid-roll", "post-roll"],
      required: true,
      default: "pre-roll",
    },
    midRollTime: {
      type: Number,
      default: 600, // Trigger time in seconds (e.g. 600s = 10m)
    },
    skipAfter: {
      type: Number,
      default: 5, // skip time in seconds (0 for unskippable)
    },
    smartSkip: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
    },
    priority: {
      type: Number,
      default: 0, // Higher numbers take priority
    },
    views: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    completions: {
      type: Number,
      default: 0,
    },
    skips: {
      type: Number,
      default: 0,
    },
    totalWatchTime: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ad", AdSchema);
