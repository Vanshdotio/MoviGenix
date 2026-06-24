const axios = require("axios");
const { fetchWithCacheAndDedupe } = require("../utils/tmdbCache");
const Content = require("../models/Content.model");

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const getApiKey = () => process.env.TMDB_API_KEY;

const ADULT_RATINGS = ["NC-17", "R", "TV-MA", "18", "18+", "R18", "A", "X", "18R", "18TC", "M18"];

const EXPLICIT_RATINGS = ["NC-17", "R18", "X", "18R", "18+"];

const OTT_NETWORKS = "213|1024|2552|2739|3919|3013|3272|453|3186|3353|4330";
const OTT_NETWORKS_COMMA = "213,1024,2552,2739,3919,3013,3272,453,3186,3353,4330";

const shouldFilter = (user) => {
  if (!user) return true; // Guests default to restricted
  return !user.isAdult || user.safeMode || user.hideMature;
};

const isExplicitAdultContent = (rating) => {
  if (!rating) return false;
  if (rating.isExplicitAdult) return true;
  if (rating.ageRating && EXPLICIT_RATINGS.includes(String(rating.ageRating).toUpperCase())) {
    return true;
  }
  return false;
};

const isAccessDenied = (rating, user) => {
  if (!rating) return false;

  // Rule 1: Strict Explicit Adult restriction (minor/guest blocked)
  const isExplicit = isExplicitAdultContent(rating);
  const userAge = user ? user.age : 0;
  const isMinor = !user || userAge < 18;
  if (isExplicit && isMinor) return true;

  // Rule 2: General mature content check (safeMode/hideMature)
  if (rating.isAdult && shouldFilter(user)) return true;

  return false;
};

