import React, { useEffect, useState, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getTrendingMovies,
  getMovieTopRated,
  getNowPlayingMovies,
  getUpcomingMovies,
  getAwardWinning,
  getHiddenGems,
  getPersonalizedRecommendations,
  getBecauseYouWatched,
  getGenres,
  discoverMedia,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import HeroSlider from "../components/HeroSlider";
import MediaSlider from "../components/MediaSlider";
import MovieCard from "../components/MovieCard";
import Loader from "../components/Loader";
import { OrbitProgress } from "react-loading-indicators";

const MoviesPage = () => {
  const navigate = useNavigate();
  const { user, getWatchlist, getContinueWatching } = useAuth();
  
  // Section states
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [awardWinning, setAwardWinning] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [becauseYouWatched, setBecauseYouWatched] = useState({ sourceTitle: "", results: [] });

  // Discover states
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [discoverList, setDiscoverList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingDiscover, setLoadingDiscover] = useState(false);

  // Load initial content
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoadingPage(true);
        const endpoints = [
          getTrendingMovies(),                         // 0
          getMovieTopRated(),                          // 1
          getNowPlayingMovies(),                       // 2 (New Releases)
          getUpcomingMovies(),                         // 3
          getAwardWinning("movie"),                    // 4
          getHiddenGems("movie"),                      // 5
          getPersonalizedRecommendations("movie"),     // 6
          getBecauseYouWatched("movie"),               // 7
          getGenres("movie"),                          // 8
        ];

        const results = await Promise.allSettled(endpoints);

        if (results[0].status === "fulfilled") setTrendingMovies(results[0].value || []);
        if (results[1].status === "fulfilled") setTopRatedMovies(results[1].value || []);
        if (results[2].status === "fulfilled") setNewReleases(results[2].value || []);
        if (results[3].status === "fulfilled") setUpcomingMovies(results[3].value || []);
        if (results[4].status === "fulfilled") setAwardWinning(results[4].value || []);
        if (results[5].status === "fulfilled") setHiddenGems(results[5].value || []);
        if (results[6].status === "fulfilled") setRecommendedMovies(results[6].value || []);
        if (results[7].status === "fulfilled") setBecauseYouWatched(results[7].value || { sourceTitle: "", results: [] });
        if (results[8].status === "fulfilled") setGenres(results[8].value || []);

      } catch (err) {
        console.error("Error loading Movie page content:", err);
      } finally {
        setLoadingPage(false);
      }
    };

    loadContent();
  }, [user]);

  // Load initial discover Movies and when genre changes
  useEffect(() => {
    const fetchInitialDiscover = async () => {
      try {
        setLoadingDiscover(true);
        setPage(1);
        const data = await discoverMedia("movie", selectedGenre, 1);
        setDiscoverList(data.results || []);
        setHasMore(data.page < data.total_pages);
      } catch (err) {
        console.error("Error fetching discover movies:", err);
      } finally {
        setLoadingDiscover(false);
      }
    };

    if (!loadingPage) {
      fetchInitialDiscover();
    }
  }, [selectedGenre, loadingPage]);

  // Load more pages
  const loadMore = async () => {
    if (loadingDiscover || !hasMore) return;
    try {
      setLoadingDiscover(true);
      const nextPage = page + 1;
      const data = await discoverMedia("movie", selectedGenre, nextPage);
      setDiscoverList((prev) => [...prev, ...(data.results || [])]);
      setPage(nextPage);
      setHasMore(data.page < data.total_pages);
    } catch (err) {
      console.error("Error loading more discover movies:", err);
    } finally {
      setLoadingDiscover(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Get user continueWatching and watchlist specifically for movies
  const continueWatching = getContinueWatching("movie");
  const watchlist = getWatchlist("movie");

  return (
    <div className="min-h-screen bg-black text-white pb-12 select-none font-[Inter]">
      {/* Hero Section */}
      <HeroSlider items={trendingMovies.length > 0 ? trendingMovies : topRatedMovies} type="movie" />

      {/* Standard Landing View with Movie Sections */}
      <div className="space-y-2 mt-4">
        {/* 2. Trending Movies */}
        <MediaSlider title="Trending Movies" items={trendingMovies} type="movie" viewMoreLink="/movies/trending" />

        {/* 1. Continue Watching (Movies only) */}
        {user && continueWatching.length > 0 && (
          <MediaSlider title="Continue Watching" items={continueWatching} type="movie" />
        )}

        {/* 3. Top Rated Movies */}
        <MediaSlider title="Top Rated Movies" items={topRatedMovies} type="movie" viewMoreLink="/movies/top-rated" />

        {/* 4. New Releases */}
        <MediaSlider title="New Releases" items={newReleases} type="movie" viewMoreLink="/movies/new-releases" />

        {/* 5. Upcoming Movies */}
        <MediaSlider title="Upcoming Movies" items={upcomingMovies} type="movie" viewMoreLink="/movies/upcoming" />

        {/* 6. Award Winning Movies */}
        <MediaSlider title="Award Winning Movies" items={awardWinning} type="movie" viewMoreLink="/movies/award-winning" />


        {/* 8. Recommended Movies */}
        <MediaSlider
          title={user ? "Recommended For You" : "Recommended Movies"}
          items={recommendedMovies}
          type="movie"
          viewMoreLink="/movies/recommended"
        />

        {/* 9. Because You Watched */}
        {becauseYouWatched.results && becauseYouWatched.results.length > 0 && (
          <MediaSlider
            title={`Because You Watched: ${becauseYouWatched.sourceTitle}`}
            items={becauseYouWatched.results}
            type="movie"
            viewMoreLink="/movies/because-you-watched"
          />
        )}

        {/* 10. Movie Watchlist */}
        {user && watchlist.length > 0 && (
          <MediaSlider title="Movie Watchlist" items={watchlist} type="movie" />
        )}
      </div>
    </div>
  );
};

export default MoviesPage;
