const mongoose = require("mongoose");
const dns = require("dns");
const axios = require("axios");

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

    console.log(`[Migration] Found ${users.length} user(s) to check.`);

    for (const user of users) {
      let changed = false;
      const userName = user.name || user.email || user._id;

      // Read raw data from MongoDB (bypass Mongoose defaults)
      let currentWatchlist = user.watchlist || {};
      let currentContinue = user.continueWatching || {};

      // Log what we find
      const cartoonWLCount = Array.isArray(currentWatchlist.cartoon) ? currentWatchlist.cartoon.length : 0;
      const cartoonCWCount = Array.isArray(currentContinue.cartoon) ? currentContinue.cartoon.length : 0;
      const movieWLCount = Array.isArray(currentWatchlist.movie) ? currentWatchlist.movie.length : 0;
      const movieCWCount = Array.isArray(currentContinue.movie) ? currentContinue.movie.length : 0;
      console.log(`[Migration] User "${userName}": watchlist.cartoon=${cartoonWLCount}, watchlist.movie=${movieWLCount}, continueWatching.cartoon=${cartoonCWCount}, continueWatching.movie=${movieCWCount}`);

      // 1. Handle legacy flat-array format
      if (Array.isArray(user.watchlist)) {
        console.log(`[Migration] User "${userName}": Legacy flat watchlist array detected.`);
        const cartoon = user.watchlist.filter(item => item.type === "movie" || item.type === "cartoon").map(item => ({ ...item, type: "cartoon" }));
        const tv = user.watchlist.filter(item => item.type === "tv");
        const anime = user.watchlist.filter(item => item.type === "anime");
        currentWatchlist = { movie: [], cartoon, tv, anime };
        changed = true;
      } else if (user.watchlist && user.watchlist.movies) {
        console.log(`[Migration] User "${userName}": Legacy .movies key detected in watchlist.`);
        currentWatchlist = {
          movie: user.watchlist.movies.map(item => ({ ...item, type: "movie" })),
          cartoon: user.watchlist.cartoon || [],
          tv: user.watchlist.tv || [],
          anime: user.watchlist.anime || []
        };
        changed = true;
      }

      if (Array.isArray(user.continueWatching)) {
        console.log(`[Migration] User "${userName}": Legacy flat continueWatching array detected.`);
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
        console.log(`[Migration] User "${userName}": Legacy .movies key detected in continueWatching.`);
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
        console.log(`[Migration] User "${userName}": Checking ${cartoonWatchlist.length} cartoon watchlist items via TMDB...`);
        for (const item of cartoonWatchlist) {
          const itemId = item.id;
          const isTvHint = item.type === "tv" || !!item.first_air_date;
          const { category } = await determineItemCategory(itemId, isTvHint);
          console.log(`[Migration]   Watchlist item id=${itemId} title="${item.title || item.name}" → category="${category}"`);

          const newItem = { ...item, type: category };
          updatedWatchlist[category].push(newItem);
          if (category !== "cartoon") {
            changed = true;
          }
        }
      } else {
        // No cartoon items to split - preserve existing cartoon watchlist as-is
        updatedWatchlist.cartoon = currentWatchlist.cartoon || [];
      }

      // 4. Re-categorize every item currently in the cartoon continueWatching
      const cartoonContinue = currentContinue.cartoon || [];
      if (cartoonContinue.length > 0) {
        console.log(`[Migration] User "${userName}": Checking ${cartoonContinue.length} cartoon continueWatching items via TMDB...`);
        for (const item of cartoonContinue) {
          const itemId = item.cartoonId || item.movieId || item.id;
          const isTvHint = item.season !== undefined || item.episode !== undefined;
          const { category } = await determineItemCategory(itemId, isTvHint);
          console.log(`[Migration]   ContinueWatching item id=${itemId} title="${item.title || item.name}" → category="${category}"`);

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
        // No cartoon items to split - preserve existing cartoon continueWatching as-is
        updatedContinue.cartoon = currentContinue.cartoon || [];
      }

      // 5. Always ensure the `movie` key exists (even if empty)
      // If the user's DB document doesn't have `watchlist.movie` or `continueWatching.movie`,
      // we need to add it so the new schema works correctly.
      if (!user.watchlist || user.watchlist.movie === undefined) {
        changed = true;
      }
      if (!user.continueWatching || user.continueWatching.movie === undefined) {
        changed = true;
      }

      if (changed) {
        console.log(`[Migration] User "${userName}": Writing updated data...`);
        console.log(`[Migration]   Final watchlist: movie=${updatedWatchlist.movie.length}, cartoon=${updatedWatchlist.cartoon.length}, tv=${updatedWatchlist.tv.length}, anime=${updatedWatchlist.anime.length}`);
        console.log(`[Migration]   Final continueWatching: movie=${updatedContinue.movie.length}, cartoon=${updatedContinue.cartoon.length}, tv=${updatedContinue.tv.length}, anime=${updatedContinue.anime.length}`);

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
      } else {
        console.log(`[Migration] User "${userName}": Already up-to-date, no changes needed.`);
      }
    }

    if (migratedCount > 0) {
      console.log(`[Migration] Successfully migrated ${migratedCount} user(s).`);
    } else {
      console.log("[Migration] All users already up-to-date.");
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
    }
    catch(error){
        console.error(error);
    }
}

module.exports = connectToDB;