const getOrFetchContentRating = async (id, type) => {
  const actualType = (type === "anime" || type === "web-series" || type === "webSeries") ? "tv" : type;
  let content = await Content.findOne({ id, type });
  if (content) {
    return content;
  }

  let isAdult = false;
  let ageRating = "G";
  let title = "";
  let isOtt = false;

  try {
    if (actualType === "movie") {
      const response = await fetchWithRetry(
        `${TMDB_BASE_URL}/movie/${id}`,
        getParams({ append_to_response: "release_dates" })
      );
      const movieData = response.data;
      isAdult = movieData.adult || false;
      title = movieData.title || movieData.original_title || `Movie ID ${id}`;

      if (movieData.release_dates && movieData.release_dates.results) {
        const usRelease = movieData.release_dates.results.find((r) => r.iso_3166_1 === "US");
        const inRelease = movieData.release_dates.results.find((r) => r.iso_3166_1 === "IN");
        const ukRelease = movieData.release_dates.results.find((r) => r.iso_3166_1 === "GB");

        const certs = [];
        if (usRelease && usRelease.release_dates) certs.push(...usRelease.release_dates.map((d) => d.certification));
        if (inRelease && inRelease.release_dates) certs.push(...inRelease.release_dates.map((d) => d.certification));
        if (ukRelease && ukRelease.release_dates) certs.push(...ukRelease.release_dates.map((d) => d.certification));

        if (certs.length === 0) {
          for (const res of movieData.release_dates.results) {
            if (res.release_dates) {
              certs.push(...res.release_dates.map((d) => d.certification));
            }
          }
        }

        const activeCerts = certs.filter(Boolean);
        const adultCert = activeCerts.find((c) => ADULT_RATINGS.includes(c.toUpperCase()));
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
        getParams({ append_to_response: "content_ratings" })
      );
      const tvData = response.data;
      title = tvData.name || tvData.original_name || `Show ID ${id}`;

      if (tvData.networks && Array.isArray(tvData.networks)) {
        const ottIds = [213, 1024, 2552, 2739, 3919, 3013, 3272, 453, 3186, 3353, 4330];
        isOtt = tvData.networks.some((net) => ottIds.includes(net.id));
      }

      if (tvData.content_ratings && tvData.content_ratings.results) {
        const usRating = tvData.content_ratings.results.find((r) => r.iso_3166_1 === "US");
        const inRating = tvData.content_ratings.results.find((r) => r.iso_3166_1 === "IN");
        const ukRating = tvData.content_ratings.results.find((r) => r.iso_3166_1 === "GB");

        const ratings = [];
        if (usRating) ratings.push(usRating.rating);
        if (inRating) ratings.push(inRating.rating);
        if (ukRating) ratings.push(ukRating.rating);

        if (ratings.length === 0) {
          ratings.push(...tvData.content_ratings.results.map((r) => r.rating));
        }

        const activeRatings = ratings.filter(Boolean);
        const adultRating = activeRatings.find((r) => ADULT_RATINGS.includes(r.toUpperCase()));
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

  const isExplicit = isAdult || (ageRating && EXPLICIT_RATINGS.includes(String(ageRating).toUpperCase()));

  content = await Content.create({ 
    id, 
    type, 
    title, 
    isAdult: isAdult || isExplicit, 
    isExplicitAdult: isExplicit, 
    ageRating,
    isOtt
  });
  return content;
};

const filterMediaList = async (items, type, user) => {
  if (!items || items.length === 0) return [];

  // Filter out items marked as adult by TMDB (pornography etc.)
  let filtered = items.filter((item) => !item.adult);

  const userAge = user ? user.age : 0;
  const isMinor = !user || userAge < 18;

  const ids = filtered.map((item) => String(item.id));
  const cachedRatings = await Content.find({ id: { $in: ids } });
  const cachedMap = new Map(cachedRatings.map((c) => [`${c.type}:${c.id}`, c]));

  const missingItems = [];
  for (const item of filtered) {
    const itemType = item.media_type || type || "movie";
    const key = `${itemType}:${item.id}`;
    if (!cachedMap.has(key)) {
      missingItems.push({ id: String(item.id), type: itemType });
    }
  }

  if (missingItems.length > 0) {
    await Promise.all(
      missingItems.map(async (m) => {
        try {
          const ratingObj = await getOrFetchContentRating(m.id, m.type);
          cachedMap.set(`${m.type}:${m.id}`, ratingObj);
        } catch (err) {
          cachedMap.set(`${m.type}:${m.id}`, { isAdult: false, isExplicitAdult: false, ageRating: "G" });
        }
      })
    );
  }

  const result = filtered.filter((item) => {
    const itemType = item.media_type || type || "movie";
    const ratingObj = cachedMap.get(`${itemType}:${item.id}`);
    if (!ratingObj) return true;

    // Check 1: Strict Explicit Adult restriction (minor/guest blocked)
    const isExplicit = ratingObj.isExplicitAdult || ["NC-17", "R18", "X", "18R", "18+"].includes(String(ratingObj.ageRating).toUpperCase());
    if (isExplicit && isMinor) return false;

    // Check 2: General mature content check (safeMode/hideMature)
    if (ratingObj.isAdult && shouldFilter(user)) return false;

    return true;
  });

  return minimizeList(result, type);
};

const filterCartoons = (items) => {
  if (!items || items.length === 0) return [];
  return items.filter(item => {
    const isJapanese = item.original_language === "ja" || (item.origin_country && item.origin_country.includes("JP"));
    return !isJapanese;
  });
};

const filterAnime = (items) => {
  if (!items || items.length === 0) return [];
  return items.filter(item => {
    const isJapanese = item.original_language === "ja" || (item.origin_country && item.origin_country.includes("JP"));
    return isJapanese;
  });
};

const fetchMergedAnimation = async (req, isAnime, extraParams = {}) => {
  const { page = 1 } = req.query;
  const langParam = isAnime ? { with_original_language: "ja" } : { without_original_language: "ja" };
  
  // Separate tv and movie params to handle fields only supported by one
  const { tvExtra = {}, movieExtra = {}, ...commonExtra } = extraParams;

  const tvParams = getParams({ with_genres: "16", ...langParam, page, ...commonExtra, ...tvExtra });
  const movieParams = getParams({ with_genres: "16", ...langParam, page, ...commonExtra, ...movieExtra });
  
  const [tvRes, movieRes] = await Promise.all([
    fetchWithRetry(`${TMDB_BASE_URL}/discover/tv`, tvParams).catch(() => ({ data: { results: [] } })),
    fetchWithRetry(`${TMDB_BASE_URL}/discover/movie`, movieParams).catch(() => ({ data: { results: [] } }))
  ]);
  
  const tvItems = (tvRes.data.results || []).map(item => ({ ...item, media_type: "tv" }));
  const movieItems = (movieRes.data.results || []).map(item => ({ ...item, media_type: "movie" }));
  
  const merged = [...tvItems, ...movieItems];
  const filtered = isAnime ? filterAnime(merged) : filterCartoons(merged);
  const ageFiltered = await filterMediaList(filtered, null, req.user);
  
  // Sort based on parameters or default to popularity desc
  if (commonExtra.sort_by && commonExtra.sort_by.startsWith("vote_average")) {
    ageFiltered.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  } else if (commonExtra.sort_by && (commonExtra.sort_by.startsWith("first_air_date") || commonExtra.sort_by.startsWith("release_date"))) {
    const getVal = (x) => new Date(x.first_air_date || x.release_date || 0).getTime();
    ageFiltered.sort((a, b) => getVal(b) - getVal(a));
  } else {
    ageFiltered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }
  return ageFiltered;
};

/**
 * Helper to construct TMDB request headers/params
 */
const getParams = (extraParams = {}) => {
  return {
    params: {
      api_key: getApiKey(),
      ...extraParams,
    },
  };
};

/**
 * Helper to fetch with retries, timeout, and a small delay on failure.
 * This is the lower-level Axios caller.
 */
const axiosGetWithRetry = async (url, options = {}) => {
  const mergedOptions = {
    ...options,
    timeout: 5000 // 5 seconds request timeout
  };
  const retries = 3;
  const delayMs = 200;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, mergedOptions);
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      console.warn(
        `[Retry ${i + 1}/${retries}] Fetch failed for ${url}. Error: ${error.message}. Retrying...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

/**
 * Cache and de-dupe wrapped fetch helper
 */
const fetchWithRetry = async (url, options = {}, retries = 3, delayMs = 200) => {
  // Leverage our in-memory cache and request de-duplication layer
  return await fetchWithCacheAndDedupe(url, options, axiosGetWithRetry);
};

/**
 * Minimize response payload size by stripping out unused fields for slider lists
 */
const minimizeMediaItem = (item, defaultType = "movie") => {
  if (!item) return null;
  return {
    id: item.id,
    title: item.title,
    name: item.name,
    overview: item.overview,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    vote_average: item.vote_average,
    release_date: item.release_date,
    first_air_date: item.first_air_date,
    media_type: item.media_type || defaultType,
  };
};

const minimizeList = (list, defaultType = "movie") => {
  if (!list || !Array.isArray(list)) return [];
  return list.map(item => minimizeMediaItem(item, defaultType)).filter(Boolean);
};

/**
 * Helper to fetch minimal details for Continue Watching history items
 */
const getMediaMinimalDetails = async (id, type) => {
  if (type === "cartoon") {
    // Cartoons can be either a tv series or a movie in TMDB
    try {
      const response = await fetchWithRetry(
        `${TMDB_BASE_URL}/tv/${id}`,
        getParams()
      );
      const data = response.data;
      return {
        title: data.title,
        name: data.name,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        vote_average: data.vote_average,
      };
    } catch (err) {
      try {
        const response = await fetchWithRetry(
          `${TMDB_BASE_URL}/movie/${id}`,
          getParams()
        );
        const data = response.data;
        return {
          title: data.title,
          name: data.name,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          vote_average: data.vote_average,
        };
      } catch (innerErr) {
        console.error(`Error enriching cartoon ${id}:`, innerErr.message);
        return null;
      }
    }
  }

  const actualType = type === "anime" ? "tv" : type;
  try {
    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/${actualType}/${id}`,
      getParams()
    );
    const data = response.data;
    return {
      title: data.title,
      name: data.name,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      vote_average: data.vote_average,
    };
  } catch (err) {
    console.error(`Error enriching item ${id} (${type}):`, err.message);
    return null;
  }
};


/**
 * Helper to enrich a list of movies/shows with their logo image paths
 */
const enrichWithLogos = async (items, type) => {
  if (!items || items.length === 0) return [];
  const itemsToEnrich = items.slice(0, 6);
  const remainingItems = items.slice(6);

  const promises = itemsToEnrich.map(async (item) => {
    try {
      const response = await fetchWithRetry(
        `${TMDB_BASE_URL}/${type}/${item.id}/images`,
        getParams()
      );
      const logos = response.data.logos || [];
      // Prefer English logos first, then other logos
      const logo = logos.find((l) => l.iso_639_1 === "en") || logos[0];
      return {
        ...item,
        logoPath: logo ? logo.file_path : null,
      };
    } catch (err) {
      return { ...item, logoPath: null };
    }
  });

  const enrichedHead = await Promise.all(promises);
  return [...enrichedHead, ...remainingItems.map(item => ({ ...item, logoPath: null }))];
};

/**
 * ==========================================
 * MOVIE ENDPOINTS (Existing + Top Rated)
 * ==========================================
 */

const getPopularMovies = async (req, res) => {
  try {
    const { page } = req.query;
    if (page) {
      const response = await fetchWithRetry(`${TMDB_BASE_URL}/movie/popular`, getParams({ page, language: "en-US" }));
      const filtered = await filterMediaList(response.data.results, "movie", req.user);
      return res.json(filtered);
    }
    const page1 = await fetchWithRetry(`${TMDB_BASE_URL}/movie/popular`, getParams({ page: 1, language: "en-US" }));
    const page2 = await fetchWithRetry(`${TMDB_BASE_URL}/movie/popular`, getParams({ page: 2, language: "en-US" }));
    const page3 = await fetchWithRetry(`${TMDB_BASE_URL}/movie/popular`, getParams({ page: 3, language: "en-US" }));
    const merged = [...page1.data.results, ...page2.data.results, ...page3.data.results];
    const filtered = await filterMediaList(merged, "movie", req.user);
    const enriched = await enrichWithLogos(filtered, "movie");
    res.json(enriched);
  } catch (error) {
    console.error("Error in getPopularMovies:", error.message);
    res.status(500).json({ error: "Failed to fetch popular movies" });
  }
};

const getNowPlayingMovies = async (req, res) => {
  try {
    const { page } = req.query;
    if (page) {
      const response = await fetchWithRetry(`${TMDB_BASE_URL}/movie/now_playing`, getParams({ page, language: "en-US" }));
      const filtered = await filterMediaList(response.data.results, "movie", req.user);
      return res.json(filtered);
    }
    const page2 = await fetchWithRetry(`${TMDB_BASE_URL}/movie/now_playing`, getParams({ page: 2, language: "en-US" }));
    const page3 = await fetchWithRetry(`${TMDB_BASE_URL}/movie/now_playing`, getParams({ page: 3, language: "en-US" }));
    const page4 = await fetchWithRetry(`${TMDB_BASE_URL}/movie/now_playing`, getParams({ page: 4, language: "en-US" }));
    const merged = [...page2.data.results, ...page3.data.results, ...page4.data.results];
    const filtered = await filterMediaList(merged, "movie", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getNowPlayingMovies:", error.message);
    res.status(500).json({ error: "Failed to fetch now playing movies" });
  }
};

const getUpcomingMovies = async (req, res) => {
  try {
    const { page } = req.query;
    if (page) {
      const response = await fetchWithRetry(`${TMDB_BASE_URL}/movie/upcoming`, getParams({ page, language: "en-US" }));
      const filtered = await filterMediaList(response.data.results, "movie", req.user);
      return res.json(filtered);
    }
    const page2 = await fetchWithRetry(`${TMDB_BASE_URL}/movie/upcoming`, getParams({ page: 2, language: "hi-IN" }));
    const page1 = await fetchWithRetry(`${TMDB_BASE_URL}/movie/upcoming`, getParams({ page: 1, language: "en-US" }));
    const merged = [...page2.data.results, ...page1.data.results];
    const filtered = await filterMediaList(merged, "movie", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getUpcomingMovies:", error.message);
    res.status(500).json({ error: "Failed to fetch upcoming movies" });
  }
};

const getMovieTopRated = async (req, res) => {
  try {
    const { page } = req.query;
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/movie/top_rated`, getParams({ page, language: "en-US" }));
    const filtered = await filterMediaList(response.data.results, "movie", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getMovieTopRated:", error.message);
    res.status(500).json({ error: "Failed to fetch top rated movies" });
  }
};

const getTrendingMovies = async (req, res) => {
  try {
    const { page } = req.query;
    if (page) {
      const response = await fetchWithRetry(`${TMDB_BASE_URL}/trending/movie/week`, getParams({ page }));
      const filtered = await filterMediaList(response.data.results, "movie", { isAdult: true, safeMode: false, hideMature: false });
      return res.json(filtered);
    }
    const trendingRes = await fetchWithRetry(`${TMDB_BASE_URL}/trending/movie/week`, getParams());
    const indianRes = await fetchWithRetry(`${TMDB_BASE_URL}/discover/movie`, getParams({ with_original_language: "hi", sort_by: "popularity.desc" }));
    const merged = [...trendingRes.data.results.slice(0, 7), ...indianRes.data.results.slice(0, 3)];
    const filtered = await filterMediaList(merged, "movie", { isAdult: true, safeMode: false, hideMature: false });
    const enriched = await enrichWithLogos(filtered, "movie");
    res.json(enriched);
  } catch (error) {
    console.error("Error in getTrendingMovies:", error.message);
    res.status(500).json({ error: "Failed to fetch trending movies" });
  }
};

const getSwipeMovies = async (req, res) => {
  try {
    const indianRes = await fetchWithRetry(`${TMDB_BASE_URL}/discover/movie`, getParams({ with_original_language: "hi", sort_by: "popularity.desc" }));
    const trendingRes = await fetchWithRetry(`${TMDB_BASE_URL}/trending/movie/day`, getParams());
    const mixed = [...indianRes.data.results.slice(0, 3), ...trendingRes.data.results.slice(0, 4)];
    const filtered = await filterMediaList(mixed, "movie", req.user);
    const enriched = [];
    for (const movie of filtered) {
      try {
        const videoRes = await fetchWithRetry(`${TMDB_BASE_URL}/movie/${movie.id}/videos`, getParams());
        const imageRes = await fetchWithRetry(`${TMDB_BASE_URL}/movie/${movie.id}/images`, getParams());
        const trailer = videoRes.data.results.find((v) => v.type === "Trailer" && v.site === "YouTube");
        const logo = imageRes.data.logos?.[0];
        enriched.push({ ...movie, videoKey: trailer ? trailer.key : null, logoPath: logo ? logo.file_path : null });
      } catch (err) {
        enriched.push({ ...movie, videoKey: null, logoPath: null });
      }
    }
    res.json(enriched);
  } catch (error) {
    console.error("Error in getSwipeMovies:", error.message);
    res.status(500).json({ error: "Failed to fetch swipe movies" });
  }
};

/**
 * ==========================================
 * TV SHOW ENDPOINTS
 * ==========================================
 */

const fetchIndianTV = async (req, extraParams = {}) => {
  const { page = 1 } = req.query;
  const params = getParams({
    with_origin_country: "IN",
    page,
    ...extraParams
  });
  const response = await fetchWithRetry(`${TMDB_BASE_URL}/discover/tv`, params);
  const results = response.data.results || [];
  const filtered = await filterMediaList(results, "tv", req.user);
  return filtered;
};

const fetchTraditionalTV = async (req, extraParams = {}) => {
  const { page = 1 } = req.query;
  const params = getParams({
    without_genres: "16",
    without_networks: OTT_NETWORKS_COMMA,
    page,
    ...extraParams
  });
  const response = await fetchWithRetry(`${TMDB_BASE_URL}/discover/tv`, params);
  const results = response.data.results || [];
  const filtered = await filterMediaList(results, "tv", req.user);
  return filtered;
};

const getTVShowList = async (req, res) => {
  try {
    const { category, page = 1 } = req.query;
    let extraParams = { page };

    switch (category) {
      case "trending":
        extraParams.sort_by = "popularity.desc";
        break;
      case "popular":
        extraParams.sort_by = "popularity.desc";
        break;
      case "crime":
        extraParams.with_genres = "80";
        extraParams.with_origin_country = "IN";
        extraParams.sort_by = "popularity.desc";
        break;
      case "comedy":
        extraParams.with_genres = "35";
        extraParams.with_origin_country = "IN";
        extraParams.sort_by = "popularity.desc";
        break;
      case "reality":
        extraParams.with_genres = "10764";
        extraParams.with_origin_country = "IN";
        extraParams.sort_by = "popularity.desc";
        break;
      case "family-dramas":
        extraParams.with_genres = "18";
        extraParams.with_origin_country = "IN";
        extraParams.sort_by = "popularity.desc";
        break;
      case "daily-soaps":
        extraParams.with_genres = "10766";
        extraParams.with_origin_country = "IN";
        extraParams.sort_by = "popularity.desc";
        break;
      case "tv-classics":
        extraParams["first_air_date.lte"] = "2015-12-31";
        extraParams.sort_by = "popularity.desc";
        break;
      case "most-watched":
        try {
          const response = await fetchWithRetry(`${TMDB_BASE_URL}/trending/tv/week`, getParams({ page }));
          let results = response.data.results || [];
          results = results.filter(item => !item.genre_ids || !item.genre_ids.includes(16));
          let filtered = await filterMediaList(results, "tv", req.user);
          const ids = filtered.map(item => String(item.id));
          const cachedContents = await Content.find({ id: { $in: ids }, type: "tv" });
          const ottMap = new Map(cachedContents.map(c => [c.id, c.isOtt]));
          filtered = filtered.filter(item => !ottMap.get(String(item.id)));
          return res.json(filtered);
        } catch (error) {
          extraParams.sort_by = "popularity.desc";
        }
        break;
      default:
        extraParams.sort_by = "popularity.desc";
    }

    const results = await fetchTraditionalTV(req, extraParams);
    res.json(results);
  } catch (error) {
    console.error("Error in getTVShowList:", error.message);
    res.status(500).json({ error: "Failed to fetch TV show list" });
  }
};

const getTVTrending = async (req, res) => {
  try {
    const results = await fetchIndianTV(req, { sort_by: "popularity.desc" });
    const enriched = await enrichWithLogos(results, "tv");
    res.json(enriched);
  } catch (error) {
    console.error("Error in getTVTrending:", error.message);
    res.status(500).json({ error: "Failed to fetch trending TV shows" });
  }
};

const getTVPopular = async (req, res) => {
  try {
    const results = await fetchIndianTV(req, { sort_by: "popularity.desc" });
    const enriched = await enrichWithLogos(results, "tv");
    res.json(enriched);
  } catch (error) {
    console.error("Error in getTVPopular:", error.message);
    res.status(500).json({ error: "Failed to fetch popular TV shows" });
  }
};

const getTVTopRated = async (req, res) => {
  try {
    const results = await fetchIndianTV(req, { sort_by: "vote_average.desc", "vote_count.gte": 5 });
    res.json(results);
  } catch (error) {
    console.error("Error in getTVTopRated:", error.message);
    res.status(500).json({ error: "Failed to fetch top rated TV shows" });
  }
};

const getIndianDrama = async (req, res) => {
  try {
    const results = await fetchIndianTV(req, { with_genres: "18", sort_by: "popularity.desc" });
    res.json(results);
  } catch (error) {
    console.error("Error in getIndianDrama:", error.message);
    res.status(500).json({ error: "Failed to fetch Indian Drama shows" });
  }
};

const getIndianComedy = async (req, res) => {
  try {
    const results = await fetchIndianTV(req, { with_genres: "35", sort_by: "popularity.desc" });
    res.json(results);
  } catch (error) {
    console.error("Error in getIndianComedy:", error.message);
    res.status(500).json({ error: "Failed to fetch Indian Comedy shows" });
  }
};

const getIndianCrime = async (req, res) => {
  try {
    const results = await fetchIndianTV(req, { with_genres: "80", sort_by: "popularity.desc" });
    res.json(results);
  } catch (error) {
    console.error("Error in getIndianCrime:", error.message);
    res.status(500).json({ error: "Failed to fetch Indian Crime shows" });
  }
};

const getIndianThriller = async (req, res) => {
  try {
    const results = await fetchIndianTV(req, { with_genres: "9648", sort_by: "popularity.desc" });
    res.json(results);
  } catch (error) {
    console.error("Error in getIndianThriller:", error.message);
    res.status(500).json({ error: "Failed to fetch Indian Thriller shows" });
  }
};

const getIndianReality = async (req, res) => {
  try {
    const results = await fetchIndianTV(req, { with_genres: "10764", sort_by: "popularity.desc" });
    res.json(results);
  } catch (error) {
    console.error("Error in getIndianReality:", error.message);
    res.status(500).json({ error: "Failed to fetch Indian Reality shows" });
  }
};

const getTVHiddenGems = async (req, res) => {
  try {
    const results = await fetchIndianTV(req, {
      sort_by: "vote_average.desc",
      "vote_count.gte": 5,
      "popularity.lte": 40,
      "popularity.gte": 1
    });
    res.json(results);
  } catch (error) {
    console.error("Error in getTVHiddenGems:", error.message);
    res.status(500).json({ error: "Failed to fetch Indian TV Hidden Gems" });
  }
};

const getTrendingInternational = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const params = getParams({
      without_origin_country: "IN",
      sort_by: "popularity.desc",
      page
    });
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/discover/tv`, params);
    const results = response.data.results || [];
    const filtered = await filterMediaList(results, "tv", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getTrendingInternational:", error.message);
    res.status(500).json({ error: "Failed to fetch trending international TV shows" });
  }
};

const getTopHollywoodShows = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const params = getParams({
      with_origin_country: "US|GB",
      sort_by: "vote_average.desc",
      "vote_count.gte": 200,
      page
    });
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/discover/tv`, params);
    const results = response.data.results || [];
    const filtered = await filterMediaList(results, "tv", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getTopHollywoodShows:", error.message);
    res.status(500).json({ error: "Failed to fetch Hollywood shows" });
  }
};

const getTVOnTheAir = async (req, res) => {
  try {
    const { page } = req.query;
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/tv/on_the_air`, getParams({ page }));
    const filtered = await filterMediaList(response.data.results, "tv", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getTVOnTheAir:", error.message);
    res.status(500).json({ error: "Failed to fetch on-the-air TV shows" });
  }
};

/**
 * ==========================================
 * ANIME ENDPOINTS (TV with Genre 16)
 * ==========================================
 */

const getAnimeTrending = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, true, { sort_by: "popularity.desc" });
    const enriched = await enrichWithLogos(results, "tv");
    res.json(enriched);
  } catch (error) {
    console.error("Error in getAnimeTrending:", error.message);
    res.status(500).json({ error: "Failed to fetch trending Anime" });
  }
};

