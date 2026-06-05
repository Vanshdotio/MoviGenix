const axios = require("axios");
const FailedAttempt = require("../models/FailedAttempt.model");

/**
 * Verifies the Cloudflare Turnstile token using Cloudflare siteverify API.
 * @param {string} token - The token received from frontend
 * @param {string} ip - The remote IP address of the client
 * @returns {Promise<boolean>} - True if verified, false otherwise
 */
const verifyTurnstileToken = async (token, ip) => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error("[Turnstile] TURNSTILE_SECRET_KEY is not configured.");
    return false;
  }

  if (!token) {
    console.warn("[Turnstile] No token provided for verification.");
    return false;
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", secretKey);
    params.append("response", token);
    if (ip) {
      params.append("remoteip", ip);
    }

    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const data = response.data;
    if (data.success) {
      return true;
    } else {
      console.warn(
        `[Turnstile] Verification failed for IP ${ip}. Error codes: ${JSON.stringify(
          data["error-codes"]
        )}`
      );
      return false;
    }
  } catch (error) {
    console.error("[Turnstile] Verification API request error:", error.message);
    return false;
  }
};

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
 * Determines whether CAPTCHA verification should be required.
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
  verifyTurnstileToken,
  getFailedAttemptsCount,
  incrementFailedAttempts,
  shouldRequireCaptcha,
  clearFailedAttempts,
};
