const tmdbCache = new Map();
const activeRequests = new Map();
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Get cache key for a request
 * @param {string} url 
 * @param {object} options 
 */
const getCacheKey = (url, options = {}) => {
  const params = options.params || {};
  return `${url}:${JSON.stringify(params)}`;
};

/**
 * Get cached TMDB response
 * @param {string} key 
 */
const getCachedTMDB = (key) => {
  const cached = tmdbCache.get(key);
  if (cached) {
    if (Date.now() < cached.expiresAt) {
      return cached.data;
    }
    tmdbCache.delete(key); // Evict expired key
  }
  return null;
};

/**
 * Set cached TMDB response
 * @param {string} key 
 * @param {any} data 
 * @param {number} ttl Time to live in milliseconds
 */
const setCachedTMDB = (key, data, ttl = DEFAULT_TTL) => {
  tmdbCache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
};

/**
 * Wrapped fetch function with caching and request deduplication (Promise reuse)
 * @param {string} url 
 * @param {object} options 
 * @param {function} fetchFn The original Axios fetch function
 * @param {number} ttl Time to live in milliseconds (default: 10 minutes)
 */
const fetchWithCacheAndDedupe = async (url, options = {}, fetchFn, ttl = DEFAULT_TTL) => {
  const key = getCacheKey(url, options);

  // 1. Check in-memory cache first
  const cachedData = getCachedTMDB(key);
  if (cachedData !== null) {
    return { data: cachedData, fromCache: true };
  }

  // 2. Check if there is an active request in-flight for this key
  if (activeRequests.has(key)) {
    const data = await activeRequests.get(key);
    return { data, fromCache: false, deDuped: true };
  }

  // 3. Initiate new request and save its promise
  const requestPromise = (async () => {
    try {
      const response = await fetchFn(url, options);
      // Save data to cache on success
      if (response && response.data) {
        setCachedTMDB(key, response.data, ttl);
        return response.data;
      }
      return null;
    } finally {
      // Always remove from active requests when done
      activeRequests.delete(key);
    }
  })();

  activeRequests.set(key, requestPromise);
  
  const data = await requestPromise;
  if (!data) {
    throw new Error(`Failed to fetch data from TMDB for: ${url}`);
  }
  return { data, fromCache: false };
};

// Periodically clean up expired cache entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of tmdbCache.entries()) {
    if (now >= cached.expiresAt) {
      tmdbCache.delete(key);
    }
  }
}, 5 * 60 * 1000).unref(); // unref allows node process to exit if only timer is running

module.exports = {
  fetchWithCacheAndDedupe,
  clearCache: () => tmdbCache.clear()
};