const getAnimePopular = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, true, { sort_by: "popularity.desc" });
    const enriched = await enrichWithLogos(results, "tv");
    res.json(enriched);
  } catch (error) {
    console.error("Error in getAnimePopular:", error.message);
    res.status(500).json({ error: "Failed to fetch popular Anime" });
  }
};

const getAnimeTopRated = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, true, { sort_by: "vote_average.desc", "vote_count.gte": 10 });
    res.json(results);
  } catch (error) {
    console.error("Error in getAnimeTopRated:", error.message);
    res.status(500).json({ error: "Failed to fetch top rated Anime" });
  }
};

const getAnimeHindiDub = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, true, { sort_by: "popularity.desc" });
    res.json(results);
  } catch (error) {
    console.error("Error in getAnimeHindiDub:", error.message);
    res.status(500).json({ error: "Failed to fetch Hindi dubbed Anime" });
  }
};

const getAnimeEnglishDub = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, true, { sort_by: "popularity.desc" });
    res.json(results);
  } catch (error) {
    console.error("Error in getAnimeEnglishDub:", error.message);
    res.status(500).json({ error: "Failed to fetch English dubbed Anime" });
  }
};

const getAnimeSubbed = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, true, { sort_by: "vote_average.desc", "vote_count.gte": 10 });
    res.json(results);
  } catch (error) {
    console.error("Error in getAnimeSubbed:", error.message);
    res.status(500).json({ error: "Failed to fetch subbed Anime" });
  }
};

