const mongoose = require("mongoose");

const PlayerEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
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
    eventType: {
      type: String,
      enum: [
        "play",
        "pause",
        "buffer",
        "seek",
        "quality_change",
        "audio_change",
        "complete",
      ],
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // e.g. { fromQuality: "auto", toQuality: "1080p", bufferDuration: 3 }
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PlayerEvent", PlayerEventSchema);
