import React, { useState, useEffect, Suspense, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getPopularMovies,
  getNowPlayingMovies,
  getUpcomingMovies,
  getMovieTopRated,
  getTrendingMovies,
  getBollywoodMovies,
  getTollywoodMovies,
  getKoreanDramas,
  getHiddenGems,
  getEditorsPicks,
  getAwardWinning,
  getPersonalizedRecommendations,
  getBecauseYouWatched,
  // TV
  getTVTrending,
  getTVPopular,
  getTVTopRated,
  getTVOnTheAir,
  getTVNewEpisodes,
  getTVDrama,
  getTVComedy,
  getTVCrime,
  getTVThriller,
  getTVReality,
  getTVHiddenGems,
  getTVTrendingInternational,
  getTVHollywood,
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
  // Anime
  getAnimeTrending,
  getAnimePopular,
  getAnimeTopRated,
  getAnimeAiringNow,
  getAnimeUpcoming,
  getAnimeNewlyAdded,
  getAnimeCollection,
  getAnimeHindiDub,
  getAnimeEnglishDub,
  getAnimeSubbed,
  getAnimeHiddenGems,
  getAnimeEditorsPicks,
  getGenres,
  discoverMedia,
  getWebSeriesList,
  getWebSeriesRecommendations,
  getTVShowList
} from "../services/api";
import MovieCard from "../components/MovieCard";
import Loader from "../components/Loader";
import { OrbitProgress } from "react-loading-indicators";
import { SEOHead, generateBreadcrumbJsonLd } from "../seo";