const getAnimeHiddenGems = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, true, {
      sort_by: "vote_average.desc",
      "vote_count.gte": 5,
      "popularity.lte": 40,
      "popularity.gte": 1
    });
    res.json(results);
  } catch (error) {
    console.error("Error in getAnimeHiddenGems:", error.message);
    res.status(500).json({ error: "Failed to fetch Anime hidden gems" });
  }
};

const getAnimeEditorsPicks = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, true, {
      sort_by: "vote_average.desc",
      "vote_count.gte": 50
    });
    res.json(results);
  } catch (error) {
    console.error("Error in getAnimeEditorsPicks:", error.message);
    res.status(500).json({ error: "Failed to fetch Anime editor's picks" });
  }
};

/**
 * ==========================================
 * CARTOON ENDPOINTS (Merged TV/Movie, Exclude Japanese)
 * ==========================================
 */

const getCartoonTrending = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, false, { sort_by: "popularity.desc" });
    const enriched = await enrichWithLogos(results, "tv");
    res.json(enriched);
  } catch (error) {
    console.error("Error in getCartoonTrending:", error.message);
    res.status(500).json({ error: "Failed to fetch trending Cartoons" });
  }
};

const getCartoonPopular = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, false, { sort_by: "popularity.desc" });
    const enriched = await enrichWithLogos(results, "tv");
    res.json(enriched);
  } catch (error) {
    console.error("Error in getCartoonPopular:", error.message);
    res.status(500).json({ error: "Failed to fetch popular Cartoons" });
  }
};

const getCartoonTopRated = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, false, { sort_by: "vote_average.desc", "vote_count.gte": 10 });
    res.json(results);
  } catch (error) {
    console.error("Error in getCartoonTopRated:", error.message);
    res.status(500).json({ error: "Failed to fetch top rated Cartoons" });
  }
};

const getCartoonHindiDubbed = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, false, { with_original_language: "hi" });
    res.json(results);
  } catch (error) {
    console.error("Error in getCartoonHindiDubbed:", error.message);
    res.status(500).json({ error: "Failed to fetch Hindi dubbed Cartoons" });
  }
};

const getCartoonEnglish = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, false, { with_original_language: "en" });
    res.json(results);
  } catch (error) {
    console.error("Error in getCartoonEnglish:", error.message);
    res.status(500).json({ error: "Failed to fetch English Cartoons" });
  }
};

const getCartoonMultiAudio = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, false, { sort_by: "popularity.desc" });
    res.json(results);
  } catch (error) {
    console.error("Error in getCartoonMultiAudio:", error.message);
    res.status(500).json({ error: "Failed to fetch multi-audio Cartoons" });
  }
};

const getCartoonCollection = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, false, { sort_by: "vote_average.desc", "vote_count.gte": 50 });
    res.json(results);
  } catch (error) {
    console.error("Error in getCartoonCollection:", error.message);
    res.status(500).json({ error: "Failed to fetch Cartoon collection" });
  }
};

const getCartoonAdventure = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, false, { with_genres: "16,12" });
    res.json(results);
  } catch (error) {
    console.error("Error in getCartoonAdventure:", error.message);
    res.status(500).json({ error: "Failed to fetch adventure Cartoons" });
  }
};

const getCartoonComedy = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, false, { with_genres: "16,35" });
    res.json(results);
  } catch (error) {
    console.error("Error in getCartoonComedy:", error.message);
    res.status(500).json({ error: "Failed to fetch comedy Cartoons" });
  }
};

const getCartoonHiddenGems = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, false, {
      sort_by: "vote_average.desc",
      "vote_count.gte": 5,
      "popularity.lte": 40,
      "popularity.gte": 1
    });
    res.json(results);
  } catch (error) {
    console.error("Error in getCartoonHiddenGems:", error.message);
    res.status(500).json({ error: "Failed to fetch Cartoon hidden gems" });
  }
};

const getCartoonEditorsPicks = async (req, res) => {
  try {
    const results = await fetchMergedAnimation(req, false, {
      sort_by: "vote_average.desc",
      "vote_count.gte": 50
    });
    res.json(results);
  } catch (error) {
    console.error("Error in getCartoonEditorsPicks:", error.message);
    res.status(500).json({ error: "Failed to fetch Cartoon editor's picks" });
  }
};

/**
 * ==========================================
 * GENRES
 * ==========================================
 */

const getMovieGenres = async (req, res) => {
  try {
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/genre/movie/list`, getParams({ language: "en-US" }));
    res.json(response.data.genres);
  } catch (error) {
    console.error("Error in getMovieGenres:", error.message);
    res.status(500).json({ error: "Failed to fetch movie genres" });
  }
};

const getTVGenres = async (req, res) => {
  try {
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/genre/tv/list`, getParams({ language: "en-US" }));
    res.json(response.data.genres);
  } catch (error) {
    console.error("Error in getTVGenres:", error.message);
    res.status(500).json({ error: "Failed to fetch TV genres" });
  }
};

/**
 * ==========================================
 * DISCOVER (Filter & Pagination)
 * ==========================================
 */

const discoverMovies = async (req, res) => {
  try {
    const { genre, page = 1, ...extra } = req.query;
    const params = { page, language: "en-US", ...extra };
    if (genre) params.with_genres = genre;
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/discover/movie`, getParams(params));
    response.data.results = await filterMediaList(response.data.results, "movie", req.user);
    res.json(response.data);
  } catch (error) {
    console.error("Error in discoverMovies:", error.message);
    res.status(500).json({ error: "Failed to discover movies" });
  }
};

const discoverTV = async (req, res) => {
  try {
    const { genre, page = 1, ...extra } = req.query;
    const params = { page, language: "en-US", ...extra };
    if (genre) params.with_genres = genre;
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/discover/tv`, getParams(params));
    response.data.results = await filterMediaList(response.data.results, "tv", req.user);
    res.json(response.data);
  } catch (error) {
    console.error("Error in discoverTV:", error.message);
    res.status(500).json({ error: "Failed to discover TV shows" });
  }
};

const discoverAnime = async (req, res) => {
  try {
    const { genre, ...extra } = req.query;
    const genres = genre ? `16,${genre}` : "16";
    const results = await fetchMergedAnimation(req, true, { ...extra, with_genres: genres });
    res.json({ results });
  } catch (error) {
    console.error("Error in discoverAnime:", error.message);
    res.status(500).json({ error: "Failed to discover Anime" });
  }
};

const discoverCartoon = async (req, res) => {
  try {
    const { genre, ...extra } = req.query;
    const genres = genre ? `16,${genre}` : "16";
    const results = await fetchMergedAnimation(req, false, { ...extra, with_genres: genres });
    res.json({ results });
  } catch (error) {
    console.error("Error in discoverCartoon:", error.message);
    res.status(500).json({ error: "Failed to discover Cartoons" });
  }
};

/**
 * ==========================================
 * SEARCH (with Pagination)
 * ==========================================
 */

const searchMovies = async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    if (!query) return res.json({ results: [], total_pages: 0 });
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/search/movie`, getParams({ query: query.trim(), page, language: "en-US" }));
    response.data.results = await filterMediaList(response.data.results, "movie", req.user);
    res.json(response.data);
  } catch (error) {
    console.error("Error in searchMovies:", error.message);
    res.status(500).json({ error: "Failed to search movies" });
  }
};

const searchTV = async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    if (!query) return res.json({ results: [], total_pages: 0 });
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/search/tv`, getParams({ query: query.trim(), page, language: "en-US" }));
    let tvResults = (response.data.results || []).filter(item => !(item.genre_ids && item.genre_ids.includes(16)));
    tvResults = await filterMediaList(tvResults, "tv", req.user);
    const ids = tvResults.map(item => String(item.id));
    const cachedContents = await Content.find({ id: { $in: ids }, type: "tv" });
    const ottMap = new Map(cachedContents.map(c => [c.id, c.isOtt]));
    tvResults = tvResults.filter(item => !ottMap.get(String(item.id)));
    res.json({
      results: tvResults,
      total_pages: response.data.total_pages
    });
  } catch (error) {
    console.error("Error in searchTV:", error.message);
    res.status(500).json({ error: "Failed to search TV shows" });
  }
};

