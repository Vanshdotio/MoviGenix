const mongoose = require("mongoose");
const dns = require("dns");
const axios = require("axios");
const { seedAnalyticsData } = require("./seedAnalytics");

// Some environments (e.g. certain corporate networks or custom DNS setups) can
// block or mis-handle SRV lookups used by mongodb+srv URIs. We set a reliable
// public DNS server as a fallback so the driver can resolve Atlas SRV records.
const dnsServers = process.env.DNS_SERVERS
    ? process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean)
    : ["8.8.8.8", "1.1.1.1"];

dns.setServers(dnsServers);

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const getApiKey = () => process.env.TMDB_API_KEY;

const determineCategoryCache = new Map();

const determineItemCategory = async (id, isTvHint) => {
  if (determineCategoryCache.has(id)) return determineCategoryCache.get(id);

  const apiKey = getApiKey();
  if (!apiKey) {
    return { category: "movie" };
  }

  const fetchFromTMDB = async (type) => {
    try {
      const res = await axios.get(`${TMDB_BASE_URL}/${type}/${id}`, {
        params: { api_key: apiKey }
      });
      return res.data;
    } catch (e) {
      return null;
    }
  };

  let data = null;
  let actualType = "movie";

  if (isTvHint) {
    data = await fetchFromTMDB("tv");
    if (data) {
      actualType = "tv";
    } else {
      data = await fetchFromTMDB("movie");
      if (data) actualType = "movie";
    }
  } else {
    data = await fetchFromTMDB("movie");
    if (data) {
      actualType = "movie";
    } else {
      data = await fetchFromTMDB("tv");
      if (data) actualType = "tv";
    }
  }

  if (!data) {
    return { category: "movie" };
  }

  const genres = data.genres || [];
  const hasAnimationGenre = genres.some(g => g.id === 16);
  const isJapanese = data.original_language === "ja" || (data.origin_country && data.origin_country.includes("JP"));

  let category = "movie";
  if (hasAnimationGenre) {
    if (isJapanese) {
      category = "anime";
    } else {
      category = "cartoon";
    }
  } else {
    if (actualType === "tv") {
      category = "tv";
    } else {
      category = "movie";
    }
  }

  const result = { category };
  determineCategoryCache.set(id, result);
  return result;
};

