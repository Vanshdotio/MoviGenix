/**
 * Performance tracking middleware to log execution latency of API requests
 */
const performanceMiddleware = (req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(start);
    const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    
    if (parseFloat(timeInMs) > 1000) {
      console.warn(`[PERFORMANCE WARNING] ${req.method} ${req.originalUrl || req.url} took ${timeInMs}ms (EXCEEDS 1s threshold)`);
    } else if (process.env.NODE_ENV !== "production") {
      console.log(`[INFO] ${req.method} ${req.originalUrl || req.url} completed in ${timeInMs}ms`);
    }
  });

  next();
};

module.exports = performanceMiddleware;
