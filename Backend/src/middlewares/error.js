/**
 * Global Express error handling middleware
 */
const errorMiddleware = (err, req, res, next) => {
  console.error("[GLOBAL ERROR]:", {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl || req.url,
    method: req.method
  });

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
};

module.exports = errorMiddleware;