const SECTION_MAP = {
  movies: {
    "trending": { title: "Trending Movies", fetch: (page) => getTrendingMovies(page), desc: "Weekly trending movies around the world" },
    "top-rated": { title: "Top Rated Movies", fetch: (page) => getMovieTopRated(page), desc: "Highest rated movies based on user reviews" },
    "popular": { title: "Popular Movies", fetch: (page) => getPopularMovies(page), desc: "Most popular movies right now" },
    "new-releases": { title: "New Releases", fetch: (page) => getNowPlayingMovies(page), desc: "Newly released movies in theaters and streaming" },
    "upcoming": { title: "Upcoming Movies", fetch: (page) => getUpcomingMovies(page), desc: "Highly anticipated movies coming soon" },
    "bollywood": { title: "Bollywood Hits", fetch: (page) => getBollywoodMovies(page), desc: "Popular and trending Hindi cinema", extraParams: { with_original_language: "hi" } },
    "tollywood": { title: "Tollywood & South Cinema", fetch: (page) => getTollywoodMovies(page), desc: "Spectacular movies from Telugu and Tamil cinema", extraParams: { with_original_language: "te|ta" } },
    "action": { title: "Action & Adventure", fetch: (page) => discoverMedia("movie", "28", page), desc: "Adrenaline-pumping action and adventure movies", hideGenreFilter: true },
    "comedy": { title: "Comedy Specials", fetch: (page) => discoverMedia("movie", "35", page), desc: "Hilarious comedies to brighten your day", hideGenreFilter: true },
    "scifi": { title: "Sci-Fi & Fantasy", fetch: (page) => discoverMedia("movie", "878", page), desc: "Out-of-this-world sci-fi and fantasy movies", hideGenreFilter: true },
    "crime": { title: "Crime & Thrillers", fetch: (page) => discoverMedia("movie", "80", page), desc: "Suspenseful crime dramas and psychological thrillers", hideGenreFilter: true },
    "award-winning": { title: "Award Winning Movies", fetch: (page) => getAwardWinning("movie", page), desc: "Acclaimed movies that won major awards", extraParams: { sort_by: "vote_average.desc", "vote_count.gte": 4000, "vote_average.gte": 8.0 } },
    "hidden-gems": { title: "Hidden Gems", fetch: (page) => getHiddenGems("movie", page), desc: "Underappreciated movies you might have missed", extraParams: { sort_by: "vote_average.desc", "vote_count.gte": 150, "popularity.lte": 55, "popularity.gte": 10 } },
    "editors-picks": { title: "Editor's Picks", fetch: (page) => getEditorsPicks("movie", page), desc: "Hand-picked movies recommended by our editors", extraParams: { sort_by: "vote_average.desc", "vote_count.gte": 8000 } },
    "recommended": { title: "Recommended For You", fetch: (page) => getPersonalizedRecommendations("movie", page), desc: "Movies personalized for your taste" },
    "because-you-watched": { title: "Because You Watched", fetch: (page) => getBecauseYouWatched("movie", page), desc: "Movies related to your watch history" }
  },
  cartoon: {
    "trending": { title: "Trending Cartoons", fetch: (page) => getCartoonTrending(page), desc: "Weekly trending cartoons around the world" },
    "top-rated": { title: "Top Rated Cartoons", fetch: (page) => getCartoonTopRated(page), desc: "Highest rated cartoons based on reviews" },
    "popular": { title: "Popular Cartoons", fetch: (page) => getCartoonPopular(page), desc: "Most popular cartoons right now" },
    "hindi-dubbed": { title: "Hindi Dubbed Cartoons", fetch: (page) => getCartoonHindiDubbed(page), desc: "Western cartoons dubbed in Hindi" },
    "english": { title: "English Cartoons", fetch: (page) => getCartoonEnglish(page), desc: "Western cartoons in original English audio" },
    "multi-audio": { title: "Multi Audio Cartoons", fetch: (page) => getCartoonMultiAudio(page), desc: "Cartoons with multiple audio tracks" },
    "collection": { title: "Cartoon Collection", fetch: (page) => getCartoonCollection(page), desc: "Curated collection of must-watch cartoons" },
    "adventure": { title: "Adventure Cartoons", fetch: (page) => getCartoonAdventure(page), desc: "Thrilling and adventurous cartoon shows and movies" },
    "comedy": { title: "Comedy Cartoons", fetch: (page) => getCartoonComedy(page), desc: "Hilarious cartoons to bring a smile to your face" },
    "hidden-gems": { title: "Hidden Gems", fetch: (page) => getCartoonHiddenGems(page), desc: "Underappreciated cartoons you might have missed" },
    "editors-picks": { title: "Editor's Picks", fetch: (page) => getCartoonEditorsPicks(page), desc: "Hand-picked cartoons recommended by our editors" },
    "recommended": { title: "Recommended For You", fetch: (page) => getPersonalizedRecommendations("cartoon", page), desc: "Cartoons personalized for your taste" },
    "because-you-watched": { title: "Because You Watched", fetch: (page) => getBecauseYouWatched("cartoon", page), desc: "Cartoons related to your watch history" }
  },
  tv: {
    "trending": { title: "Trending TV Shows", fetch: (page) => getTVShowList("trending", page), desc: "Weekly trending traditional TV shows" },
    "popular": { title: "Popular TV Shows", fetch: (page) => getTVShowList("popular", page), desc: "Most popular traditional TV shows right now" },
    "crime": { title: "Crime Shows", fetch: (page) => getTVShowList("crime", page), desc: "Suspenseful traditional crime shows" },
    "comedy": { title: "Comedy Shows", fetch: (page) => getTVShowList("comedy", page), desc: "Hilarious traditional comedy shows" },
    "reality": { title: "Reality Shows", fetch: (page) => getTVShowList("reality", page), desc: "Popular traditional reality shows" },
    "family-dramas": { title: "Family Dramas", fetch: (page) => getTVShowList("family-dramas", page), desc: "Intense and emotional family drama shows" },
    "daily-soaps": { title: "Daily Soaps", fetch: (page) => getTVShowList("daily-soaps", page), desc: "Traditional daily soaps" },
    "tv-classics": { title: "TV Classics", fetch: (page) => getTVShowList("tv-classics", page), desc: "Classic channel broadcast shows" },
    "most-watched": { title: "Most Watched This Week", fetch: (page) => getTVShowList("most-watched", page), desc: "Most watched TV shows this week" },
    "recommended": { title: "Recommended TV Shows", fetch: (page) => getPersonalizedRecommendations("tv", page), desc: "TV shows personalized for your taste" },
    "because-you-watched": { title: "Because You Watched", fetch: (page) => getBecauseYouWatched("tv", page), desc: "TV shows related to your watch history" }
  },
  anime: {
    "trending": { title: "Trending Anime", fetch: (page) => getAnimeTrending(page), desc: "Weekly trending Anime shows and movies" },
    "popular": { title: "Popular Anime", fetch: (page) => getAnimePopular(page), desc: "Most popular Anime right now" },
    "top-rated": { title: "Top Rated Anime", fetch: (page) => getAnimeTopRated(page), desc: "Highest rated Anime based on reviews" },
    "airing-now": { title: "Airing Now", fetch: (page) => getAnimeAiringNow(page), desc: "Anime currently airing new episodes" },
    "upcoming": { title: "Upcoming Anime", fetch: (page) => getAnimeUpcoming(page), desc: "Anticipated Anime series coming soon" },
    "newly-added": { title: "Newly Added Anime", fetch: (page) => getAnimeNewlyAdded(page), desc: "Recently released Anime titles" },
    "collection": { title: "Anime Collection", fetch: (page) => getAnimeCollection(page), desc: "Curated collection of must-watch Anime" },
    "hindi-dub": { title: "Hindi Dubbed Anime", fetch: (page) => getAnimeHindiDub(page), desc: "Anime series available with Hindi audio" },
    "english-dub": { title: "English Dubbed Anime", fetch: (page) => getAnimeEnglishDub(page), desc: "Anime series available with English audio" },
    "subbed": { title: "Subbed Anime", fetch: (page) => getAnimeSubbed(page), desc: "Anime series available with English subtitles" },
    "recommended": { title: "Recommended Anime", fetch: (page) => getPersonalizedRecommendations("anime", page), desc: "Anime personalized for your taste" },
    "hidden-gems": { title: "Hidden Gems", fetch: (page) => getAnimeHiddenGems(page), desc: "Underappreciated Anime you might have missed" },
    "editors-picks": { title: "Editor's Picks", fetch: (page) => getEditorsPicks("anime", page), desc: "Hand-picked Anime series" },
    "because-you-watched": { title: "Because You Watched", fetch: (page) => getBecauseYouWatched("anime", page), desc: "Anime related to your watch history" }
  },
  "web-series": {
    "trending": { title: "Trending Web Series", fetch: (page) => getWebSeriesList("trending", page), desc: "Weekly trending web series around the world" },
    "popular": { title: "Popular Web Series", fetch: (page) => getWebSeriesList("popular", page), desc: "Most popular web series right now" },
    "top-rated": { title: "Top Rated Web Series", fetch: (page) => getWebSeriesList("top-rated", page), desc: "Highest rated web series based on user reviews" },
    "new-releases": { title: "New Releases", fetch: (page) => getWebSeriesList("new-releases", page), desc: "Newly released web series" },
    "recommended": { title: "Recommended For You", fetch: (page) => getWebSeriesRecommendations(page), desc: "Web series personalized for your taste" },
    "most-watched": { title: "Most Watched This Week", fetch: (page) => getWebSeriesList("most-watched", page), desc: "Web series most watched this week" },
    "award-winning": { title: "Award Winning Series", fetch: (page) => getWebSeriesList("award-winning", page), desc: "Acclaimed web series that won awards" },
    "hidden-gems": { title: "Hidden Gems", fetch: (page) => getWebSeriesList("hidden-gems", page), desc: "Underappreciated web series you might have missed" },
    "editors-picks": { title: "Editor's Picks", fetch: (page) => getWebSeriesList("editors-picks", page), desc: "Hand-picked series recommended by our editors" },
    "recently-added": { title: "Recently Added", fetch: (page) => getWebSeriesList("recently-added", page), desc: "Recently added web series" },
    "binge-worthy": { title: "Binge Worthy Series", fetch: (page) => getWebSeriesList("binge-worthy", page), desc: "Binge worthy web series" },
    "completed": { title: "Completed Series", fetch: (page) => getWebSeriesList("completed", page), desc: "Completed web series" },
    "ongoing": { title: "Ongoing Series", fetch: (page) => getWebSeriesList("ongoing", page), desc: "Ongoing web series" },
    "mini-series": { title: "Mini Series", fetch: (page) => getWebSeriesList("mini-series", page), desc: "Limited and mini series" },
    "international": { title: "International Series", fetch: (page) => getWebSeriesList("international", page), desc: "Popular international web series" },
    "indian": { title: "Indian Web Series", fetch: (page) => getWebSeriesList("indian", page), desc: "Trending Indian web series" },
    "crime": { title: "Crime Series", fetch: (page) => getWebSeriesList("crime", page), desc: "Suspenseful crime dramas" },
    "thriller": { title: "Thriller Series", fetch: (page) => getWebSeriesList("thriller", page), desc: "Gripping thriller shows" },
    "comedy": { title: "Comedy Series", fetch: (page) => getWebSeriesList("comedy", page), desc: "Hilarious comedy series" },
    "action": { title: "Action Series", fetch: (page) => getWebSeriesList("action", page), desc: "Adrenaline-pumping action and adventure shows" },
    "drama": { title: "Drama Series", fetch: (page) => getWebSeriesList("drama", page), desc: "Intense and emotional drama series" },
    "mystery": { title: "Mystery Series", fetch: (page) => getWebSeriesList("mystery", page), desc: "Intriguing mystery shows" },
  }
};

