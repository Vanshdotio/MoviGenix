const cache = new Map();

/**
 * Express middleware to cache responses in memory
 * @param {number} ttlSeconds Time to live in seconds (default: 5 minutes)
 */
const cacheMiddleware = (ttlSeconds = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Partition cache key by restricted/unrestricted status and user identity
    const shouldFilter = req.user 
      ? (!req.user.isAdult || req.user.safeMode || req.user.hideMature) 
      : true; // default restricted for guests
    const prefix = shouldFilter ? "restricted" : "unrestricted";
    const userSuffix = req.user ? `user:${req.user._id || req.user.id}` : "guest";
    const key = `${prefix}:${userSuffix}:${req.originalUrl || req.url}`;
    const cached = cache.get(key);

    if (cached) {
      const now = Date.now();
      if (now < cached.expiresAt) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cached.data);
      } else {
        cache.delete(key);
      }
    }

    // Intercept res.json to cache the response body
    const originalJson = res.json;
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, {
          data: body,
          expiresAt: Date.now() + (ttlSeconds * 1000)
        });
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson.call(this, body);
    };

    next();
  };
};

const clearCache = () => {
  cache.clear();
};

module.exports = {
  cacheMiddleware,
  clearCache
};