const searchWebSeries = async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    if (!query) return res.json({ results: [], total_pages: 0 });
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/search/tv`, getParams({ query: query.trim(), page, language: "en-US" }));
    let tvResults = (response.data.results || []).filter(item => !(item.genre_ids && item.genre_ids.includes(16)));
    tvResults = await filterMediaList(tvResults, "web-series", req.user);
    const ids = tvResults.map(item => String(item.id));
    const cachedContents = await Content.find({ id: { $in: ids }, type: "web-series" });
    const ottMap = new Map(cachedContents.map(c => [c.id, c.isOtt]));
    tvResults = tvResults.filter(item => ottMap.get(String(item.id)));
    res.json({
      results: tvResults,
      total_pages: response.data.total_pages
    });
  } catch (error) {
    console.error("Error in searchWebSeries:", error.message);
    res.status(500).json({ error: "Failed to search Web Series" });
  }
};

const searchAnime = async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    if (!query) return res.json({ results: [], total_pages: 0 });
    const [movieRes, tvRes] = await Promise.all([
      fetchWithRetry(`${TMDB_BASE_URL}/search/movie`, getParams({ query: query.trim(), page, language: "en-US" })).catch(() => ({ data: { results: [] } })),
      fetchWithRetry(`${TMDB_BASE_URL}/search/tv`, getParams({ query: query.trim(), page, language: "en-US" })).catch(() => ({ data: { results: [] } }))
    ]);
    const movies = (movieRes.data.results || []).map(m => ({ ...m, media_type: "movie" }));
    const tvs = (tvRes.data.results || []).map(t => ({ ...t, media_type: "tv" }));
    const merged = [...movies, ...tvs].filter(item => item.genre_ids && item.genre_ids.includes(16));
    const filtered = filterAnime(merged);
    const ageFiltered = await filterMediaList(filtered, null, req.user);
    res.json({
      results: ageFiltered,
      total_pages: Math.max(movieRes.data.total_pages || 1, tvRes.data.total_pages || 1)
    });
  } catch (error) {
    console.error("Error in searchAnime:", error.message);
    res.status(500).json({ error: "Failed to search Anime" });
  }
};

const searchCartoon = async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    if (!query) return res.json({ results: [], total_pages: 0 });
    const [movieRes, tvRes] = await Promise.all([
      fetchWithRetry(`${TMDB_BASE_URL}/search/movie`, getParams({ query: query.trim(), page, language: "en-US" })).catch(() => ({ data: { results: [] } })),
      fetchWithRetry(`${TMDB_BASE_URL}/search/tv`, getParams({ query: query.trim(), page, language: "en-US" })).catch(() => ({ data: { results: [] } }))
    ]);
    const movies = (movieRes.data.results || []).map(m => ({ ...m, media_type: "movie" }));
    const tvs = (tvRes.data.results || []).map(t => ({ ...t, media_type: "tv" }));
    const merged = [...movies, ...tvs].filter(item => item.genre_ids && item.genre_ids.includes(16));
    const filtered = filterCartoons(merged);
    const ageFiltered = await filterMediaList(filtered, null, req.user);
    res.json({
      results: ageFiltered,
      total_pages: Math.max(movieRes.data.total_pages || 1, tvRes.data.total_pages || 1)
    });
  } catch (error) {
    console.error("Error in searchCartoon:", error.message);
    res.status(500).json({ error: "Failed to search Cartoons" });
  }
};

const getCartoonDetails = async (req, res) => {
  try {
    const { id } = req.params;
    let mediaData;
    let isTv = true;
    try {
      const response = await fetchWithRetry(
        `${TMDB_BASE_URL}/tv/${id}`,
        getParams({ append_to_response: "videos,images,credits,similar,recommendations,translations", language: "en-US" })
      );
      mediaData = response.data;
    } catch (err) {
      isTv = false;
      const response = await fetchWithRetry(
        `${TMDB_BASE_URL}/movie/${id}`,
        getParams({ append_to_response: "videos,images,credits,similar,recommendations,translations", language: "en-US" })
      );
      mediaData = response.data;
    }

    const type = isTv ? "tv" : "movie";
    const rating = await getOrFetchContentRating(id, type);
    if (isAccessDenied(rating, req.user)) {
      return res.status(403).json({ error: "Age Restricted", isAdultContent: true });
    }

    // Extract available audio languages from translations
    const availableLanguages = [];
    if (mediaData.translations && mediaData.translations.translations) {
      mediaData.translations.translations.forEach((t) => {
        availableLanguages.push({
          iso_639_1: t.iso_639_1,
          iso_3166_1: t.iso_3166_1,
          name: t.name,
          english_name: t.english_name,
        });
      });
    }
    const origLang = mediaData.original_language;
    if (origLang && !availableLanguages.some((l) => l.iso_639_1 === origLang)) {
      availableLanguages.unshift({
        iso_639_1: origLang,
        iso_3166_1: "",
        name: "Original",
        english_name: "Original",
      });
    }
    mediaData.available_audio_languages = availableLanguages;

    if (mediaData.similar && mediaData.similar.results) {
      mediaData.similar.results = await filterMediaList(mediaData.similar.results, type, req.user);
    }
    if (mediaData.recommendations && mediaData.recommendations.results) {
      mediaData.recommendations.results = await filterMediaList(mediaData.recommendations.results, type, req.user);
    }

    delete mediaData.translations;
    mediaData.media_type = type;

    res.json(mediaData);
  } catch (error) {
    console.error("Error in getCartoonDetails:", error.message);
    res.status(500).json({ error: "Failed to fetch Cartoon details" });
  }
};

const getMovieDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = await getOrFetchContentRating(id, "movie");
    if (isAccessDenied(rating, req.user)) {
      return res.status(403).json({ error: "Age Restricted", isAdultContent: true });
    }

    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/movie/${id}`,
      getParams({ append_to_response: "videos,images,credits,similar,recommendations,translations", language: "en-US" })
    );

    // Extract available audio languages from translations
    const availableLanguages = [];
    if (response.data.translations && response.data.translations.translations) {
      response.data.translations.translations.forEach((t) => {
        availableLanguages.push({
          iso_639_1: t.iso_639_1,
          iso_3166_1: t.iso_3166_1,
          name: t.name,
          english_name: t.english_name,
        });
      });
    }
    // Add original language if not already present
    const origLang = response.data.original_language;
    if (origLang && !availableLanguages.some((l) => l.iso_639_1 === origLang)) {
      availableLanguages.unshift({
        iso_639_1: origLang,
        iso_3166_1: "",
        name: "Original",
        english_name: "Original",
      });
    }
    response.data.available_audio_languages = availableLanguages;

    if (response.data.similar && response.data.similar.results) {
      response.data.similar.results = await filterMediaList(response.data.similar.results, "movie", req.user);
    }
    if (response.data.recommendations && response.data.recommendations.results) {
      response.data.recommendations.results = await filterMediaList(response.data.recommendations.results, "movie", req.user);
    }

    // Clean up translations from response to reduce payload
    delete response.data.translations;

    res.json(response.data);
  } catch (error) {
    console.error("Error in getMovieDetails:", error.message);
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
};

const getTVDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = await getOrFetchContentRating(id, "tv");
    if (isAccessDenied(rating, req.user)) {
      return res.status(403).json({ error: "Age Restricted", isAdultContent: true });
    }

    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/tv/${id}`,
      getParams({ append_to_response: "videos,images,credits,similar,recommendations,translations", language: "en-US" })
    );

    // Extract available audio languages from translations
    const availableLanguages = [];
    if (response.data.translations && response.data.translations.translations) {
      response.data.translations.translations.forEach((t) => {
        availableLanguages.push({
          iso_639_1: t.iso_639_1,
          iso_3166_1: t.iso_3166_1,
          name: t.name,
          english_name: t.english_name,
        });
      });
    }
    // Add original language if not already present
    const origLang = response.data.original_language;
    if (origLang && !availableLanguages.some((l) => l.iso_639_1 === origLang)) {
      availableLanguages.unshift({
        iso_639_1: origLang,
        iso_3166_1: "",
        name: "Original",
        english_name: "Original",
      });
    }
    response.data.available_audio_languages = availableLanguages;

    if (response.data.similar && response.data.similar.results) {
      response.data.similar.results = await filterMediaList(response.data.similar.results, "tv", req.user);
    }
    if (response.data.recommendations && response.data.recommendations.results) {
      response.data.recommendations.results = await filterMediaList(response.data.recommendations.results, "tv", req.user);
    }

    // Clean up translations from response to reduce payload
    delete response.data.translations;

    res.json(response.data);
  } catch (error) {
    console.error("Error in getTVDetails:", error.message);
    res.status(500).json({ error: "Failed to fetch TV details" });
  }
};

const getTVSeasonDetails = async (req, res) => {
  try {
    const { id, season_number } = req.params;
    const rating = await getOrFetchContentRating(id, "tv");
    if (isAccessDenied(rating, req.user)) {
      return res.status(403).json({ error: "Age Restricted", isAdultContent: true });
    }

    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/tv/${id}/season/${season_number}`,
      getParams({ language: "en-US" })
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error in getTVSeasonDetails:", error.message);
    res.status(500).json({ error: "Failed to fetch TV season details" });
  }
};

const getPersonDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/person/${id}`,
      getParams({ append_to_response: "images,combined_credits", language: "en-US" })
    );

    if (response.data.combined_credits) {
      if (response.data.combined_credits.cast) {
        response.data.combined_credits.cast = await filterMediaList(response.data.combined_credits.cast, null, req.user);
      }
      if (response.data.combined_credits.crew) {
        response.data.combined_credits.crew = await filterMediaList(response.data.combined_credits.crew, null, req.user);
      }
    }

    res.json(response.data);
  } catch (error) {
    console.error("Error in getPersonDetails:", error.message);
    res.status(500).json({ error: "Failed to fetch person details" });
  }
};

const searchPerson = async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    if (!query) return res.json({ results: [], total_pages: 0 });
    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/search/person`,
      getParams({ query: query.trim(), page, language: "en-US" })
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error in searchPerson:", error.message);
    res.status(500).json({ error: "Failed to search person" });
  }
};

