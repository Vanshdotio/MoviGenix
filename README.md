# MoviGenix - Movie Recommendation & Streaming Application

MoviGenix is a premium, dark-themed entertainment streaming web application. It offers users a centralized hub to watch movies, TV shows, anime, and cartoons online, receive personalized recommendations, and keep track of their viewing history.

---

## 🎬 Core Features of the Application

### 📺 Cinematic Web Player
- **Multi-Category Streamer**: Support for multiple video formats and sources, optimized for seamless playback across Movies, TV Shows, Anime, and Cartoons.
- **Audio Enhancer Controls**: Custom equalizer and sound modes (such as Voice Boost) using the Web Audio API to elevate the viewing experience.
- **Auto-Play Next**: Automatically counts down and transitions to the next episode for anime and TV show series.

### 🌟 Smart Personalization
- **Personalized Recommendations**: Suggests films and shows tailored to user interests using integrated TMDB data.
- **Continue Watching**: Remembers your playback position and lets you resume exactly where you left off.
- **My Watchlist**: A dedicated space to save and organize content you plan to watch later.
- **Dynamic Categorization**: Content is dynamically separated into sub-sections (Bollywood, Hollywood, Japanese Anime, Classic Cartoons) using TMDB genre classifiers.

### 💎 Premium Membership
- **Premium Account Mode**: Subscribed users gain premium status which grants them an ad-free viewing experience, bypassing all promotional pre-rolls, mid-rolls, and post-rolls.

### 🎨 Visuals & Seamless UX
- **Modern Dark UI**: Features a sleek glassmorphic design system with modern typography and interactive hover states.
- **Custom Premium Scrollbars**: Visual optimization featuring narrow, translucent scrollbar thumbs and completely transparent background tracks.
- **Smooth Page Transitions**: Equipped with a custom animated loader that runs during page initialization and API data fetches.
- **Mobile & Desktop Responsive**: Fully optimized for mobile views (with webmanifest home screen app icon support) and desktop layouts.

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Vite, TailwindCSS, Swiper, Remixicon, Lenis (Smooth Scroll), Axios.
- **Backend**: Node.js, Express, MongoDB (Mongoose), Multer, JWT, Cookie-Parser.

---

## 📂 Directory Structure

```text
Movie_Recommendation_system/
├── Backend/                 # Express Server & DB Logic
│   ├── src/
│   │   ├── controllers/     # Controller handlers (movies, auth, telemetry)
│   │   ├── models/          # Mongoose DB schemas (User, Movie, Ad)
│   │   ├── routes/          # Express API routes
│   │   └── db/              # Database connection & seeders
│   └── server.js            # Node Entry point
│
└── Frontend/                # Vite React Application
    ├── public/
    │   └── assets/          # Brand logos, icons, loaders, placeholders
    ├── src/
    │   ├── components/      # VideoPlayer, Nav, Loader, Sliders
    │   ├── pages/           # Home, Login/Signup, Profile, Details
    │   └── routes/          # Protected and public route configurations
    ├── index.html           # HTML Entry point
    └── package.json
```

---

## 🚀 How to Run the Application

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) and [MongoDB](https://www.mongodb.com/) installed on your machine.

### 2. Run the Backend Server
```bash
cd Backend
npm install
npm run dev
```

### 3. Run the Frontend Client
```bash
cd Frontend
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.
