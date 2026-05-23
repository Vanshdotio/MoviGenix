import React, { useEffect, useState, Suspense } from "react";
import Loader from "../components/Loader";
import MediaSlider from "../components/MediaSlider";
import Swipe from "../components/Swipe";
import HeroSlider from "../components/HeroSlider";
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

  // Section states
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [action, setAction] = useState([]);
  const [comedy, setComedy] = useState([]);
  const [scifi, setScifi] = useState([]);
  const [crime, setCrime] = useState([]);
  const [anime, setAnime] = useState([]);
  const [kdramas, setKdramas] = useState([]);
  const [mostWatched, setMostWatched] = useState([]);
  const [awardWinning, setAwardWinning] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [editorsPicks, setEditorsPicks] = useState([]);
  const [becauseYouWatched, setBecauseYouWatched] = useState({ sourceTitle: "", results: [] });
  const [bollywood, setBollywood] = useState([]);
  const [tollywood, setTollywood] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const endpoints = [
          getTrendingMovies(),                 // 0
          getMovieTopRated(),                  // 1
          getPersonalizedRecommendations(),    // 2
          getNowPlayingMovies(),               // 3
          getUpcomingMovies(),                 // 4
          discoverMedia("movie", "28"),        // 5 (Action & Adventure)
          discoverMedia("movie", "35"),        // 6 (Comedy)
          discoverMedia("movie", "878"),       // 7 (Sci-Fi & Fantasy)
          discoverMedia("movie", "80"),        // 8 (Crime & Thriller)
          getAnimePopular(),                   // 9
          getKoreanDramas(),                   // 10
          getTVTrending(),                     // 11 (Most Watched TV)
          getAwardWinning(),                   // 12
          getHiddenGems(),                     // 13
          getEditorsPicks(),                   // 14
          getBecauseYouWatched(),              // 15
          getBollywoodMovies(),                // 16
          getTollywoodMovies()                 // 17
        ];

        const results = await Promise.allSettled(endpoints);

        if (results[0].status === "fulfilled") setTrending(results[0].value);
        if (results[1].status === "fulfilled") setTopRated(results[1].value);
        if (results[2].status === "fulfilled") setRecommended(results[2].value);
        if (results[3].status === "fulfilled") setNewReleases(results[3].value);
        if (results[4].status === "fulfilled") setUpcoming(results[4].value);
        if (results[5].status === "fulfilled") setAction(results[5].value?.results || []);
        if (results[6].status === "fulfilled") setComedy(results[6].value?.results || []);
        if (results[7].status === "fulfilled") setScifi(results[7].value?.results || []);
        if (results[8].status === "fulfilled") setCrime(results[8].value?.results || []);
        if (results[9].status === "fulfilled") setAnime(results[9].value || []);
        if (results[10].status === "fulfilled") setKdramas(results[10].value || []);
        if (results[11].status === "fulfilled") setMostWatched(results[11].value || []);
        if (results[12].status === "fulfilled") setAwardWinning(results[12].value || []);
        if (results[13].status === "fulfilled") setHiddenGems(results[13].value || []);
        if (results[14].status === "fulfilled") setEditorsPicks(results[14].value || []);
        if (results[15].status === "fulfilled") setBecauseYouWatched(results[15].value || { sourceTitle: "", results: [] });
        if (results[16].status === "fulfilled") setBollywood(results[16].value || []);
        if (results[17].status === "fulfilled") setTollywood(results[17].value || []);

      } catch (err) {
        console.error("Error loading home sections data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [user]); // Re-fetch personalized data if user profile changes

  if (loading) {
    return <Loader />;
  }

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
    return all.sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));
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
      <HeroSlider items={trending.length > 0 ? trending : topRated} type="movie" />

      {/* Content Rows */}
      <div className="space-y-2 mt-4">
        
        {/* 1. Trending Movies */}
        <MediaSlider title="Trending Movies" items={trending} type="movie" viewMoreLink="/movies/trending" />

        {/* 2. Top Rated */}
        <MediaSlider title="Top Rated Content" items={topRated} type="movie" viewMoreLink="/movies/top-rated" />

        {/* Bollywood Hits */}
        {bollywood.length > 0 && (
          <MediaSlider title="Bollywood Hits" items={bollywood} type="movie" viewMoreLink="/movies/bollywood" />
        )}

        {/* Tollywood & South Cinema */}
        {tollywood.length > 0 && (
          <MediaSlider title="Tollywood & South Cinema" items={tollywood} type="movie" viewMoreLink="/movies/tollywood" />
        )}

        {/* 3. Continue Watching (Only for Logged-In Users with history) */}
        {user && mergedContinue.length > 0 && (
          <MediaSlider title="Continue Watching" items={mergedContinue} type="movie" />
        )}

        {/* 4. Recommended For You */}
        <MediaSlider 
          title={user ? "Recommended For You" : "Recommended Blockbusters"} 
          items={recommended} 
          type="movie" 
          viewMoreLink="/movies/recommended"
        />

        {/* 5. New Releases */}
        <MediaSlider title="New Releases" items={newReleases} type="movie" viewMoreLink="/movies/new-releases" />

        {/* 6. Upcoming / Coming Soon */}
        <MediaSlider title="Coming Soon" items={upcoming} type="movie" viewMoreLink="/movies/upcoming" />

        {/* 7. Genre Collections */}
        <MediaSlider title="Action & Adventure" items={action} type="movie" viewMoreLink="/movies/action" />
        <MediaSlider title="Comedy Specials" items={comedy} type="movie" viewMoreLink="/movies/comedy" />
        <MediaSlider title="Sci-Fi & Fantasy" items={scifi} type="movie" viewMoreLink="/movies/scifi" />
        <MediaSlider title="Crime & Thrillers" items={crime} type="movie" viewMoreLink="/movies/crime" />

        {/* 8. Anime Collection */}
        <MediaSlider title="Anime Collection" items={anime} type="tv" viewMoreLink="/anime/trending" />

        {/* 9. Korean Dramas */}
        <MediaSlider title="Korean Dramas" items={kdramas} type="tv" viewMoreLink="/tv/kdramas" />

        {/* 10. Most Watched This Week */}
        <MediaSlider title="Most Watched This Week" items={mostWatched} type="tv" viewMoreLink="/tv/trending" />

        {/* 11. Award Winning Shows */}
        <MediaSlider title="Award Winning Shows" items={awardWinning} type="movie" viewMoreLink="/movies/award-winning" />

        {/* 12. Hidden Gems */}
        <MediaSlider title="Hidden Gems" items={hiddenGems} type="movie" viewMoreLink="/movies/hidden-gems" />

        {/* 13. Editor's Picks */}
        <MediaSlider title="Editor's Picks" items={editorsPicks} type="movie" viewMoreLink="/movies/editors-picks" />

        {/* 14. Because You Watched [Dynamic Title] */}
        {becauseYouWatched.results && becauseYouWatched.results.length > 0 && (
          <MediaSlider 
            title={`Because You Watched: ${becauseYouWatched.sourceTitle}`} 
            items={becauseYouWatched.results} 
            type="movie" 
            viewMoreLink="/movies/because-you-watched"
          />
        )}

        {/* 15. Continue From Last Session Banner */}
        {lastSessionItem && (
          <div className="px-8 md:px-12 py-10 w-full bg-black">
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/60 shadow-2xl flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 backdrop-blur-xl">
              {/* background thumbnail watermark */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <img
                  src={`https://image.tmdb.org/t/p/w780${lastSessionItem.poster_path}`}
                  alt=""
                  className="w-full h-full object-cover filter blur-sm scale-110"
                />
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <img
                  src={`https://image.tmdb.org/t/p/w185${lastSessionItem.poster_path}`}
                  alt={lastSessionItem.title || lastSessionItem.name}
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
                    Last active: {new Date(lastSessionItem.watchedAt).toLocaleDateString("en-US", {
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
                className="relative z-10 mt-6 md:mt-0 gradient-btn text-white text-sm font-semibold px-6 py-3 rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-lg hover:shadow-pink-500/10 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M8 5V19L19 12L8 5Z" />
                </svg>
                Resume Watching
              </button>
            </div>
          </div>
        )}

        {/* 16. Recently Viewed */}
        {user && mergedContinue.length > 0 && (
          <MediaSlider title="Recently Viewed History" items={mergedContinue} type="movie" />
        )}

        {/* 17. Watchlist */}
        {user && mergedWatchlist.length > 0 && (
          <MediaSlider title="My Watchlist" items={mergedWatchlist} type="movie" />
        )}

      </div>
    </div>
  );
};

export default Home;