const getKoreanDramas = async (req, res) => {
  try {
    const { page } = req.query;
    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/tv`,
      getParams({ with_original_language: "ko", sort_by: "popularity.desc", page: page || 1 })
    );
    const filtered = await filterMediaList(response.data.results, "tv", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getKoreanDramas:", error.message);
    res.status(500).json({ error: "Failed to fetch Korean dramas" });
  }
};

const getHiddenGems = async (req, res) => {
  try {
    const { type = "movie", page = 1 } = req.query;
    let url = `${TMDB_BASE_URL}/discover/movie`;
    let params = {
      sort_by: "vote_average.desc",
      "vote_count.gte": 150,
      "popularity.lte": 55,
      "popularity.gte": 10,
      page
    };

    if (type === "tv") {
      url = `${TMDB_BASE_URL}/discover/tv`;
      params = {
        sort_by: "vote_average.desc",
        "vote_count.gte": 150,
        "popularity.lte": 55,
        "popularity.gte": 10,
        page
      };
    } else if (type === "anime") {
      url = `${TMDB_BASE_URL}/discover/tv`;
      params = {
        sort_by: "vote_average.desc",
        "vote_count.gte": 30,
        "popularity.lte": 55,
        "popularity.gte": 5,
        with_genres: "16",
        page
      };
    }

    const response = await fetchWithRetry(url, getParams(params));
    const filtered = await filterMediaList(response.data.results, type, req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getHiddenGems:", error.message);
    res.status(500).json({ error: "Failed to fetch hidden gems" });
  }
};

const getEditorsPicks = async (req, res) => {
  try {
    const { type = "movie", page = 1 } = req.query;
    let url = `${TMDB_BASE_URL}/discover/movie`;
    let params = {
      sort_by: "vote_average.desc",
      "vote_count.gte": 8000,
      page
    };

    if (type === "tv") {
      url = `${TMDB_BASE_URL}/discover/tv`;
      params = {
        sort_by: "vote_average.desc",
        "vote_count.gte": 1000,
        page
      };
    } else if (type === "anime") {
      url = `${TMDB_BASE_URL}/discover/tv`;
      params = {
        sort_by: "vote_average.desc",
        "vote_count.gte": 500,
        with_genres: "16",
        page
      };
    }

    const response = await fetchWithRetry(url, getParams(params));
    const filtered = await filterMediaList(response.data.results, type, req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getEditorsPicks:", error.message);
    res.status(500).json({ error: "Failed to fetch editor's picks" });
  }
};

const getAwardWinning = async (req, res) => {
  try {
    const { type = "movie", page = 1 } = req.query;
    let url = `${TMDB_BASE_URL}/discover/movie`;
    let params = {
      sort_by: "vote_average.desc",
      "vote_count.gte": 4000,
      "vote_average.gte": 8.0,
      page
    };

    if (type === "tv") {
      url = `${TMDB_BASE_URL}/discover/tv`;
      params = {
        sort_by: "vote_average.desc",
        "vote_count.gte": 1000,
        "vote_average.gte": 8.0,
        page
      };
    } else if (type === "anime") {
      url = `${TMDB_BASE_URL}/discover/tv`;
      params = {
        sort_by: "vote_average.desc",
        "vote_count.gte": 300,
        "vote_average.gte": 8.0,
        with_genres: "16",
        page
      };
    }

    const response = await fetchWithRetry(url, getParams(params));
    const filtered = await filterMediaList(response.data.results, type, req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getAwardWinning:", error.message);
    res.status(500).json({ error: "Failed to fetch award winning shows" });
  }
};

const getPersonalizedRecommendations = async (req, res) => {
  try {
    const { type = "movie", page = 1 } = req.query;
    // Default fallbacks: SpongeBob for cartoon/tv, Fullmetal for anime, Inception for movie
    let referenceId = type === "anime" ? "31911" : (type === "cartoon" ? "1877" : (type === "tv" ? "1399" : "27205"));
    let referenceType = type === "anime" || type === "cartoon" ? "tv" : type;

    if (req.user) {
      const User = require("../models/User.model");
      const user = await User.findById(req.user._id);
      
      const watchlistKey = type === "movie" ? "movie" : (type === "tv" ? "tv" : (type === "anime" ? "anime" : "cartoon"));
      const watchlistArray = (user.watchlist && user.watchlist[watchlistKey]) || [];
      const filteredFavs = (user.favorites || []).filter(item => item.type === type);
      const recentItem = filteredFavs[0] || watchlistArray[0];

      if (recentItem) {
        referenceId = recentItem.id;
        const isTv = !!(recentItem.first_air_date || recentItem.name || recentItem.season || recentItem.episode || recentItem.showId || recentItem.animeId);
        referenceType = isTv ? "tv" : "movie";
      }
    }

    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/${referenceType}/${referenceId}/recommendations`,
      getParams({ page })
    );
    let results = response.data.results || [];
    
    if (type === "anime") {
      results = results.filter(item => item.genre_ids && item.genre_ids.includes(16));
    } else if (type === "cartoon") {
      results = results.filter(item => {
        const isAnimation = item.genre_ids && item.genre_ids.includes(16);
        const isJapanese = item.original_language === "ja" || (item.origin_country && item.origin_country.includes("JP"));
        return isAnimation && !isJapanese;
      });
    } else if (type === "tv") {
      results = results.filter(item => !item.genre_ids || !item.genre_ids.includes(16));
    }
    let filtered = await filterMediaList(results, type, req.user);
    if (type === "tv") {
      const ids = filtered.map(item => String(item.id));
      const cachedContents = await Content.find({ id: { $in: ids }, type: "tv" });
      const ottMap = new Map(cachedContents.map(c => [c.id, c.isOtt]));
      filtered = filtered.filter(item => !ottMap.get(String(item.id)));
    }
    res.json(filtered);
  } catch (error) {
    console.error("Error in getPersonalizedRecommendations:", error.message);
    try {
      const { type = "movie", page = 1 } = req.query;
      let fallbackUrl = `${TMDB_BASE_URL}/movie/popular`;
      let fallbackParams = { page };
      if (type === "tv") {
        fallbackUrl = `${TMDB_BASE_URL}/discover/tv`;
        fallbackParams = { without_genres: "16", without_networks: OTT_NETWORKS_COMMA, page };
      } else if (type === "anime") {
        fallbackUrl = `${TMDB_BASE_URL}/discover/tv`;
        fallbackParams = { with_genres: "16", sort_by: "popularity.desc", page };
      } else if (type === "cartoon") {
        fallbackUrl = `${TMDB_BASE_URL}/discover/tv`;
        fallbackParams = { with_genres: "16", without_original_language: "ja", sort_by: "popularity.desc", page };
      }
      const fallback = await fetchWithRetry(fallbackUrl, getParams(fallbackParams));
      let filteredFallback = await filterMediaList(fallback.data.results, type, req.user);
      if (type === "tv") {
        const ids = filteredFallback.map(item => String(item.id));
        const cachedContents = await Content.find({ id: { $in: ids }, type: "tv" });
        const ottMap = new Map(cachedContents.map(c => [c.id, c.isOtt]));
        filteredFallback = filteredFallback.filter(item => !ottMap.get(String(item.id)));
      }
      res.json(filteredFallback);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  }
};

const getBecauseYouWatched = async (req, res) => {
  try {
    const { type = "movie", page = 1 } = req.query;
    // Default fallbacks: SpongeBob for cartoon/tv, Fullmetal for anime, Inception for movie
    let referenceId = type === "anime" ? "31911" : (type === "cartoon" ? "1877" : (type === "tv" ? "1399" : "27205"));
    let referenceType = type === "anime" || type === "cartoon" ? "tv" : type;
    let title = type === "anime" ? "Fullmetal Alchemist: Brotherhood" : (type === "cartoon" ? "SpongeBob SquarePants" : (type === "tv" ? "Game of Thrones" : "Inception"));

    if (req.user) {
      const User = require("../models/User.model");
      const user = await User.findById(req.user._id);
      const continueKey = type === "movie" ? "movie" : (type === "tv" ? "tv" : (type === "anime" ? "anime" : "cartoon"));
      const continueArray = (user && user.continueWatching && user.continueWatching[continueKey]) || [];
      
      if (continueArray.length > 0) {
        const recent = continueArray[0];
        if (recent) {
          referenceId = recent.movieId || recent.showId || recent.animeId || recent.id;
          const isTv = !!(recent.season || recent.episode || recent.showId || recent.animeId || type === "tv" || type === "anime");
          referenceType = isTv ? "tv" : "movie";
          title = recent.title || recent.name || "your last watched item";
        }
      }
    }

    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/${referenceType}/${referenceId}/recommendations`,
      getParams({ page })
    );
    let results = response.data.results || [];
    
    if (type === "anime") {
      results = results.filter(item => item.genre_ids && item.genre_ids.includes(16));
    } else if (type === "cartoon") {
      results = results.filter(item => {
        const isAnimation = item.genre_ids && item.genre_ids.includes(16);
        const isJapanese = item.original_language === "ja" || (item.origin_country && item.origin_country.includes("JP"));
        return isAnimation && !isJapanese;
      });
    } else if (type === "tv") {
      results = results.filter(item => !item.genre_ids || !item.genre_ids.includes(16));
    }
    let filtered = await filterMediaList(results, type, req.user);
    if (type === "tv") {
      const ids = filtered.map(item => String(item.id));
      const cachedContents = await Content.find({ id: { $in: ids }, type: "tv" });
      const ottMap = new Map(cachedContents.map(c => [c.id, c.isOtt]));
      filtered = filtered.filter(item => !ottMap.get(String(item.id)));
    }
    res.json({
      sourceTitle: title,
      results: filtered
    });
  } catch (error) {
    console.error("Error in getBecauseYouWatched:", error.message);
    const { type = "movie" } = req.query;
    let title = type === "anime" ? "Fullmetal Alchemist: Brotherhood" : (type === "cartoon" ? "SpongeBob SquarePants" : (type === "tv" ? "Taarak Mehta Ka Ooltah Chashmah" : "Inception"));
    res.json({
      sourceTitle: title,
      results: []
    });
  }
};

const getAnimeAiringNow = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/tv`,
      getParams({
        with_genres: "16",
        sort_by: "popularity.desc",
        "air_date.gte": new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        "air_date.lte": new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        page
      })
    );
    const filtered = await filterMediaList(response.data.results, "anime", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getAnimeAiringNow:", error.message);
    res.status(500).json({ error: "Failed to fetch airing now anime" });
  }
};

