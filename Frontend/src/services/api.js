import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api/movies`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export const authClient = axios.create({
  baseURL: `${BACKEND_URL}/api/auth`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Attach Bearer token from localStorage to every request (fallback for cross-domain where cookies fail)
const attachToken = (config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

apiClient.interceptors.request.use(attachToken);
authClient.interceptors.request.use(attachToken);

/**
 * ==========================================
 * MOVIE METHODS
 * ==========================================
 */

export const getPopularMovies = async (page) => {
  const response = await apiClient.get("/popular", { params: { page } });
  return response.data;
};

export const getNowPlayingMovies = async (page) => {
  const response = await apiClient.get("/now-playing", { params: { page } });
  return response.data;
};

export const getUpcomingMovies = async (page) => {
  const response = await apiClient.get("/upcoming", { params: { page } });
  return response.data;
};

export const getMovieTopRated = async (page) => {
  const response = await apiClient.get("/movie/top-rated", { params: { page } });
  return response.data;
};

export const getTrendingMovies = async (page) => {
  const response = await apiClient.get("/trending", { params: { page } });
  return response.data;
};

export const getSwipeMovies = async () => {
  const response = await apiClient.get("/swipe");
  return response.data;
};

export const getKoreanDramas = async (page) => {
  const response = await apiClient.get("/k-dramas", { params: { page } });
  return response.data;
};

export const getBollywoodMovies = async (page) => {
  const response = await apiClient.get("/bollywood", { params: { page } });
  return response.data;
};

export const getTollywoodMovies = async (page) => {
  const response = await apiClient.get("/tollywood", { params: { page } });
  return response.data;
};

export const getHiddenGems = async (type = "movie", page) => {
  const response = await apiClient.get(`/hidden-gems`, { params: { type, page } });
  return response.data;
};

export const getEditorsPicks = async (type = "movie", page) => {
  const response = await apiClient.get(`/editors-picks`, { params: { type, page } });
  return response.data;
};

export const getAwardWinning = async (type = "movie", page) => {
  const response = await apiClient.get(`/award-winning`, { params: { type, page } });
  return response.data;
};

export const getPersonalizedRecommendations = async (type = "movie", page) => {
  const response = await apiClient.get(`/recommendations`, { params: { type, page } });
  return response.data;
};

export const getBecauseYouWatched = async (type = "movie", page) => {
  const response = await apiClient.get(`/because-you-watched`, { params: { type, page } });
  return response.data;
};

/**
 * ==========================================
 * TV SHOW METHODS
 * ==========================================
 */

/**
 * ==========================================
 * TV SHOW METHODS
 * ==========================================
 */

export const getTVTrending = async (page) => {
  const response = await apiClient.get("/tv/trending", { params: { page } });
  return response.data;
};

export const getTVPopular = async (page) => {
  const response = await apiClient.get("/tv/popular", { params: { page } });
  return response.data;
};

export const getTVTopRated = async (page) => {
  const response = await apiClient.get("/tv/top-rated", { params: { page } });
  return response.data;
};

export const getTVOnTheAir = async (page) => {
  const response = await apiClient.get("/tv/on-the-air", { params: { page } });
  return response.data;
};

export const getTVNewEpisodes = async (page) => {
  const response = await apiClient.get("/tv/new-episodes", { params: { page } });
  return response.data;
};

export const getTVDrama = async (page) => {
  const response = await apiClient.get("/tv/drama", { params: { page } });
  return response.data;
};

export const getTVComedy = async (page) => {
  const response = await apiClient.get("/tv/comedy", { params: { page } });
  return response.data;
};

export const getTVCrime = async (page) => {
  const response = await apiClient.get("/tv/crime", { params: { page } });
  return response.data;
};

export const getTVThriller = async (page) => {
  const response = await apiClient.get("/tv/thriller", { params: { page } });
  return response.data;
};

export const getTVReality = async (page) => {
  const response = await apiClient.get("/tv/reality", { params: { page } });
  return response.data;
};

export const getTVHiddenGems = async (page) => {
  const response = await apiClient.get("/tv/hidden-gems", { params: { page } });
  return response.data;
};

export const getTVTrendingInternational = async (page) => {
  const response = await apiClient.get("/tv/trending-international", { params: { page } });
  return response.data;
};

export const getTVHollywood = async (page) => {
  const response = await apiClient.get("/tv/hollywood", { params: { page } });
  return response.data;
};

/**
 * ==========================================
 * CARTOON METHODS
 * ==========================================
 */

export const getCartoonTrending = async (page) => {
  const response = await apiClient.get("/cartoon/trending", { params: { page } });
  return response.data;
};

export const getCartoonPopular = async (page) => {
  const response = await apiClient.get("/cartoon/popular", { params: { page } });
  return response.data;
};

export const getCartoonTopRated = async (page) => {
  const response = await apiClient.get("/cartoon/top-rated", { params: { page } });
  return response.data;
};

export const getCartoonHindiDubbed = async (page) => {
  const response = await apiClient.get("/cartoon/hindi-dubbed", { params: { page } });
  return response.data;
};

export const getCartoonEnglish = async (page) => {
  const response = await apiClient.get("/cartoon/english", { params: { page } });
  return response.data;
};

export const getCartoonMultiAudio = async (page) => {
  const response = await apiClient.get("/cartoon/multi-audio", { params: { page } });
  return response.data;
};

export const getCartoonCollection = async (page) => {
  const response = await apiClient.get("/cartoon/collection", { params: { page } });
  return response.data;
};

export const getCartoonAdventure = async (page) => {
  const response = await apiClient.get("/cartoon/adventure", { params: { page } });
  return response.data;
};

export const getCartoonComedy = async (page) => {
  const response = await apiClient.get("/cartoon/comedy", { params: { page } });
  return response.data;
};

export const getCartoonHiddenGems = async (page) => {
  const response = await apiClient.get("/cartoon/hidden-gems", { params: { page } });
  return response.data;
};

export const getCartoonEditorsPicks = async (page) => {
  const response = await apiClient.get("/cartoon/editors-picks", { params: { page } });
  return response.data;
};

/**
 * ==========================================
 * ANIME METHODS
 * ==========================================
 */

export const getAnimeTrending = async (page) => {
  const response = await apiClient.get("/anime/trending", { params: { page } });
  return response.data;
};

export const getAnimePopular = async (page) => {
  const response = await apiClient.get("/anime/popular", { params: { page } });
  return response.data;
};

export const getAnimeTopRated = async (page) => {
  const response = await apiClient.get("/anime/top-rated", { params: { page } });
  return response.data;
};

export const getAnimeAiringNow = async (page) => {
  const response = await apiClient.get("/anime/airing-now", { params: { page } });
  return response.data;
};

export const getAnimeUpcoming = async (page) => {
  const response = await apiClient.get("/anime/upcoming", { params: { page } });
  return response.data;
};

export const getAnimeNewlyAdded = async (page) => {
  const response = await apiClient.get("/anime/newly-added", { params: { page } });
  return response.data;
};

export const getAnimeCollection = async (page) => {
  const response = await apiClient.get("/anime/collection", { params: { page } });
  return response.data;
};

export const getAnimeHindiDub = async (page) => {
  const response = await apiClient.get("/anime/hindi-dub", { params: { page } });
  return response.data;
};

export const getAnimeEnglishDub = async (page) => {
  const response = await apiClient.get("/anime/english-dub", { params: { page } });
  return response.data;
};

export const getAnimeSubbed = async (page) => {
  const response = await apiClient.get("/anime/subbed", { params: { page } });
  return response.data;
};

export const getAnimeHiddenGems = async (page) => {
  const response = await apiClient.get("/anime/hidden-gems", { params: { page } });
  return response.data;
};

export const getAnimeEditorsPicks = async (page) => {
  const response = await apiClient.get("/anime/editors-picks", { params: { page } });
  return response.data;
};

export const getPopularPersons = async () => {
  const response = await apiClient.get("/person/popular");
  return response.data;
};

/**
 * ==========================================
 * GENRES
 * ==========================================
 */

export const getGenres = async (type) => {
  const response = await apiClient.get(`/genres/${type}`);
  return response.data;
};

/**
 * ==========================================
 * DISCOVER & PAGINATION
 * ==========================================
 */

export const discoverMedia = async (type, genreId = "", page = 1, extraParams = {}) => {
  const response = await apiClient.get(`/discover/${type}`, {
    params: { genre: genreId, page, ...extraParams },
  });
  return response.data;
};

/**
 * ==========================================
 * SEARCH
 * ==========================================
 */

export const searchMedia = async (type, query, page = 1) => {
  const response = await apiClient.get(`/search/${type}`, {
    params: { query, page },
  });
  return response.data;
};

/**
 * ==========================================
 * DETAILS
 * ==========================================
 */

export const getMediaDetails = async (type, id) => {
  // If the type is anime or web series, we query tv details in TMDB
  const actualType = (type === "anime" || type === "web-series" || type === "webSeries") ? "tv" : type;
  const response = await apiClient.get(`/detail/${actualType}/${id}`);
  return response.data;
};

export const getSecurePlayerUrl = async (type, tmdbId, params = {}) => {
  const actualType = (type === "anime" || type === "web-series" || type === "webSeries") ? "tv" : type;
  const path = actualType === "movie"
    ? `/embed/movie/${tmdbId}`
    : `/embed/tv/${tmdbId}/${params.season || 1}/${params.episode || 1}`;
  
  const response = await apiClient.get(path, { params });
  return response.data;
};

export const getAvailableLanguages = async (type, id) => {
  const response = await apiClient.get(`/languages/${type}/${id}`);
  return response.data;
};

export const updatePlaybackPreferences = async (preferences) => {
  const response = await authClient.put("/profile", { preferences });
  return response.data;
};

export const getPersonDetails = async (id) => {
  const response = await apiClient.get(`/detail/person/${id}`);
  return response.data;
};

export const getTVSeasonDetails = async (id, seasonNumber) => {
  const response = await apiClient.get(`/detail/tv/${id}/season/${seasonNumber}`);
  return response.data;
};

/**
 * ==========================================
 * AUTHENTICATION & USER METHODS
 * ==========================================
 */

export const signupUser = async (data) => {
  const response = await authClient.post("/signup", data);
  return response.data;
};

export const loginUser = async (data) => {
  const response = await authClient.post("/login", data);
  return response.data;
};

export const googleLoginUser = async (credential) => {
  const response = await authClient.post("/google", { credential });
  return response.data;
};

export const logoutUser = async () => {
  const response = await authClient.post("/logout");
  return response.data;
};

export const getUserProfile = async () => {
  const response = await authClient.get("/profile");
  return response.data;
};

export const updateUserProfile = async (data) => {
  const response = await authClient.put("/profile", data);
  return response.data;
};

export const toggleFavoriteApi = async (media) => {
  const response = await authClient.post("/favorites/toggle", media);
  return response.data;
};

export const toggleWatchlistApi = async (media) => {
  const response = await authClient.post("/watchlist/toggle", media);
  return response.data;
};

export const addContinueWatchingApi = async (media) => {
  const response = await authClient.post("/continue-watching", media);
  return response.data;
};

export const removeContinueWatchingApi = async (media) => {
  const response = await authClient.post("/continue-watching/remove", media);
  return response.data;
};

export const adminClient = axios.create({
  baseURL: `${BACKEND_URL}/api/admin`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

adminClient.interceptors.request.use(attachToken);

/**
 * ==========================================
 * ADMIN DASHBOARD METHODS
 * ==========================================
 */

export const getDashboardStatsApi = async () => {
  const response = await adminClient.get("/dashboard-stats");
  return response.data;
};

export const getUsersListApi = async (params) => {
  const response = await adminClient.get("/users-list", { params });
  return response.data;
};

export const getAnalyticsGrowthApi = async (params) => {
  const response = await adminClient.get("/analytics-growth", { params });
  return response.data;
};

export const getContentInsightsApi = async () => {
  const response = await adminClient.get("/content-insights");
  return response.data;
};

export const getPlayerWatchApi = async () => {
  const response = await adminClient.get("/player-watch");
  return response.data;
};

export const getLiveActivityApi = async () => {
  const response = await adminClient.get("/live-activity");
  return response.data;
};

export const toggleTrafficSimulatorApi = async (active) => {
  const response = await adminClient.post("/simulate-traffic", { active });
  return response.data;
};

export const resetAnalyticsDataApi = async () => {
  const response = await adminClient.post("/reset-analytics");
  return response.data;
};

export const promoteUserToAdminApi = async (email) => {
  const response = await adminClient.post("/promote", { email });
  return response.data;
};

export const toggleUserPremiumApi = async (userId) => {
  const response = await adminClient.post("/toggle-premium", { userId });
  return response.data;
};

export const getUserDetailsApi = async (userId) => {
  const response = await adminClient.get(`/users/${userId}`);
  return response.data;
};

export const updateUserDetailsApi = async (userId, userData) => {
  const response = await adminClient.put(`/users/${userId}`, userData);
  return response.data;
};

export const toggleUserSuspensionApi = async (userId) => {
  const response = await adminClient.put(`/users/${userId}/suspend`);
  return response.data;
};

export const deleteUserApi = async (userId) => {
  const response = await adminClient.delete(`/users/${userId}`);
  return response.data;
};

export const getContentRatingsApi = async (params) => {
  const response = await adminClient.get("/content-ratings", { params });
  return response.data;
};

export const updateContentRatingApi = async (ratingId, ageRating) => {
  const response = await adminClient.put(`/content-ratings/${ratingId}`, { ageRating });
  return response.data;
};

export const addContentRatingApi = async (ratingData) => {
  const response = await adminClient.post("/content-ratings/add", ratingData);
  return response.data;
};

// Ads Client & API Calls
export const adsClient = axios.create({
  baseURL: `${BACKEND_URL}/api/ads`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

adsClient.interceptors.request.use(attachToken);

export const getAdsListApi = async () => {
  const response = await adsClient.get("/admin/ads");
  return response.data;
};

export const createAdApi = async (formData) => {
  const response = await adsClient.post("/admin/ads", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const updateAdApi = async (id, formData) => {
  const response = await adsClient.put(`/admin/ads/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const deleteAdApi = async (id) => {
  const response = await adsClient.delete(`/admin/ads/${id}`);
  return response.data;
};

