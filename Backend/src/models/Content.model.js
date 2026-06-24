const mongoose = require("mongoose");

const ContentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["movie", "tv", "anime", "cartoon", "web-series"],
    },
    title: {
      type: String,
      default: "",
    },
    isAdult: {
      type: Boolean,
      default: false,
    },
    isExplicitAdult: {
      type: Boolean,
      default: false,
    },
    ageRating: {
      type: String,
      default: "G", // Can be "Family", "Teen", "Mature", "Explicit Adult" or standard rating codes
    },
    isOtt: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for fast queries and uniqueness
ContentSchema.index({ id: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Content", ContentSchema);
