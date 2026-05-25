import React, { useEffect, useState, useRef } from "react";
import Loader from "../components/Loader";
import MediaSlider from "../components/MediaSlider";
import HeroSlider from "../components/HeroSlider";
import LazyMediaRow from "../components/LazyMediaRow";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getTrendingMovies,
  getMovieTopRated,
  getNowPlayingMovies,
  getUpcomingMovies,
  discoverMedia,
  getAnimePopular,
  getKoreanDramas,
  getTVTrending,
  getAwardWinning,
  getHiddenGems,
  getEditorsPicks,
  getPersonalizedRecommendations,
  getBecauseYouWatched,
  getBollywoodMovies,
  getTollywoodMovies,
} from "../services/api";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch only the trending items needed for Hero slider on initial load
  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        setLoading(true);
        const data = await getTrendingMovies();
        setTrending(data || []);
      } catch (err) {
        console.error("Error loading trending movies for hero:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeroData();
  }, []);

  if (loading) {
    return <Loader />;
  }

  // Synchronous lists computed from AuthContext
  const getMergedContinueWatching = () => {
    if (!user || !user.continueWatching) return [];
    if (Array.isArray(user.continueWatching)) return user.continueWatching;
    const { movie = [], cartoon = [], tv = [], anime = [] } = user.continueWatching;
    const all = [
      ...movie.map(item => ({ ...item, type: "movie" })),
      ...cartoon.map(item => ({ ...item, type: "cartoon" })),
      ...tv.map(item => ({ ...item, type: "tv" })),
      ...anime.map(item => ({ ...item, type: "anime" }))
    ];
    return all.sort((a, b) => new Date(b.timestamp || b.watchedAt) - new Date(a.timestamp || a.watchedAt));
  };

  const getMergedWatchlist = () => {
    if (!user || !user.watchlist) return [];
    if (Array.isArray(user.watchlist)) return user.watchlist;
    const { movie = [], cartoon = [], tv = [], anime = [] } = user.watchlist;
    return [
      ...movie.map(item => ({ ...item, type: "movie" })),
      ...cartoon.map(item => ({ ...item, type: "cartoon" })),
      ...tv.map(item => ({ ...item, type: "tv" })),
      ...anime.map(item => ({ ...item, type: "anime" }))
    ];
  };

  const mergedContinue = getMergedContinueWatching();
  const mergedWatchlist = getMergedWatchlist();
  const lastSessionItem = mergedContinue[0] || null;

  return (
    <div className="bg-black min-h-screen w-full pb-20 text-white font-[Inter] overflow-x-hidden">
      {/* Hero Featured Video Banner */}
      <HeroSlider items={trending} type="movie" />

      {/* Content Rows */}
      <div className="relative z-20 -mt-16 md:-mt-24 space-y-2">
        
        {/* 1. Trending Movies (Rendered immediately since data is preloaded) */}
        <MediaSlider title="Trending Movies" items={trending} type="movie" viewMoreLink="/movies/trending" />

        {/* 2. Top Rated Content (Lazy loaded on scroll) */}
        <LazyMediaRow title="Top Rated Content" fetchFn={getMovieTopRated} type="movie" viewMoreLink="/movies/top-rated" />

        {/* Bollywood Hits */}
        <LazyMediaRow title="Bollywood Hits" fetchFn={getBollywoodMovies} type="movie" viewMoreLink="/movies/bollywood" />

        {/* Tollywood & South Cinema */}
        <LazyMediaRow title="Tollywood & South Cinema" fetchFn={getTollywoodMovies} type="movie" viewMoreLink="/movies/tollywood" />

        {/* 3. Continue Watching (Instant render from local auth profile state) */}
        {user && mergedContinue.length > 0 && (
          <MediaSlider title="Continue Watching" items={mergedContinue} type="movie" />
        )}

        {/* 4. Recommended For You (Personalized - Lazy loaded) */}
        <LazyMediaRow 
          title={user ? "Recommended For You" : "Recommended Blockbusters"} 
          fetchFn={getPersonalizedRecommendations} 
          type="movie" 
          viewMoreLink="/movies/recommended"
          isAuthRequired={false} // falls back to popular if logged out
        />

        {/* 5. New Releases */}
        <LazyMediaRow title="New Releases" fetchFn={getNowPlayingMovies} type="movie" viewMoreLink="/movies/new-releases" />

        {/* 6. Upcoming / Coming Soon */}
        <LazyMediaRow title="Coming Soon" fetchFn={getUpcomingMovies} type="movie" viewMoreLink="/movies/upcoming" />

        {/* 7. Genre Collections */}
        <LazyMediaRow title="Action & Adventure" fetchFn={() => discoverMedia("movie", "28")} type="movie" viewMoreLink="/movies/action" />
        <LazyMediaRow title="Comedy Specials" fetchFn={() => discoverMedia("movie", "35")} type="movie" viewMoreLink="/movies/comedy" />
        <LazyMediaRow title="Sci-Fi & Fantasy" fetchFn={() => discoverMedia("movie", "878")} type="movie" viewMoreLink="/movies/scifi" />
        <LazyMediaRow title="Crime & Thrillers" fetchFn={() => discoverMedia("movie", "80")} type="movie" viewMoreLink="/movies/crime" />

        {/* 8. Anime Collection */}
        <LazyMediaRow title="Anime Collection" fetchFn={getAnimePopular} type="tv" viewMoreLink="/anime/trending" />

        {/* 9. Korean Dramas */}
        <LazyMediaRow title="Korean Dramas" fetchFn={getKoreanDramas} type="tv" viewMoreLink="/tv/kdramas" />

        {/* 10. Most Watched This Week */}
        <LazyMediaRow title="Most Watched This Week" fetchFn={getTVTrending} type="tv" viewMoreLink="/tv/trending" />

        {/* 11. Award Winning Shows */}
        <LazyMediaRow title="Award Winning Shows" fetchFn={getAwardWinning} type="movie" viewMoreLink="/movies/award-winning" />


        {/* 13. Editor's Picks */}
        <LazyMediaRow title="Editor's Picks" fetchFn={getEditorsPicks} type="movie" viewMoreLink="/movies/editors-picks" />

        {/* 14. Because You Watched (Personalized - Lazy loaded) */}
        {user && (
          <LazyMediaRow 
            title="Because You Watched" 
            fetchFn={getBecauseYouWatched} 
            type="movie" 
            viewMoreLink="/movies/because-you-watched"
            isAuthRequired={true}
            isDynamic={true}
          />
        )}

        {/* 15. Continue From Last Session Banner (Synchronous from profile) */}
        {lastSessionItem && (
          <div className="px-8 md:px-12 py-10 w-full bg-black">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/60 shadow-2xl flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 backdrop-blur-xl">
              {/* background thumbnail watermark */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <img
                  src={`https://image.tmdb.org/t/p/w780${lastSessionItem.poster_path}`}
                  alt=""
                  width={1200}
                  height={200}
                  loading="lazy"
                  className="w-full h-full object-cover filter blur-sm scale-110"
                />
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <img
                  src={`https://image.tmdb.org/t/p/w185${lastSessionItem.poster_path}`}
                  alt={lastSessionItem.title || lastSessionItem.name}
                  width={64}
                  height={96}
                  loading="lazy"
                  className="w-16 h-24 rounded-lg object-cover border border-white/10"
                />
                <div>
                  <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest">
                    Continue From Last Session
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    {lastSessionItem.title || lastSessionItem.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Last active: {new Date(lastSessionItem.timestamp || lastSessionItem.watchedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/${lastSessionItem.type}/${lastSessionItem.id}`)}
                className="relative z-10 mt-6 md:mt-0 gradient-btn text-white text-sm font-semibold px-6 py-3 rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-lg hover:shadow-pink-500/10 cursor-pointer border-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M8 5V19L19 12L8 5Z" />
                </svg>
                Resume Watching
              </button>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default Home;