const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User.model");
const Content = require("../models/Content.model");
const { clearUserCache } = require("../middlewares/auth.middleware");
const { getMediaMinimalDetails } = require("./movie.controller");
const axios = require("axios");

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const getApiKey = () => process.env.TMDB_API_KEY;

const getParams = (extraParams = {}) => ({
  params: {
    api_key: getApiKey(),
    ...extraParams,
  },
});

const ADULT_RATINGS = [
  "NC-17",
  "R",
  "TV-MA",
  "18",
  "18+",
  "R18",
  "A",
  "X",
  "18R",
  "18TC",
  "M18",
];

const calculateAge = (dobString) => {
  if (!dobString) return 0;
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const fetchWithRetry = async (
  url,
  options = {},
  retries = 3,
  delayMs = 200,
) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

const getOrFetchContentRating = async (id, type) => {
  const actualType = type === "anime" ? "tv" : type;
  let content = await Content.findOne({ id, type });
  if (content) {
    return content;
  }

  let isAdult = false;
  let ageRating = "G";

  try {
    if (actualType === "movie") {
      const response = await fetchWithRetry(
        `${TMDB_BASE_URL}/movie/${id}`,
        getParams({ append_to_response: "release_dates" }),
      );
      const movieData = response.data;
      isAdult = movieData.adult || false;

      if (movieData.release_dates && movieData.release_dates.results) {
        const usRelease = movieData.release_dates.results.find(
          (r) => r.iso_3166_1 === "US",
        );
        const inRelease = movieData.release_dates.results.find(
          (r) => r.iso_3166_1 === "IN",
        );
        const ukRelease = movieData.release_dates.results.find(
          (r) => r.iso_3166_1 === "GB",
        );

        const certs = [];
        if (usRelease && usRelease.release_dates)
          certs.push(...usRelease.release_dates.map((d) => d.certification));
        if (inRelease && inRelease.release_dates)
          certs.push(...inRelease.release_dates.map((d) => d.certification));
        if (ukRelease && ukRelease.release_dates)
          certs.push(...ukRelease.release_dates.map((d) => d.certification));

        if (certs.length === 0) {
          for (const res of movieData.release_dates.results) {
            if (res.release_dates) {
              certs.push(...res.release_dates.map((d) => d.certification));
            }
          }
        }

        const activeCerts = certs.filter(Boolean);
        const adultCert = activeCerts.find((c) =>
          ADULT_RATINGS.includes(c.toUpperCase()),
        );
        if (adultCert) {
          isAdult = true;
          ageRating = adultCert;
        } else if (activeCerts.length > 0) {
          ageRating = activeCerts[0];
        }
      }
    } else {
      const response = await fetchWithRetry(
        `${TMDB_BASE_URL}/tv/${id}`,
        getParams({ append_to_response: "content_ratings" }),
      );
      const tvData = response.data;

      if (tvData.content_ratings && tvData.content_ratings.results) {
        const usRating = tvData.content_ratings.results.find(
          (r) => r.iso_3166_1 === "US",
        );
        const inRating = tvData.content_ratings.results.find(
          (r) => r.iso_3166_1 === "IN",
        );
        const ukRating = tvData.content_ratings.results.find(
          (r) => r.iso_3166_1 === "GB",
        );

        const ratings = [];
        if (usRating) ratings.push(usRating.rating);
        if (inRating) ratings.push(inRating.rating);
        if (ukRating) ratings.push(ukRating.rating);

        if (ratings.length === 0) {
          ratings.push(...tvData.content_ratings.results.map((r) => r.rating));
        }

        const activeRatings = ratings.filter(Boolean);
        const adultRating = activeRatings.find((r) =>
          ADULT_RATINGS.includes(r.toUpperCase()),
        );
        if (adultRating) {
          isAdult = true;
          ageRating = adultRating;
        } else if (activeRatings.length > 0) {
          ageRating = activeRatings[0];
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching rating for ${type} ${id}:`, error.message);
  }

  content = await Content.create({ id, type, isAdult, ageRating });
  return content;
};

const enrichContinueWatchingLists = async (continueWatching) => {
  if (!continueWatching) return continueWatching;
  const categories = ["movie", "cartoon", "tv", "anime"];
  for (const cat of categories) {
    const list = continueWatching[cat];
    if (Array.isArray(list) && list.length > 0) {
      continueWatching[cat] = await Promise.all(
        list.map(async (item) => {
          const itemId = item.id || item.movieId || item.showId || item.animeId;
          const details = await getMediaMinimalDetails(itemId, cat);
          return {
            id: itemId,
            progress: item.progress || 0,
            duration: item.duration || 0,
            timestamp: item.timestamp || item.watchedAt || new Date(),
            season: item.season,
            episode: item.episode,
            selectedAudio: item.selectedAudio || "",
            title: details?.title || item.title || "",
            name: details?.name || item.name || "",
            poster_path: details?.poster_path || item.poster_path || "",
            backdrop_path: details?.backdrop_path || item.backdrop_path || "",
            vote_average: details?.vote_average || item.vote_average || 0,
          };
        })
      );
    }
  }
  return continueWatching;
};

const filterUserMediaLists = async (user) => {
  if (!user) return null;

  const shouldFilter = !user.isAdult || user.safeMode || user.hideMature;
  const userObj = user.toObject ? user.toObject() : user;

  if (userObj.password) delete userObj.password;

  // Computed field: only adults can access content preferences
  userObj.showContentPreferences = !!userObj.isAdult;

  if (!shouldFilter) {
    if (userObj.continueWatching) {
      userObj.continueWatching = await enrichContinueWatchingLists(userObj.continueWatching);
    }
    return userObj;
  }

  const mediaItems = [];

  if (userObj.favorites) {
    mediaItems.push(
      ...userObj.favorites.map((f) => ({ id: String(f.id), type: f.type })),
    );
  }
  if (userObj.watchlist) {
    if (userObj.watchlist.movie) {
      mediaItems.push(
        ...userObj.watchlist.movie.map((m) => ({
          id: String(m.id),
          type: "movie",
        })),
      );
    }
    if (userObj.watchlist.cartoon) {
      mediaItems.push(
        ...userObj.watchlist.cartoon.map((m) => ({
          id: String(m.id),
          type: "cartoon",
        })),
      );
    }
    if (userObj.watchlist.tv) {
      mediaItems.push(
        ...userObj.watchlist.tv.map((t) => ({ id: String(t.id), type: "tv" })),
      );
    }
    if (userObj.watchlist.anime) {
      mediaItems.push(
        ...userObj.watchlist.anime.map((a) => ({
          id: String(a.id),
          type: "anime",
        })),
      );
    }
  }
  if (userObj.continueWatching) {
    if (userObj.continueWatching.movie) {
      mediaItems.push(
        ...userObj.continueWatching.movie.map((m) => ({
          id: String(m.movieId || m.id),
          type: "movie",
        })),
      );
    }
    if (userObj.continueWatching.cartoon) {
      mediaItems.push(
        ...userObj.continueWatching.cartoon.map((m) => ({
          id: String(m.cartoonId || m.id),
          type: "cartoon",
        })),
      );
    }
    if (userObj.continueWatching.tv) {
      mediaItems.push(
        ...userObj.continueWatching.tv.map((t) => ({
          id: String(t.showId || t.id),
          type: "tv",
        })),
      );
    }
    if (userObj.continueWatching.anime) {
      mediaItems.push(
        ...userObj.continueWatching.anime.map((a) => ({
          id: String(a.animeId || a.id),
          type: "anime",
        })),
      );
    }
  }

  if (mediaItems.length === 0) {
    if (userObj.continueWatching) {
      userObj.continueWatching = await enrichContinueWatchingLists(userObj.continueWatching);
    }
    return userObj;
  }

  const uniqueMedia = Array.from(
    new Set(mediaItems.map((m) => `${m.type}:${m.id}`)),
  ).map((s) => {
    const [type, id] = s.split(":");
    return { type, id };
  });

  const ids = uniqueMedia.map((m) => m.id);
  const cached = await Content.find({ id: { $in: ids } });
  const cachedMap = new Map(
    cached.map((c) => [`${c.type}:${c.id}`, c.isAdult]),
  );

  const missing = uniqueMedia.filter(
    (m) => !cachedMap.has(`${m.type}:${m.id}`),
  );
  if (missing.length > 0) {
    await Promise.all(
      missing.map(async (m) => {
        try {
          const content = await getOrFetchContentRating(m.id, m.type);
          cachedMap.set(`${m.type}:${m.id}`, content.isAdult);
        } catch (err) {
          cachedMap.set(`${m.type}:${m.id}`, false);
        }
      }),
    );
  }

  if (userObj.favorites) {
    userObj.favorites = userObj.favorites.filter(
      (f) => !cachedMap.get(`${f.type}:${f.id}`),
    );
  }
  if (userObj.watchlist) {
    if (userObj.watchlist.movie) {
      userObj.watchlist.movie = userObj.watchlist.movie.filter(
        (m) => !cachedMap.get(`movie:${m.id}`),
      );
    }
    if (userObj.watchlist.cartoon) {
      userObj.watchlist.cartoon = userObj.watchlist.cartoon.filter(
        (m) => !cachedMap.get(`cartoon:${m.id}`),
      );
    }
    if (userObj.watchlist.tv) {
      userObj.watchlist.tv = userObj.watchlist.tv.filter(
        (t) => !cachedMap.get(`tv:${t.id}`),
      );
    }
    if (userObj.watchlist.anime) {
      userObj.watchlist.anime = userObj.watchlist.anime.filter(
        (a) => !cachedMap.get(`anime:${a.id}`),
      );
    }
  }
  if (userObj.continueWatching) {
    if (userObj.continueWatching.movie) {
      userObj.continueWatching.movie = userObj.continueWatching.movie.filter(
        (m) => !cachedMap.get(`movie:${m.movieId || m.id}`),
      );
    }
    if (userObj.continueWatching.cartoon) {
      userObj.continueWatching.cartoon =
        userObj.continueWatching.cartoon.filter(
          (m) => !cachedMap.get(`cartoon:${m.cartoonId || m.id}`),
        );
    }
    if (userObj.continueWatching.tv) {
      userObj.continueWatching.tv = userObj.continueWatching.tv.filter(
        (t) => !cachedMap.get(`tv:${t.showId || t.id}`),
      );
    }
    if (userObj.continueWatching.anime) {
      userObj.continueWatching.anime = userObj.continueWatching.anime.filter(
        (a) => !cachedMap.get(`anime:${a.animeId || a.id}`),
      );
    }
  }

  if (userObj.continueWatching) {
    userObj.continueWatching = await enrichContinueWatchingLists(userObj.continueWatching);
  }

  return userObj;
};

// Initialize Google OAuth client with the client ID from the configuration
const GOOGLE_CLIENT_ID =
  "966319354665-nqevmcplc0tr3qd886183gf98trjdcuu.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const setCookieToken = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  const { name, email, password, confirmPassword, dob } = req.body;

  if (!name || !email || !password || !confirmPassword || !dob) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    const age = calculateAge(dob);
    const isAdult = age >= 18;
    const safeMode = !isAdult;
    const hideMature = !isAdult;

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar: avatarUrl,
      dob,
      age,
      isAdult,
      safeMode,
      hideMature,
    });

    const token = generateToken(user._id);
    setCookieToken(res, token);

    const userResponse = await filterUserMediaLists(user);

    return res.status(201).json({
      message: "Account created successfully.",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Signup Error:", error.message);
    return res.status(500).json({ error: "Server error during registration." });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Google-only users might not have a password
    if (!user.password) {
      return res.status(400).json({
        error:
          "This email is registered with Google Sign-in. Please log in with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Recalculate age on every login (user may have turned 18 since last session)
    if (user.dob) {
      const currentAge = calculateAge(user.dob);
      const wasAdult = user.isAdult;
      user.age = currentAge;
      user.isAdult = currentAge >= 18;

      // If user just turned 18, keep existing preferences
      // If user is still minor, enforce restrictions
      if (!user.isAdult) {
        user.safeMode = true;
        user.hideMature = true;
      }

      if (user.age !== currentAge || user.isAdult !== wasAdult) {
        await user.save();
      }
    }

    const token = generateToken(user._id);

    // Adjust cookie age if Remember Me is checked
    const isProduction = process.env.NODE_ENV === "production";
    const cookieMaxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000; // 30 days vs 1 day
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: cookieMaxAge,
    });

    const userResponse = await filterUserMediaLists(user);

    return res.json({
      message: "Logged in successfully.",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    return res.status(500).json({ error: "Server error during login." });
  }
};

// @desc    Google Authentication
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res
      .status(400)
      .json({ error: "Google credential token is missing." });
  }

  try {
    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // 1. Find user by googleId
    let user = await User.findOne({ googleId });

    if (!user) {
      // 2. If not found by googleId, check by email
      user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        // Link googleId to existing email account
        user.googleId = googleId;
        if (!user.avatar) user.avatar = picture || user.avatar;
        await user.save();
      } else {
        // 3. Create a new account if first time user
        user = await User.create({
          name,
          email: email.toLowerCase(),
          googleId,
          avatar:
            picture ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        });
      }
    }

    // Recalculate age on every Google login
    if (user.dob) {
      const currentAge = calculateAge(user.dob);
      user.age = currentAge;
      user.isAdult = currentAge >= 18;

      if (!user.isAdult) {
        user.safeMode = true;
        user.hideMature = true;
      }
      await user.save();
    }

    const token = generateToken(user._id);
    setCookieToken(res, token);

    const userResponse = await filterUserMediaLists(user);

    return res.json({
      message: "Authenticated with Google successfully.",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("Google Auth Error:", error.message);
    return res.status(400).json({ error: "Google authentication failed." });
  }
};

// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  return res.json({ message: "Logged out successfully." });
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  const userResponse = await filterUserMediaLists(req.user);
  return res.json({ user: userResponse });
};

// @desc    Update user profile & preferences
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  const {
    name,
    avatar,
    preferences,
    dob,
    confirmPassword,
    safeMode,
    hideMature,
  } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // If changing DOB and user has a password set, require verification
    if (dob && dob !== user.dob && user.password) {
      if (!confirmPassword) {
        return res
          .status(400)
          .json({
            error: "Password confirmation is required to change Date of Birth.",
          });
      }
      const isMatch = await bcrypt.compare(confirmPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ error: "Incorrect password. Verification failed." });
      }
    }

    if (name) user.name = name.trim();
    if (avatar) user.avatar = avatar;
    if (preferences) {
      if (preferences.theme) user.preferences.theme = preferences.theme;
      if (preferences.language)
        user.preferences.language = preferences.language;
      if (preferences.audioLanguage !== undefined)
        user.preferences.audioLanguage = preferences.audioLanguage;
      if (preferences.subtitleLanguage !== undefined)
        user.preferences.subtitleLanguage = preferences.subtitleLanguage;
      if (typeof preferences.autoSelectDub === "boolean")
        user.preferences.autoSelectDub = preferences.autoSelectDub;
      if (preferences.volume !== undefined)
        user.preferences.volume = preferences.volume;
      if (preferences.audioMode !== undefined)
        user.preferences.audioMode = preferences.audioMode;
    }

    if (dob) {
      user.dob = dob;
      const age = calculateAge(dob);
      user.age = age;
      user.isAdult = age >= 18;

      // Force filters for underage users
      if (!user.isAdult) {
        user.safeMode = true;
        user.hideMature = true;
      }
    }

    if (typeof safeMode === "boolean" || typeof hideMature === "boolean") {
      // Minors cannot change content restriction settings
      if (!user.isAdult) {
        if (
          (typeof safeMode === "boolean" && safeMode === false) ||
          (typeof hideMature === "boolean" && hideMature === false)
        ) {
          return res.status(403).json({
            error: "Content preferences are restricted for users under 18.",
          });
        }
      }
      if (typeof safeMode === "boolean") {
        user.safeMode = user.isAdult ? safeMode : true;
      }
      if (typeof hideMature === "boolean") {
        user.hideMature = user.isAdult ? hideMature : true;
      }
    }

    await user.save();
    clearUserCache(user._id);

    const userResponse = await filterUserMediaLists(user);

    return res.json({
      message: "Profile updated successfully.",
      user: userResponse,
    });
  } catch (error) {
    console.error("Update Profile Error:", error.message);
    return res.status(500).json({ error: "Failed to update profile." });
  }
};

// @desc    Toggle item in Favorites list
// @route   POST /api/auth/favorites/toggle
// @access  Private
const toggleFavorite = async (req, res) => {
  const {
    id,
    type,
    title,
    name,
    poster_path,
    vote_average,
    release_date,
    first_air_date,
  } = req.body;

  if (!id || !type) {
    return res.status(400).json({ error: "Media ID and type are required." });
  }

  try {
    const user = await User.findById(req.user._id);

    const shouldFilter = !user.isAdult || user.safeMode || user.hideMature;
    if (shouldFilter) {
      const contentRating = await getOrFetchContentRating(id, type);
      if (contentRating.isAdult) {
        return res
          .status(403)
          .json({ error: "Access denied. This content is age restricted." });
      }
    }

    const index = user.favorites.findIndex(
      (item) => item.id === String(id) && item.type === type,
    );

    if (index > -1) {
      user.favorites.splice(index, 1);
    } else {
      user.favorites.push({
        id: String(id),
        type,
        title,
        name,
        poster_path,
        vote_average: vote_average || 0,
        release_date,
        first_air_date,
      });
    }

    await user.save();
    clearUserCache(user._id);
    const filteredUser = await filterUserMediaLists(user);
    return res.json({
      message: index > -1 ? "Removed from Favorites" : "Added to Favorites",
      favorites: filteredUser.favorites,
    });
  } catch (error) {
    console.error("Toggle Favorite Error:", error.message);
    return res.status(500).json({ error: "Failed to modify favorites." });
  }
};

// @desc    Toggle item in Watchlist
// @route   POST /api/auth/watchlist/toggle
// @access  Private
const toggleWatchlist = async (req, res) => {
  const {
    id,
    type,
    title,
    name,
    poster_path,
    vote_average,
    release_date,
    first_air_date,
  } = req.body;

  if (!id || !type) {
    return res.status(400).json({ error: "Media ID and type are required." });
  }

  try {
    const user = await User.findById(req.user._id);

    const shouldFilter = !user.isAdult || user.safeMode || user.hideMature;
    if (shouldFilter) {
      const contentRating = await getOrFetchContentRating(id, type);
      if (contentRating.isAdult) {
        return res
          .status(403)
          .json({ error: "Access denied. This content is age restricted." });
      }
    }

    // Ensure structure exists
    if (!user.watchlist)
      user.watchlist = { movie: [], cartoon: [], tv: [], anime: [] };
    if (!user.watchlist.movie) user.watchlist.movie = [];
    if (!user.watchlist.cartoon) user.watchlist.cartoon = [];
    if (!user.watchlist.tv) user.watchlist.tv = [];
    if (!user.watchlist.anime) user.watchlist.anime = [];

    const listKey =
      type === "movie"
        ? "movie"
        : type === "cartoon"
          ? "cartoon"
          : type === "tv"
            ? "tv"
            : "anime";
    const targetList = user.watchlist[listKey];

    const index = targetList.findIndex((item) => item.id === String(id));

    if (index > -1) {
      targetList.splice(index, 1);
    } else {
      targetList.push({
        id: String(id),
        type: listKey,
        title,
        name,
        poster_path,
        vote_average: vote_average || 0,
        release_date,
        first_air_date,
      });
    }

    user.markModified(`watchlist.${listKey}`);

    await user.save();
    clearUserCache(user._id);
    const filteredUser = await filterUserMediaLists(user);
    return res.json({
      message: index > -1 ? "Removed from Watchlist" : "Added to Watchlist",
      watchlist: filteredUser.watchlist,
    });
  } catch (error) {
    console.error("Toggle Watchlist Error:", error.message);
    return res.status(500).json({ error: "Failed to modify watchlist." });
  }
};

// @desc    Add item to Continue Watching (or update its timestamp)
// @route   POST /api/auth/continue-watching
// @access  Private
const addContinueWatching = async (req, res) => {
  const {
    id,
    type,
    progress,
    duration,
    season,
    episode,
    selectedAudio,
  } = req.body;

  if (!id || !type) {
    return res.status(400).json({ error: "Media ID and type are required." });
  }

  try {
    const user = await User.findById(req.user._id);

    const shouldFilter = !user.isAdult || user.safeMode || user.hideMature;
    if (shouldFilter) {
      const contentRating = await getOrFetchContentRating(id, type);
      if (contentRating.isAdult) {
        return res
          .status(403)
          .json({ error: "Access denied. This content is age restricted." });
      }
    }

    if (!user.continueWatching)
      user.continueWatching = { movie: [], cartoon: [], tv: [], anime: [] };
    if (!user.continueWatching.movie) user.continueWatching.movie = [];
    if (!user.continueWatching.cartoon) user.continueWatching.cartoon = [];
    if (!user.continueWatching.tv) user.continueWatching.tv = [];
    if (!user.continueWatching.anime) user.continueWatching.anime = [];

    const stringId = String(id);

    if (type === "movie") {
      const targetList = user.continueWatching.movie;
      const filteredList = targetList.filter(
        (item) => (item.id !== stringId && item.movieId !== stringId),
      );
      filteredList.unshift({
        id: stringId,
        progress: Number(progress) || 0,
        duration: Number(duration) || 0,
        selectedAudio: selectedAudio || "",
        timestamp: new Date(),
      });
      user.continueWatching.movie = filteredList.slice(0, 20);
      user.markModified("continueWatching.movie");
    } else if (type === "cartoon") {
      const targetList = user.continueWatching.cartoon;
      const filteredList = targetList.filter(
        (item) => (item.id !== stringId && item.cartoonId !== stringId),
      );
      filteredList.unshift({
        id: stringId,
        season: season !== undefined ? Number(season) : undefined,
        episode: episode !== undefined ? Number(episode) : undefined,
        progress: Number(progress) || 0,
        duration: Number(duration) || 0,
        selectedAudio: selectedAudio || "",
        timestamp: new Date(),
      });
      user.continueWatching.cartoon = filteredList.slice(0, 20);
      user.markModified("continueWatching.cartoon");
    } else if (type === "tv") {
      const targetList = user.continueWatching.tv;
      const filteredList = targetList.filter(
        (item) => (item.id !== stringId && item.showId !== stringId),
      );
      filteredList.unshift({
        id: stringId,
        season: Number(season) || 1,
        episode: Number(episode) || 1,
        progress: Number(progress) || 0,
        duration: Number(duration) || 0,
        selectedAudio: selectedAudio || "",
        timestamp: new Date(),
      });
      user.continueWatching.tv = filteredList.slice(0, 20);
      user.markModified("continueWatching.tv");
    } else if (type === "anime") {
      const targetList = user.continueWatching.anime;
      const filteredList = targetList.filter(
        (item) => (item.id !== stringId && item.animeId !== stringId),
      );
      filteredList.unshift({
        id: stringId,
        season: Number(season) || 1,
        episode: Number(episode) || 1,
        progress: Number(progress) || 0,
        duration: Number(duration) || 0,
        selectedAudio: selectedAudio || "",
        timestamp: new Date(),
      });
      user.continueWatching.anime = filteredList.slice(0, 20);
      user.markModified("continueWatching.anime");
    }

    await user.save();
    clearUserCache(user._id);
    const filteredUser = await filterUserMediaLists(user);
    return res.json({
      message: "Updated Continue Watching",
      continueWatching: filteredUser.continueWatching,
    });
  } catch (error) {
    console.error("Continue Watching Error:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to update Continue Watching list." });
  }
};

// @desc    Remove item from Continue Watching
// @route   POST /api/auth/continue-watching/remove
// @access  Private
const removeContinueWatching = async (req, res) => {
  const { id, type } = req.body;

  if (!id || !type) {
    return res.status(400).json({ error: "Media ID and type are required." });
  }

  try {
    const user = await User.findById(req.user._id);

    if (!user.continueWatching) {
      user.continueWatching = { movie: [], cartoon: [], tv: [], anime: [] };
    }
    if (!user.continueWatching.movie) user.continueWatching.movie = [];
    if (!user.continueWatching.cartoon) user.continueWatching.cartoon = [];
    if (!user.continueWatching.tv) user.continueWatching.tv = [];
    if (!user.continueWatching.anime) user.continueWatching.anime = [];

    const stringId = String(id);
    const continueKey =
      type === "movie"
        ? "movie"
        : type === "cartoon"
          ? "cartoon"
          : type === "tv"
            ? "tv"
            : "anime";
    const targetList = user.continueWatching[continueKey] || [];

    if (type === "movie") {
      user.continueWatching.movie = targetList.filter(
        (item) => item.id !== stringId && item.movieId !== stringId,
      );
      user.markModified("continueWatching.movie");
    } else if (type === "cartoon") {
      user.continueWatching.cartoon = targetList.filter(
        (item) => item.id !== stringId && item.cartoonId !== stringId,
      );
      user.markModified("continueWatching.cartoon");
    } else if (type === "tv") {
      user.continueWatching.tv = targetList.filter(
        (item) => item.id !== stringId && item.showId !== stringId,
      );
      user.markModified("continueWatching.tv");
    } else if (type === "anime") {
      user.continueWatching.anime = targetList.filter(
        (item) => item.id !== stringId && item.animeId !== stringId,
      );
      user.markModified("continueWatching.anime");
    }

    await user.save();
    clearUserCache(user._id);
    const filteredUser = await filterUserMediaLists(user);
    return res.json({
      message: "Removed from Continue Watching",
      continueWatching: filteredUser.continueWatching,
    });
  } catch (error) {
    console.error("Remove Continue Watching Error:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to remove item from Continue Watching list." });
  }
};

module.exports = {
  signup,
  login,
  googleLogin,
  logout,
  getProfile,
  updateProfile,
  toggleFavorite,
  toggleWatchlist,
  addContinueWatching,
  removeContinueWatching,
};