const getAnimeUpcoming = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/tv`,
      getParams({
        with_genres: "16",
        sort_by: "first_air_date.asc",
        "first_air_date.gte": new Date().toISOString().split("T")[0],
        page
      })
    );
    const filtered = await filterMediaList(response.data.results, "anime", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getAnimeUpcoming:", error.message);
    res.status(500).json({ error: "Failed to fetch upcoming anime" });
  }
};

const getPopularPersons = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/person/popular`, getParams({ page, language: "en-US" }));
    res.json(response.data.results);
  } catch (error) {
    console.error("Error in getPopularPersons:", error.message);
    res.status(500).json({ error: "Failed to fetch popular persons" });
  }
};

const getTVNewEpisodes = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const response = await fetchWithRetry(`${TMDB_BASE_URL}/tv/airing_today`, getParams({ page }));
    const filtered = await filterMediaList(response.data.results, "tv", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getTVNewEpisodes:", error.message);
    res.status(500).json({ error: "Failed to fetch new episodes" });
  }
};

const getAnimeNewlyAdded = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/tv`,
      getParams({
        with_genres: "16",
        sort_by: "first_air_date.desc",
        page
      })
    );
    const filtered = await filterMediaList(response.data.results, "anime", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getAnimeNewlyAdded:", error.message);
    res.status(500).json({ error: "Failed to fetch newly added anime" });
  }
};

const getAnimeCollection = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/tv`,
      getParams({
        with_genres: "16",
        sort_by: "vote_average.desc",
        "vote_count.gte": 100,
        page
      })
    );
    const filtered = await filterMediaList(response.data.results, "anime", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getAnimeCollection:", error.message);
    res.status(500).json({ error: "Failed to fetch anime collection" });
  }
};

const getSecureMoviePlayerUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { color, progress, audio, autoplay, server } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Movie ID is required" });
    }

    const rating = await getOrFetchContentRating(id, "movie");
    if (isAccessDenied(rating, req.user)) {
      return res.status(403).json({ error: "Access denied. This content is age restricted.", isAdultContent: true });
    }

    let playerUrl;
    if (server === "vidsrc") {
      playerUrl = `https://vidsrc.to/embed/movie/${id}`;
    } else if (server === "vidlink") {
      playerUrl = `https://vidlink.pro/embed/movie/${id}`;
    } else {
      const baseUrl = process.env.VIDKING_BASE_URL || "https://www.vidking.net";
      const queryParams = new URLSearchParams();
      if (color) queryParams.append("color", color);
      if (progress) queryParams.append("progress", progress);
      if (audio && audio !== "original") queryParams.append("audio", audio);
      if (autoplay) queryParams.append("autoplay", autoplay);
      const queryString = queryParams.toString();
      playerUrl = `${baseUrl}/embed/movie/${id}${queryString ? `?${queryString}` : ""}`;
    }

    res.json({ playerUrl });
  } catch (error) {
    console.error("Error in getSecureMoviePlayerUrl:", error.message);
    res.status(500).json({ error: "Failed to generate movie player URL" });
  }
};

const getSecureTVPlayerUrl = async (req, res) => {
  try {
    const { id, season, episode } = req.params;
    const { color, progress, nextEpisode, episodeSelector, audio, autoplay, server } = req.query;

    if (!id || !season || !episode) {
      return res.status(400).json({ error: "Show ID, season, and episode are required" });
    }

    const rating = await getOrFetchContentRating(id, "tv");
    if (isAccessDenied(rating, req.user)) {
      return res.status(403).json({ error: "Access denied. This content is age restricted.", isAdultContent: true });
    }

    let playerUrl;
    if (server === "vidsrc") {
      playerUrl = `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`;
    } else if (server === "vidlink") {
      playerUrl = `https://vidlink.pro/embed/tv/${id}/${season}/${episode}`;
    } else {
      const baseUrl = process.env.VIDKING_BASE_URL || "https://www.vidking.net";
      const queryParams = new URLSearchParams();
      if (color) queryParams.append("color", color);
      if (progress) queryParams.append("progress", progress);
      if (nextEpisode) queryParams.append("nextEpisode", nextEpisode);
      if (episodeSelector) queryParams.append("episodeSelector", episodeSelector);
      if (audio && audio !== "original") queryParams.append("audio", audio);
      if (autoplay) queryParams.append("autoplay", autoplay);
      const queryString = queryParams.toString();
      playerUrl = `${baseUrl}/embed/tv/${id}/${season}/${episode}${queryString ? `?${queryString}` : ""}`;
    }

    res.json({ playerUrl });
  } catch (error) {
    console.error("Error in getSecureTVPlayerUrl:", error.message);
    res.status(500).json({ error: "Failed to generate TV player URL" });
  }
};

const getAvailableLanguages = async (req, res) => {
  try {
    const { type, id } = req.params;
    const actualType = (type === "anime" || type === "web-series" || type === "webSeries") ? "tv" : type;

    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/${actualType}/${id}/translations`,
      getParams()
    );

    const languages = [];
    if (response.data.translations) {
      response.data.translations.forEach((t) => {
        languages.push({
          iso_639_1: t.iso_639_1,
          iso_3166_1: t.iso_3166_1,
          name: t.name,
          english_name: t.english_name,
        });
      });
    }

    // Also fetch the original language from the media details
    const detailResponse = await fetchWithRetry(
      `${TMDB_BASE_URL}/${actualType}/${id}`,
      getParams()
    );
    const origLang = detailResponse.data.original_language;
    if (origLang && !languages.some((l) => l.iso_639_1 === origLang)) {
      languages.unshift({
        iso_639_1: origLang,
        iso_3166_1: "",
        name: "Original",
        english_name: "Original",
      });
    }

    res.json({ languages });
  } catch (error) {
    console.error("Error in getAvailableLanguages:", error.message);
    res.status(500).json({ error: "Failed to fetch available languages" });
  }
};

const getBollywoodMovies = async (req, res) => {
  try {
    const { page } = req.query;
    if (page) {
      const response = await fetchWithRetry(
        `${TMDB_BASE_URL}/discover/movie`,
        getParams({ with_original_language: "hi", sort_by: "popularity.desc", page })
      );
      const filtered = await filterMediaList(response.data.results, "movie", req.user);
      return res.json(filtered);
    }
    const page1 = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie`,
      getParams({ with_original_language: "hi", sort_by: "popularity.desc", page: 1 })
    );
    const page2 = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie`,
      getParams({ with_original_language: "hi", sort_by: "popularity.desc", page: 2 })
    );
    const merged = [...page1.data.results, ...page2.data.results];
    const filtered = await filterMediaList(merged, "movie", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getBollywoodMovies:", error.message);
    res.status(500).json({ error: "Failed to fetch Bollywood movies" });
  }
};

const getTollywoodMovies = async (req, res) => {
  try {
    const { page } = req.query;
    if (page) {
      const teluguPage = await fetchWithRetry(
        `${TMDB_BASE_URL}/discover/movie`,
        getParams({ with_original_language: "te", sort_by: "popularity.desc", page })
      );
      const tamilPage = await fetchWithRetry(
        `${TMDB_BASE_URL}/discover/movie`,
        getParams({ with_original_language: "ta", sort_by: "popularity.desc", page })
      );
      const merged = [];
      const len = Math.max(teluguPage.data.results.length, tamilPage.data.results.length);
      for (let i = 0; i < len; i++) {
        if (teluguPage.data.results[i]) merged.push(teluguPage.data.results[i]);
        if (tamilPage.data.results[i]) merged.push(tamilPage.data.results[i]);
      }
      const filtered = await filterMediaList(merged, "movie", req.user);
      return res.json(filtered);
    }
    const teluguPage1 = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie`,
      getParams({ with_original_language: "te", sort_by: "popularity.desc", page: 1 })
    );
    const tamilPage1 = await fetchWithRetry(
      `${TMDB_BASE_URL}/discover/movie`,
      getParams({ with_original_language: "ta", sort_by: "popularity.desc", page: 1 })
    );
    const merged = [];
    const len = Math.max(teluguPage1.data.results.length, tamilPage1.data.results.length);
    for (let i = 0; i < len; i++) {
      if (teluguPage1.data.results[i]) merged.push(teluguPage1.data.results[i]);
      if (tamilPage1.data.results[i]) merged.push(tamilPage1.data.results[i]);
    }
    const filtered = await filterMediaList(merged, "movie", req.user);
    res.json(filtered);
  } catch (error) {
    console.error("Error in getTollywoodMovies:", error.message);
    res.status(500).json({ error: "Failed to fetch Tollywood movies" });
  }
};

