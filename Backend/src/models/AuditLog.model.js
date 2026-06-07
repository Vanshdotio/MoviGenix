const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminEmail: {
      type: String,
      required: true,
    },
    deletedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    deletedUserEmail: {
      type: String,
      required: true,
    },
    loginMethod: {
      type: String,
      required: true,
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

module.exports = mongoose.model("AuditLog", AuditLogSchema);
