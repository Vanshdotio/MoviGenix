const mongoose = require("mongoose");

const SearchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // guest user search has no userId
    },
    query: {
      type: String,
      required: true,
      trim: true,
    },
    resultsCount: {
      type: Number,
      default: 0,
    },
    success: {
      type: Boolean,
      default: true, // true if resultsCount > 0
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

module.exports = mongoose.model("SearchHistory", SearchHistorySchema);