const migrateDatabase = async () => {
  try {
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");
    const users = await usersCollection.find({}).toArray();
    let migratedCount = 0;

    for (const user of users) {
      let changed = false;

      // Read raw data from MongoDB (bypass Mongoose defaults)
      let currentWatchlist = user.watchlist || {};
      let currentContinue = user.continueWatching || {};

      // 1. Handle legacy flat-array format
      if (Array.isArray(user.watchlist)) {
        const cartoon = user.watchlist.filter(item => item.type === "movie" || item.type === "cartoon").map(item => ({ ...item, type: "cartoon" }));
        const tv = user.watchlist.filter(item => item.type === "tv");
        const anime = user.watchlist.filter(item => item.type === "anime");
        currentWatchlist = { movie: [], cartoon, tv, anime };
        changed = true;
      } else if (user.watchlist && user.watchlist.movies) {
        currentWatchlist = {
          movie: user.watchlist.movies.map(item => ({ ...item, type: "movie" })),
          cartoon: user.watchlist.cartoon || [],
          tv: user.watchlist.tv || [],
          anime: user.watchlist.anime || []
        };
        changed = true;
      }

      if (Array.isArray(user.continueWatching)) {
        const cartoon = user.continueWatching.filter(item => item.type === "movie" || item.type === "cartoon").map(item => ({
          id: item.id, cartoonId: item.movieId || item.id,
          progress: item.progress || 0, duration: item.duration || 0,
          title: item.title, poster_path: item.poster_path,
          selectedAudio: item.selectedAudio || "", watchedAt: item.watchedAt || new Date()
        }));
        const tv = user.continueWatching.filter(item => item.type === "tv").map(item => ({
          id: item.id, showId: item.id, season: item.season || 1, episode: item.episode || 1,
          progress: item.progress || 0, name: item.name, poster_path: item.poster_path,
          selectedAudio: item.selectedAudio || "", watchedAt: item.watchedAt || new Date()
        }));
        const anime = user.continueWatching.filter(item => item.type === "anime").map(item => ({
          id: item.id, animeId: item.id, season: item.season || 1, episode: item.episode || 1,
          progress: item.progress || 0, name: item.name, poster_path: item.poster_path,
          selectedAudio: item.selectedAudio || "", watchedAt: item.watchedAt || new Date()
        }));
        currentContinue = { movie: [], cartoon, tv, anime };
        changed = true;
      } else if (user.continueWatching && user.continueWatching.movies) {
        currentContinue = {
          movie: user.continueWatching.movies.map(item => ({
            id: item.id, movieId: item.movieId || item.id,
            progress: item.progress || 0, duration: item.duration || 0,
            title: item.title, poster_path: item.poster_path,
            selectedAudio: item.selectedAudio || "", watchedAt: item.watchedAt || new Date()
          })),
          cartoon: user.continueWatching.cartoon || [],
          tv: user.continueWatching.tv || [],
          anime: user.continueWatching.anime || []
        };
        changed = true;
      }

      // 2. Build updated structures - start with existing movie/tv/anime, rebuild cartoon
      let updatedWatchlist = {
        movie: currentWatchlist.movie || [],
        cartoon: [],
        tv: currentWatchlist.tv || [],
        anime: currentWatchlist.anime || []
      };

      let updatedContinue = {
        movie: currentContinue.movie || [],
        cartoon: [],
        tv: currentContinue.tv || [],
        anime: currentContinue.anime || []
      };

      // 3. Re-categorize every item currently in the cartoon watchlist
      const cartoonWatchlist = currentWatchlist.cartoon || [];
      if (cartoonWatchlist.length > 0) {
        for (const item of cartoonWatchlist) {
          const itemId = item.id;
          const isTvHint = item.type === "tv" || !!item.first_air_date;
          const { category } = await determineItemCategory(itemId, isTvHint);

          const newItem = { ...item, type: category };
          updatedWatchlist[category].push(newItem);
          if (category !== "cartoon") {
            changed = true;
          }
        }
      } else {
        updatedWatchlist.cartoon = currentWatchlist.cartoon || [];
      }

      // 4. Re-categorize every item currently in the cartoon continueWatching
      const cartoonContinue = currentContinue.cartoon || [];
      if (cartoonContinue.length > 0) {
        for (const item of cartoonContinue) {
          const itemId = item.cartoonId || item.movieId || item.id;
          const isTvHint = item.season !== undefined || item.episode !== undefined;
          const { category } = await determineItemCategory(itemId, isTvHint);

          if (category === "movie") {
            updatedContinue.movie.push({
              id: itemId, movieId: itemId,
              progress: item.progress || 0, duration: item.duration || 0,
              title: item.title, poster_path: item.poster_path,
              selectedAudio: item.selectedAudio || "", watchedAt: item.watchedAt || new Date()
            });
            changed = true;
          } else if (category === "cartoon") {
            updatedContinue.cartoon.push(item);
          } else if (category === "tv") {
            updatedContinue.tv.push({
              id: itemId, showId: itemId,
              season: item.season || 1, episode: item.episode || 1,
              progress: item.progress || 0, name: item.title,
              poster_path: item.poster_path,
              selectedAudio: item.selectedAudio || "", watchedAt: item.watchedAt || new Date()
            });
            changed = true;
          } else if (category === "anime") {
            updatedContinue.anime.push({
              id: itemId, animeId: itemId,
              season: item.season || 1, episode: item.episode || 1,
              progress: item.progress || 0, name: item.title,
              poster_path: item.poster_path,
              selectedAudio: item.selectedAudio || "", watchedAt: item.watchedAt || new Date()
            });
            changed = true;
          }
        }
      } else {
        updatedContinue.cartoon = currentContinue.cartoon || [];
      }

      // 5. Always ensure the `movie` key exists (even if empty)
      if (!user.watchlist || user.watchlist.movie === undefined) {
        changed = true;
      }
      if (!user.continueWatching || user.continueWatching.movie === undefined) {
        changed = true;
      }

      if (changed) {
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              watchlist: updatedWatchlist,
              continueWatching: updatedContinue
            }
          }
        );
        migratedCount++;
      }
    }
  } catch (err) {
    console.error("[Migration] Error:", err);
  }
};

const connectToDB = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("DB connected Succesfully.");
        await migrateDatabase();
        await seedAnalyticsData();
    }
    catch(error){
        console.error(error);
    }
}

module.exports = connectToDB;