const FailedAttempt = require("../models/FailedAttempt.model");

/**
 * Gets the number of failed login attempts from a given IP or email in the last 15 minutes.
 * @param {string} ip
 * @param {string} email
 * @returns {Promise<number>}
 */
const getFailedAttemptsCount = async (ip, email) => {
  const query = [];
  if (ip) query.push({ ip });
  if (email) query.push({ email: email.toLowerCase() });

  if (query.length === 0) return 0;

  try {
    return await FailedAttempt.countDocuments({
      $or: query,
      timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) }, // last 15 minutes
    });
  } catch (error) {
    console.error("[Security] Error counting failed attempts:", error.message);
    return 0;
  }
};

/**
 * Increments failed attempts for an IP and/or email address.
 * @param {string} ip
 * @param {string} email
 * @param {string} action - 'login' or 'google'
 */
const incrementFailedAttempts = async (ip, email, action) => {
  try {
    await FailedAttempt.create({
      ip,
      email: email ? email.toLowerCase() : undefined,
      action,
    });
    console.log(
      `[Security] Registered failed attempt for Action: ${action}, IP: ${ip}, Email: ${email}`
    );
  } catch (error) {
    console.error("[Security] Error registering failed attempt:", error.message);
  }
};

/**
 * Determines whether login attempts should be throttled.
 * @param {string} ip
 * @param {string} email
 * @returns {Promise<boolean>}
 */
const shouldRequireCaptcha = async (ip, email) => {
  const count = await getFailedAttemptsCount(ip, email);
  return count >= 5;
};

/**
 * Clears failed login attempts on successful authentication.
 * @param {string} ip
 * @param {string} email
 */
const clearFailedAttempts = async (ip, email) => {
  try {
    const query = [];
    if (ip) query.push({ ip });
    if (email) query.push({ email: email.toLowerCase() });

    if (query.length > 0) {
      const result = await FailedAttempt.deleteMany({ $or: query });
      console.log(
        `[Security] Cleared failed attempts for IP: ${ip}, Email: ${email}. Removed: ${result.deletedCount}`
      );
    }
  } catch (error) {
    console.error("[Security] Error clearing failed attempts:", error.message);
  }
};

module.exports = {
  getFailedAttemptsCount,
  incrementFailedAttempts,
  shouldRequireCaptcha,
  clearFailedAttempts,
};
