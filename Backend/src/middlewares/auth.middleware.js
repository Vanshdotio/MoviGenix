const jwt = require("jsonwebtoken");
const User = require("../models/User.model");

// In-memory cache to merge parallel user lookups (e.g. from concurrent home rows)
const userCache = new Map();
const USER_CACHE_TTL = 5000; // 5 seconds Time To Live

const getUserFromCacheOrDb = async (userId) => {
  const cached = userCache.get(userId);
  const now = Date.now();
  if (cached && now < cached.expiresAt) {
    return cached.user;
  }

  const user = await User.findById(userId).select("-password");
  if (user) {
    userCache.set(userId, {
      user,
      expiresAt: now + USER_CACHE_TTL
    });
  }
  return user;
};

const clearUserCache = (userId) => {
  if (userId) {
    userCache.delete(String(userId));
  }
};

const protect = async (req, res, next) => {
  let token;

  // 1. Read token from cookies or authorization headers
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // 2. Check if token exists
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // 3. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Fetch user (using caching to de-dupe concurrent requests)
    const user = await getUserFromCacheOrDb(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User associated with this token not found." });
    }

    if (user.suspended) {
      return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
    }

    // 5. Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

const optionalProtect = async (req, res, next) => {
  let token;

  // 1. Read token from cookies or authorization headers
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserFromCacheOrDb(decoded.id);
    if (user && user.suspended) {
      req.user = null;
    } else {
      req.user = user || null;
    }
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

const adminProtect = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "superadmin")) {
    next();
  } else {
    return res.status(403).json({ error: "Access denied. Administrator privileges required." });
  }
};

const superAdminProtect = (req, res, next) => {
  if (req.user && req.user.role === "superadmin") {
    next();
  } else {
    return res.status(403).json({ error: "Access denied. Super Administrator privileges required." });
  }
};

module.exports = { protect, optionalProtect, adminProtect, superAdminProtect, clearUserCache };
