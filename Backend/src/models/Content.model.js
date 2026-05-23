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
      enum: ["movie", "tv", "anime"],
    },
    isAdult: {
      type: Boolean,
      default: false,
    },
    ageRating: {
      type: String,
      default: "G",
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for fast queries and uniqueness
ContentSchema.index({ id: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Content", ContentSchema);
