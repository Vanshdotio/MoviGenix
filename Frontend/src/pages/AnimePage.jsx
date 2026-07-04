import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  getPersonalizedRecommendations,
  getBecauseYouWatched,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import HeroSlider from "../components/HeroSlider";
import MediaSlider from "../components/MediaSlider";
import Loader from "../components/Loader";
import { SEOHead, generateBreadcrumbJsonLd } from "../seo";


const AnimePage = () => {
  const navigate = useNavigate();
  const { user, getWatchlist, getContinueWatching } = useAuth();
  
  // Section states
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [popularAnime, setPopularAnime] = useState([]);
  const [topRatedAnime, setTopRatedAnime] = useState([]);
  const [airingNow, setAiringNow] = useState([]);
  const [upcomingEpisodes, setUpcomingEpisodes] = useState([]);
  const [newlyAdded, setNewlyAdded] = useState([]);
  const [animeCollection, setAnimeCollection] = useState([]);
  const [hindiDub, setHindiDub] = useState([]);
  const [englishDub, setEnglishDub] = useState([]);
  const [subbed, setSubbed] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [editorsPicks, setEditorsPicks] = useState([]);
  const [recommendedAnime, setRecommendedAnime] = useState([]);
  const [becauseYouWatched, setBecauseYouWatched] = useState({ sourceTitle: "", results: [] });

  const [loadingPage, setLoadingPage] = useState(true);

  // Load initial content
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoadingPage(true);
        const endpoints = [
          getAnimeTrending(),                         // 0
          getAnimePopular(),                          // 1
          getAnimeTopRated(),                         // 2
          getAnimeAiringNow(),                        // 3
          getAnimeUpcoming(),                         // 4
          getAnimeNewlyAdded(),                       // 5
          getAnimeCollection(),                       // 6
          getAnimeHindiDub(),                         // 7
          getAnimeEnglishDub(),                       // 8
          getAnimeSubbed(),                           // 9
          getAnimeHiddenGems(),                       // 10
          getAnimeEditorsPicks(),                     // 11
          getPersonalizedRecommendations("anime"),    // 12
          getBecauseYouWatched("anime"),              // 13
        ];

        const results = await Promise.allSettled(endpoints);

        if (results[0].status === "fulfilled") setTrendingAnime(results[0].value || []);
        if (results[1].status === "fulfilled") setPopularAnime(results[1].value || []);
        if (results[2].status === "fulfilled") setTopRatedAnime(results[2].value || []);
        if (results[3].status === "fulfilled") setAiringNow(results[3].value || []);
        if (results[4].status === "fulfilled") setUpcomingEpisodes(results[4].value || []);
        if (results[5].status === "fulfilled") setNewlyAdded(results[5].value || []);
        if (results[6].status === "fulfilled") setAnimeCollection(results[6].value || []);
        if (results[7].status === "fulfilled") setHindiDub(results[7].value || []);
        if (results[8].status === "fulfilled") setEnglishDub(results[8].value || []);
        if (results[9].status === "fulfilled") setSubbed(results[9].value || []);
        if (results[10].status === "fulfilled") setHiddenGems(results[10].value || []);
        if (results[11].status === "fulfilled") setEditorsPicks(results[11].value || []);
        if (results[12].status === "fulfilled") setRecommendedAnime(results[12].value || []);
        if (results[13].status === "fulfilled") setBecauseYouWatched(results[13].value || { sourceTitle: "", results: [] });

      } catch (err) {
        console.error("Error loading Anime page content:", err);
      } finally {
        setLoadingPage(false);
      }
    };

    loadContent();
  }, [user]);

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Get user continueWatching and watchlist specifically for anime
  const continueWatching = getContinueWatching("anime");
  const watchlist = getWatchlist("anime");
  const lastSessionItem = continueWatching[0] || null;

  return (
    <div className="min-h-screen bg-black text-white pb-12 select-none font-[Inter]">
      <SEOHead
        title="Browse Anime — Popular, Trending & Top Rated"
        description="Stream the best anime series online. Explore trending, popular, top-rated, subbed, and dubbed anime on MoviGenix."
        keywords="watch anime, anime online, stream anime, best anime, top rated anime, subbed anime, dubbed anime, MoviGenix"
        canonicalPath="/anime"
        jsonLd={generateBreadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Anime", path: "/anime" }])}
      />
      {/* Hero Section */}
      <HeroSlider items={trendingAnime.length > 0 ? trendingAnime : topRatedAnime} type="anime" />

      {/* Standard Landing View with Anime Sections */}
      <div className="relative z-20 -mt-16 md:-mt-24 space-y-2">
        {/* 1. Continue Watching (Anime only) */}
        {user && continueWatching.length > 0 && (
          <MediaSlider title="Continue Watching" items={continueWatching} type="anime" />
        )}

        {/* 2. Trending Anime */}
        <MediaSlider title="Trending Anime" items={trendingAnime} type="anime" viewMoreLink="/anime/trending" />

        {/* 3. Popular Anime */}
        <MediaSlider title="Popular Anime" items={popularAnime} type="anime" viewMoreLink="/anime/popular" />

        {/* 4. Top Rated Anime */}
        <MediaSlider title="Top Rated Anime" items={topRatedAnime} type="anime" viewMoreLink="/anime/top-rated" />

        {/* 5. Airing Now */}
        <MediaSlider title="Airing Now" items={airingNow} type="anime" viewMoreLink="/anime/airing-now" />

        {/* 6. Upcoming Episodes */}
        <MediaSlider title="Upcoming Episodes" items={upcomingEpisodes} type="anime" viewMoreLink="/anime/upcoming" />

        {/* 7. Newly Added Anime */}
        <MediaSlider title="Newly Added Anime" items={newlyAdded} type="anime" viewMoreLink="/anime/newly-added" />

        {/* 8. Anime Collection */}
        <MediaSlider title="Anime Collection" items={animeCollection} type="anime" viewMoreLink="/anime/collection" />

        {/* 9. Hindi Dubbed Anime */}
        <MediaSlider title="Hindi Dubbed Anime" items={hindiDub} type="anime" viewMoreLink="/anime/hindi-dub" />

        {/* 10. English Dubbed Anime */}
        <MediaSlider title="English Dubbed Anime" items={englishDub} type="anime" viewMoreLink="/anime/english-dub" />

        {/* 11. Subbed Anime */}
        <MediaSlider title="Subbed Anime" items={subbed} type="anime" viewMoreLink="/anime/subbed" />


        {/* 13. Editor's Picks */}
        <MediaSlider title="Editor's Picks" items={editorsPicks} type="anime" viewMoreLink="/anime/editors-picks" />

        {/* 14. Recommended Anime */}
        <MediaSlider
          title={user ? "Recommended For You" : "Recommended Anime"}
          items={recommendedAnime}
          type="anime"
          viewMoreLink="/anime/recommended"
        />

        {/* 15. Because You Watched */}
        {becauseYouWatched.results && becauseYouWatched.results.length > 0 && (
          <MediaSlider
            title={`Because You Watched: ${becauseYouWatched.sourceTitle}`}
            items={becauseYouWatched.results}
            type="anime"
            viewMoreLink="/anime/because-you-watched"
          />
        )}

        {/* 16. Anime Watchlist */}
        {user && watchlist.length > 0 && (
          <MediaSlider title="Anime Watchlist" items={watchlist} type="anime" />
        )}
      </div>

      {/* Continue From Last Episode (Anime banner at the bottom) */}
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
                  Continue From Last Episode
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  {lastSessionItem.title || lastSessionItem.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Season {lastSessionItem.season || 1}, Episode {lastSessionItem.episode || 1}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
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
              onClick={() => navigate(`/anime/${lastSessionItem.animeId || lastSessionItem.id}`)}
              className="relative z-10 mt-6 md:mt-0 gradient-btn text-white text-sm font-semibold px-6 py-3 rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-lg hover:shadow-pink-500/10 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M8 5V19L19 12L8 5Z" />
              </svg>
              Resume Episode
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimePage;
