const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const movieRoutes = require('./routes/movie.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];

// Add custom CORS origin from env (e.g. your main Vercel production URL)
if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(",").forEach(o => allowedOrigins.push(o.trim()));
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check exact match
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    // Allow any Vercel preview/production URL for your project
    if (origin.match(/^https:\/\/.*\.vercel\.app$/)) return callback(null, true);
    
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/movies', movieRoutes);
app.use('/api/auth', authRoutes);

module.exports = app;