const express = require("express");
const router = express.Router();
const {
  // Movies
  getBollywoodMovies,
  getTollywoodMovies,
  getWebSeriesList,
  getWebSeriesRecommendations,
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
  getTVGenres,
  getTVShowList,
  searchWebSeries,
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
  // Cartoon
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
} = require("../controllers/movie.controller");

const { cacheMiddleware } = require("../utils/cache");
const { optionalProtect } = require("../middlewares/auth.middleware");

router.use(optionalProtect);

// Secure Player Routes (No caching)
router.get("/embed/movie/:id", getSecureMoviePlayerUrl);
router.get("/embed/tv/:id/:season/:episode", getSecureTVPlayerUrl);

// Audio Languages Route
router.get("/languages/:type/:id", cacheMiddleware(600), getAvailableLanguages);

// Movie Routes
router.get("/bollywood", cacheMiddleware(300), getBollywoodMovies);
router.get("/tollywood", cacheMiddleware(300), getTollywoodMovies);
router.get("/popular", cacheMiddleware(300), getPopularMovies);
router.get("/now-playing", cacheMiddleware(300), getNowPlayingMovies);
router.get("/upcoming", cacheMiddleware(300), getUpcomingMovies);
router.get("/movie/top-rated", cacheMiddleware(300), getMovieTopRated);
router.get("/trending", cacheMiddleware(300), getTrendingMovies);
router.get("/swipe", cacheMiddleware(300), getSwipeMovies);
router.get("/genres/movie", cacheMiddleware(300), getMovieGenres);
router.get("/discover/movie", cacheMiddleware(300), discoverMovies);
router.get("/search/movie", searchMovies); // Do not cache search
router.get("/detail/movie/:id", cacheMiddleware(300), getMovieDetails);

// TV Show Routes
router.get("/tv-shows", cacheMiddleware(300), getTVShowList);
router.get("/tv/trending", cacheMiddleware(300), getTVTrending);
router.get("/tv/popular", cacheMiddleware(300), getTVPopular);
router.get("/tv/top-rated", cacheMiddleware(300), getTVTopRated);
router.get("/tv/on-the-air", cacheMiddleware(300), getTVOnTheAir);
router.get("/tv/new-episodes", cacheMiddleware(300), getTVNewEpisodes);
router.get("/tv/drama", cacheMiddleware(300), getIndianDrama);
router.get("/tv/comedy", cacheMiddleware(300), getIndianComedy);
router.get("/tv/crime", cacheMiddleware(300), getIndianCrime);
router.get("/tv/thriller", cacheMiddleware(300), getIndianThriller);
router.get("/tv/reality", cacheMiddleware(300), getIndianReality);
router.get("/tv/hidden-gems", cacheMiddleware(300), getTVHiddenGems);
router.get("/tv/trending-international", cacheMiddleware(300), getTrendingInternational);
router.get("/tv/hollywood", cacheMiddleware(300), getTopHollywoodShows);
router.get("/genres/tv", cacheMiddleware(300), getTVGenres);
router.get("/discover/tv", cacheMiddleware(300), discoverTV);
router.get("/search/tv", searchTV); // Do not cache search
router.get("/detail/tv/:id", cacheMiddleware(300), getTVDetails);
router.get("/detail/tv/:id/season/:season_number", cacheMiddleware(300), getTVSeasonDetails);

// Cartoon Routes
router.get("/cartoon/trending", cacheMiddleware(300), getCartoonTrending);
router.get("/cartoon/popular", cacheMiddleware(300), getCartoonPopular);
router.get("/cartoon/top-rated", cacheMiddleware(300), getCartoonTopRated);
router.get("/cartoon/hindi-dubbed", cacheMiddleware(300), getCartoonHindiDubbed);
router.get("/cartoon/english", cacheMiddleware(300), getCartoonEnglish);
router.get("/cartoon/multi-audio", cacheMiddleware(300), getCartoonMultiAudio);
router.get("/cartoon/collection", cacheMiddleware(300), getCartoonCollection);
router.get("/cartoon/adventure", cacheMiddleware(300), getCartoonAdventure);
router.get("/cartoon/comedy", cacheMiddleware(300), getCartoonComedy);
router.get("/cartoon/hidden-gems", cacheMiddleware(300), getCartoonHiddenGems);
router.get("/cartoon/editors-picks", cacheMiddleware(300), getCartoonEditorsPicks);
router.get("/discover/cartoon", cacheMiddleware(300), discoverCartoon);
router.get("/search/cartoon", searchCartoon);
router.get("/detail/cartoon/:id", cacheMiddleware(300), getCartoonDetails);

// Anime Routes
router.get("/anime/trending", cacheMiddleware(300), getAnimeTrending);
router.get("/anime/popular", cacheMiddleware(300), getAnimePopular);
router.get("/anime/top-rated", cacheMiddleware(300), getAnimeTopRated);
router.get("/anime/airing-now", cacheMiddleware(300), getAnimeAiringNow);
router.get("/anime/upcoming", cacheMiddleware(300), getAnimeUpcoming);
router.get("/anime/newly-added", cacheMiddleware(300), getAnimeNewlyAdded);
router.get("/anime/collection", cacheMiddleware(300), getAnimeCollection);
router.get("/anime/hindi-dub", cacheMiddleware(300), getAnimeHindiDub);
router.get("/anime/english-dub", cacheMiddleware(300), getAnimeEnglishDub);
router.get("/anime/subbed", cacheMiddleware(300), getAnimeSubbed);
router.get("/anime/hidden-gems", cacheMiddleware(300), getAnimeHiddenGems);
router.get("/anime/editors-picks", cacheMiddleware(300), getAnimeEditorsPicks);
router.get("/discover/anime", cacheMiddleware(300), discoverAnime);
router.get("/search/anime", searchAnime); // Do not cache search

// Person Routes
router.get("/detail/person/:id", cacheMiddleware(300), getPersonDetails);
router.get("/search/person", searchPerson); // Do not cache search
router.get("/person/popular", cacheMiddleware(300), getPopularPersons);

// Brand New Homepage Routes
router.get("/k-dramas", cacheMiddleware(300), getKoreanDramas);
router.get("/hidden-gems", cacheMiddleware(300), getHiddenGems);
router.get("/editors-picks", cacheMiddleware(300), getEditorsPicks);
router.get("/award-winning", cacheMiddleware(300), getAwardWinning);
router.get("/recommendations", optionalProtect, cacheMiddleware(60), getPersonalizedRecommendations);
router.get("/because-you-watched", optionalProtect, cacheMiddleware(60), getBecauseYouWatched);

// Web Series Routes
router.get("/web-series", cacheMiddleware(300), getWebSeriesList);
router.get("/web-series/recommendations", optionalProtect, cacheMiddleware(60), getWebSeriesRecommendations);
router.get("/discover/web-series", cacheMiddleware(300), getWebSeriesList);
router.get("/search/web-series", searchWebSeries);

module.exports = router;
