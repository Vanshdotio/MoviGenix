const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contentId: {
      type: String,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
      enum: ["movie", "tv", "anime", "cartoon", "web-series"],
    },
    title: {
      type: String,
      default: "",
    },
    releaseDate: {
      type: String,
      default: "",
    },
    notified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: one notification per user per content item
NotificationSchema.index({ userId: 1, contentId: 1 }, { unique: true });

module.exports = mongoose.model("Notification", NotificationSchema);
