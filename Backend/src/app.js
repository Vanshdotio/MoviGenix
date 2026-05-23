const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const movieRoutes = require('./routes/movie.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/movies', movieRoutes);
app.use('/api/auth', authRoutes);

module.exports = app;