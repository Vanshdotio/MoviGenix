const mongoose = require("mongoose");

const failedAttemptSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  action: {
    type: String,
    required: true,
    enum: ["login", "google"],
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 900, // TTL index: automatically remove document after 15 minutes (900 seconds)
  },
});

// Create indexes for efficient querying
failedAttemptSchema.index({ ip: 1, timestamp: -1 });
failedAttemptSchema.index({ email: 1, timestamp: -1 });

module.exports = mongoose.model("FailedAttempt", failedAttemptSchema);