export const getAdStatsApi = async () => {
  const response = await adsClient.get("/admin/ads/stats");
  return response.data;
};

export const getActiveAdsApi = async () => {
  const response = await adsClient.get("/player/active");
  return response.data;
};

export const trackAdViewApi = async (id) => {
  const response = await adsClient.post(`/player/${id}/view`);
  return response.data;
};

export const trackAdClickApi = async (id) => {
  const response = await adsClient.post(`/player/${id}/click`);
  return response.data;
};

export const trackAdCompleteApi = async (id, watchedDuration) => {
  const response = await adsClient.post(`/player/${id}/complete`, { watchedDuration });
  return response.data;
};

export const trackAdSkipApi = async (id, watchedDuration) => {
  const response = await adsClient.post(`/player/${id}/skip`, { watchedDuration });
  return response.data;
};

export const getWebSeriesList = async (category, page = 1, filters = {}) => {
  const response = await apiClient.get("/web-series", {
    params: { category, page, ...filters },
  });
  return response.data;
};

export const getWebSeriesRecommendations = async (page = 1) => {
  const response = await apiClient.get("/web-series/recommendations", {
    params: { page },
  });
  return response.data;
};

export const getTVShowList = async (category, page = 1) => {
  const response = await apiClient.get("/tv-shows", {
    params: { category, page },
  });
  return response.data;
};

export default apiClient;
