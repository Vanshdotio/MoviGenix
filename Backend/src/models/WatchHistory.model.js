const mongoose = require("mongoose");

const WatchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mediaId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["movie", "tv", "anime", "cartoon"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    posterPath: {
      type: String,
      default: "",
    },
    progress: {
      type: Number,
      default: 0, // in seconds
    },
    duration: {
      type: Number,
      default: 0, // in seconds
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completionPercent: {
      type: Number,
      default: 0,
    },
    rewatchCount: {
      type: Number,
      default: 0,
    },
    watchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WatchHistory", WatchHistorySchema);