const SectionPage = ({ type: propType }) => {
  const { type: paramType, section } = useParams();
  const type = propType || paramType;
  const navigate = useNavigate();
  const { user } = useAuth();

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const genreParam = queryParams.get("genre") || "";

  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(genreParam);

  useEffect(() => {
    const qParams = new URLSearchParams(location.search);
    const gParam = qParams.get("genre") || "";
    setSelectedGenre(gParam);
  }, [location.search]);

  const [sortBy, setSortBy] = useState("popularity");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Custom Web Series filters states
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  
  const observerTargetRef = useRef(null);

  const sectionConfig = SECTION_MAP[type]?.[section];

  // If type or section is invalid, redirect to home
  useEffect(() => {
    if (!sectionConfig) {
      navigate("/");
    }
  }, [type, section, sectionConfig, navigate]);

  // Load genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const genreType = type === "movies" ? "movie" : "tv";
        const data = await getGenres(genreType);
        if (type === "anime") {
          // Filter out general Animation genre ID 16 for anime tab
          setGenres((data || []).filter((g) => g.id !== 16));
        } else {
          setGenres(data || []);
        }
      } catch (err) {
        console.error("Error fetching genres:", err);
      }
    };
    if (sectionConfig) {
      fetchGenres();
    }
  }, [type, sectionConfig]);

  // Fetch initial section items
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!sectionConfig) return;
      try {
        setLoading(true);
        setPage(1);
        
        let fetchedData;
        if (type === "web-series" && (selectedGenre || selectedLanguage || selectedCountry || selectedYear || selectedRating)) {
          const data = await getWebSeriesList(section, 1, {
            genre: selectedGenre,
            language: selectedLanguage,
            country: selectedCountry,
            year: selectedYear,
            rating: selectedRating
          });
          fetchedData = data.results || data || [];
          setHasMore(fetchedData.length >= 10);
        } else if (selectedGenre) {
          // If genre is selected, query discover endpoint instead
          const mediaType = type === "movies" ? "movie" : (type === "cartoon" ? "cartoon" : (type === "anime" ? "anime" : "tv"));
          const response = await discoverMedia(mediaType, selectedGenre, 1, sectionConfig.extraParams || {});
          fetchedData = response.results || [];
          setHasMore(response.page < response.total_pages);
        } else {
          // Fetch from config API call
          const response = await sectionConfig.fetch(1);
          // Personalized recommendation endpoints return results directly
          const list = Array.isArray(response) ? response : (response.results || []);
          fetchedData = list;
          // recommendations or lists from TMDB might not have page directly or have limited results
          setHasMore(list.length >= 10);
        }

        // Safeguard to filter out duplicate items
        const unique = [];
        const seen = new Set();
        for (const item of fetchedData) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            unique.push(item);
          }
        }
        setItems(unique);
      } catch (err) {
        console.error("Error fetching initial section data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [type, section, selectedGenre, selectedLanguage, selectedCountry, selectedYear, selectedRating, sectionConfig]);

  // Load more pages
  const loadMore = async () => {
    if (loadingMore || !hasMore || !sectionConfig) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      let newItems = [];

      if (type === "web-series" && (selectedGenre || selectedLanguage || selectedCountry || selectedYear || selectedRating)) {
        const data = await getWebSeriesList(section, nextPage, {
          genre: selectedGenre,
          language: selectedLanguage,
          country: selectedCountry,
          year: selectedYear,
          rating: selectedRating
        });
        newItems = data.results || data || [];
        setHasMore(newItems.length >= 10);
      } else if (selectedGenre) {
        const mediaType = type === "movies" ? "movie" : (type === "cartoon" ? "cartoon" : (type === "anime" ? "anime" : "tv"));
        const response = await discoverMedia(mediaType, selectedGenre, nextPage, sectionConfig.extraParams || {});
        newItems = response.results || [];
        setHasMore(response.page < response.total_pages);
      } else {
        const response = await sectionConfig.fetch(nextPage);
        const list = Array.isArray(response) ? response : (response.results || []);
        newItems = list;
        setHasMore(list.length >= 10);
      }

      // Safeguard to filter out duplicate items during infinite scroll append
      setItems((prev) => {
        const merged = [...prev, ...newItems];
        const unique = [];
        const seen = new Set();
        for (const item of merged) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            unique.push(item);
          }
        }
        return unique;
      });
      setPage(nextPage);
    } catch (err) {
      console.error("Error loading more items:", err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Set up Intersection Observer for infinite scroll
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "150px" }
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, page, selectedGenre, selectedLanguage, selectedCountry, selectedYear, selectedRating]);

  if (!sectionConfig) return null;

  // Local filtering (if any item doesn't have genre list or if API doesn't filter perfectly)
  const filteredItems = items;

  // Local sorting
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === "rating") {
      return (b.vote_average || 0) - (a.vote_average || 0);
    }
    if (sortBy === "release") {
      const dateA = new Date(a.release_date || a.first_air_date || 0);
      const dateB = new Date(b.release_date || b.first_air_date || 0);
      return dateB - dateA;
    }
    // Default: popularity
    return (b.popularity || 0) - (a.popularity || 0);
  });

  const handleBack = () => {
    navigate(-1);
  };

  const cardType = type === "movies" ? "movie" : (type === "cartoon" ? "cartoon" : (type === "anime" ? "anime" : (type === "web-series" ? "web-series" : "tv")));

  const sectionPath = `/${type}/${section}`;

  return (
    <div className="min-h-screen bg-black text-white pb-20 pt-20 px-6 md:px-12 select-none font-[Inter]">
      <SEOHead
        title={sectionConfig.title}
        description={sectionConfig.desc}
        keywords={`${sectionConfig.title}, best ${sectionConfig.title}, watch ${sectionConfig.title} online, MoviGenix`}
        canonicalPath={sectionPath}
        jsonLd={generateBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: type.charAt(0).toUpperCase() + type.slice(1), path: `/${type}` },
          { name: sectionConfig.title, path: sectionPath }
        ])}
      />
      {/* Header Back & Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6 mb-8">
        <div className="flex items-start gap-4">
          <button
            onClick={handleBack}
            className="mt-1 p-2 rounded-full hover:bg-white/10 transition text-zinc-400 hover:text-white cursor-pointer active:scale-95 shrink-0"
            title="Go Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M22 13H5.83l4.18 4.18-1.42 1.42L2 12.01l6.59-6.59 1.42 1.42L5.83 11H22v2z" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              <span className="border-l-4 border-yellow-400 pl-3">
                {sectionConfig.title}
              </span>
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-xl">
              {sectionConfig.desc}
            </p>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Genre Filter */}
          {!sectionConfig.hideGenreFilter && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Genre:</span>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition cursor-pointer"
              >
                <option value="">All Genres</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition cursor-pointer"
            >
              <option value="popularity">Popularity</option>
              <option value="rating">Rating</option>
              <option value="release">Release Date</option>
            </select>
          </div>

          {type === "web-series" && (
            <>
              {/* Language Filter */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Language:</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-zinc-900 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition cursor-pointer"
                >
                  <option value="">All Languages</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ko">Korean</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              {/* Country Filter */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Country:</span>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="bg-zinc-900 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition cursor-pointer"
                >
                  <option value="">All Countries</option>
                  <option value="IN">India</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="KR">South Korea</option>
                  <option value="ES">Spain</option>
                </select>
              </div>

              {/* Year Filter */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-zinc-900 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition cursor-pointer"
                >
                  <option value="">All Years</option>
                  {Array.from({ length: 20 }, (_, idx) => 2026 - idx).map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating Filter */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Rating:</span>
                <select
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="bg-zinc-900 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition cursor-pointer"
                >
                  <option value="">All Ratings</option>
                  <option value="8">8.0+ ⭐</option>
                  <option value="7">7.0+ ⭐</option>
                  <option value="6">6.0+ ⭐</option>
                  <option value="5">5.0+ ⭐</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader />
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-24 text-zinc-500 text-lg">
          No content found matching your filter criteria.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {sortedItems.map((item) => (
              <Suspense
                key={item.id}
                fallback={<div className="aspect-[2/3] bg-zinc-900 rounded-xl animate-pulse"></div>}
              >
                <MovieCard movie={item} type={cardType} />
              </Suspense>
            ))}

            {/* Skeleton Loaders while fetching more content */}
            {loadingMore &&
              Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="aspect-[2/3] w-full bg-zinc-950 border border-white/5 rounded-xl animate-pulse relative overflow-hidden flex flex-col justify-end p-4"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="relative z-10 space-y-2.5">
                    <div className="h-4 bg-zinc-800 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3.5 bg-zinc-800/80 rounded w-1/2 animate-pulse"></div>
                    <div className="flex gap-2 mt-2 pt-1">
                      <div className="h-8 bg-zinc-800 rounded-lg flex-1 animate-pulse"></div>
                      <div className="h-8 w-8 bg-zinc-800 rounded-lg animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Intersection Observer target for infinite scroll */}
          {hasMore && (
            <div ref={observerTargetRef} className="flex justify-center mt-10 h-10 w-full">
              {/* Invisible trigger target */}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SectionPage;