const fetchWebSeries = async (req, extraParams = {}) => {
  const { page = 1 } = req.query;
  const params = getParams({
    without_genres: "16",
    with_networks: OTT_NETWORKS,
    page,
    ...extraParams
  });
  const response = await fetchWithRetry(`${TMDB_BASE_URL}/discover/tv`, params);
  const results = response.data.results || [];
  const filtered = await filterMediaList(results, "web-series", req.user);
  return filtered;
};

const getWebSeriesList = async (req, res) => {
  try {
    const { category, page = 1, genre, language, country, year, rating } = req.query;
    
    let extraParams = { page };
    
    if (genre) extraParams.with_genres = genre;
    if (language) extraParams.with_original_language = language;
    if (country) extraParams.with_origin_country = country;
    if (year) extraParams.first_air_date_year = year;
    if (rating) extraParams["vote_average.gte"] = rating;

    switch (category) {
      case "trending":
        extraParams.sort_by = "popularity.desc";
        break;
      case "popular":
        extraParams.sort_by = "popularity.desc";
        break;
      case "top-rated":
        extraParams.sort_by = "vote_average.desc";
        extraParams["vote_count.gte"] = 100;
        break;
      case "new-releases":
        extraParams.sort_by = "first_air_date.desc";
        extraParams["first_air_date.lte"] = new Date().toISOString().split("T")[0];
        break;
      case "most-watched":
        try {
          const response = await fetchWithRetry(`${TMDB_BASE_URL}/trending/tv/week`, getParams({ page }));
          let results = response.data.results || [];
          results = results.filter(item => !item.genre_ids || !item.genre_ids.includes(16));
          let filtered = await filterMediaList(results, "web-series", req.user);
          const ids = filtered.map(item => String(item.id));
          const cachedContents = await Content.find({ id: { $in: ids }, type: "web-series" });
          const ottMap = new Map(cachedContents.map(c => [c.id, c.isOtt]));
          filtered = filtered.filter(item => ottMap.get(String(item.id)));
          return res.json(filtered);
        } catch (error) {
          extraParams.sort_by = "popularity.desc";
        }
        break;
      case "award-winning":
        extraParams.sort_by = "popularity.desc";
        extraParams["vote_count.gte"] = 500;
        extraParams["vote_average.gte"] = 8.0;
        break;
      case "hidden-gems":
        extraParams.sort_by = "vote_average.desc";
        extraParams["vote_count.gte"] = 50;
        extraParams["vote_count.lte"] = 600;
        extraParams["vote_average.gte"] = 7.5;
        break;
      case "editors-picks":
        extraParams.sort_by = "popularity.desc";
        extraParams.with_networks = "213|49|2552|1024";
        break;
      case "recently-added":
        extraParams.sort_by = "first_air_date.desc";
        break;
      case "binge-worthy":
        extraParams.sort_by = "popularity.desc";
        extraParams["vote_average.gte"] = 7.8;
        break;
      case "completed":
        extraParams.with_status = "3,4";
        break;
      case "ongoing":
        extraParams.with_status = "0,2,5";
        break;
      case "mini-series":
        extraParams.with_type = "3";
        break;
      case "international":
        extraParams.without_origin_country = "IN";
        break;
      case "indian":
        extraParams.with_origin_country = "IN";
        break;
      case "crime":
        extraParams.with_genres = genre ? `80,${genre}` : "80";
        break;
      case "thriller":
        extraParams.with_genres = genre ? `9648,18,${genre}` : "9648,18";
        break;
      case "comedy":
        extraParams.with_genres = genre ? `35,${genre}` : "35";
        break;
      case "action":
        extraParams.with_genres = genre ? `10759,${genre}` : "10759";
        break;
      case "drama":
        extraParams.with_genres = genre ? `18,${genre}` : "18";
        break;
      case "mystery":
        extraParams.with_genres = genre ? `9648,${genre}` : "9648";
        break;
      default:
        extraParams.sort_by = "popularity.desc";
    }

    const results = await fetchWebSeries(req, extraParams);
    res.json(results);
  } catch (error) {
    console.error("Error in getWebSeriesList:", error.message);
    res.status(500).json({ error: "Failed to fetch web series list" });
  }
};

const getWebSeriesRecommendations = async (req, res) => {
  try {
    const { page = 1 } = req.query;
    let referenceId = "1399";
    let referenceType = "tv";

    if (req.user) {
      const User = require("../models/User.model");
      const user = await User.findById(req.user._id);

      const watchlistArray = (user.watchlist && user.watchlist.webSeries) || [];
      const continueWatchingArray = (user.continueWatching && user.continueWatching.webSeries) || [];
      const filteredFavs = (user.favorites || []).filter(item => item.type === "web-series");
      
      const recentItem = continueWatchingArray[0] || watchlistArray[0] || filteredFavs[0];

      if (recentItem) {
        referenceId = recentItem.id;
        referenceType = "tv";
      } else {
        const params = {
          without_genres: "16",
          with_networks: OTT_NETWORKS,
          page,
          sort_by: "popularity.desc"
        };
        if (user.country && user.country !== "Unknown") {
          params.with_origin_country = user.country;
        }
        if (user.preferences?.language) {
          params.with_original_language = user.preferences.language;
        }
        const response = await fetchWithRetry(`${TMDB_BASE_URL}/discover/tv`, getParams(params));
        const filtered = await filterMediaList(response.data.results, "web-series", req.user);
        return res.json(filtered);
      }
    }

    const response = await fetchWithRetry(
      `${TMDB_BASE_URL}/${referenceType}/${referenceId}/recommendations`,
      getParams({ page })
    );
    let results = response.data.results || [];
    results = results.filter(item => !item.genre_ids || !item.genre_ids.includes(16));
    let filtered = await filterMediaList(results, "web-series", req.user);
    const ids = filtered.map(item => String(item.id));
    const cachedContents = await Content.find({ id: { $in: ids }, type: "web-series" });
    const ottMap = new Map(cachedContents.map(c => [c.id, c.isOtt]));
    filtered = filtered.filter(item => ottMap.get(String(item.id)));
    res.json(filtered);
  } catch (error) {
    console.error("Error in getWebSeriesRecommendations:", error.message);
    try {
      const response = await fetchWithRetry(`${TMDB_BASE_URL}/discover/tv`, getParams({
        without_genres: "16",
        with_networks: OTT_NETWORKS,
        sort_by: "popularity.desc",
        page: req.query.page || 1
      }));
      const filtered = await filterMediaList(response.data.results, "web-series", req.user);
      res.json(filtered);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  }
};

module.exports = {
  getBollywoodMovies,
  getTollywoodMovies,
  // Web Series
  getWebSeriesList,
  getWebSeriesRecommendations,
  // Movies
  getPopularMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getMovieTopRated,
  getTrendingMovies,
  getSwipeMovies,
  getMovieDetails,
  discoverMovies,
  searchMovies,
  getMovieGenres,
  // TV Shows
  getTVTrending,
  getTVPopular,
  getTVTopRated,
  getTVOnTheAir,
  getTVDetails,
  discoverTV,
  searchTV,
  searchWebSeries,
  getTVShowList,
  getTVGenres,
  // Indian TV Custom categories
  getIndianDrama,
  getIndianComedy,
  getIndianCrime,
  getIndianThriller,
  getIndianReality,
  getTVHiddenGems,
  getTrendingInternational,
  getTopHollywoodShows,
  // Anime
  getAnimeTrending,
  getAnimePopular,
  getAnimeTopRated,
  discoverAnime,
  searchAnime,
  getAnimeHindiDub,
  getAnimeEnglishDub,
  getAnimeSubbed,
  getAnimeHiddenGems,
  getAnimeEditorsPicks,
  // Cartoons
  getCartoonTrending,
  getCartoonPopular,
  getCartoonTopRated,
  getCartoonHindiDubbed,
  getCartoonEnglish,
  getCartoonMultiAudio,
  getCartoonCollection,
  getCartoonAdventure,
  getCartoonComedy,
  getCartoonHiddenGems,
  getCartoonEditorsPicks,
  discoverCartoon,
  searchCartoon,
  getCartoonDetails,
  // New Endpoints
  getTVSeasonDetails,
  getPersonDetails,
  searchPerson,
  // Brand New Homepage Endpoints
  getKoreanDramas,
  getHiddenGems,
  getEditorsPicks,
  getAwardWinning,
  getPersonalizedRecommendations,
  getBecauseYouWatched,
  // Content-Aware Additional Endpoints
  getAnimeAiringNow,
  getAnimeUpcoming,
  getPopularPersons,
  getTVNewEpisodes,
  getAnimeNewlyAdded,
  getAnimeCollection,
  // Secure Player Endpoints
  getSecureMoviePlayerUrl,
  getSecureTVPlayerUrl,
  // Audio Languages
  getAvailableLanguages,
  getMediaMinimalDetails,
  minimizeList,
};
