import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getTVTrending,
  getTVPopular,
  getTVTopRated,
  getTVDrama,
  getTVComedy,
  getTVCrime,
  getTVThriller,
  getTVReality,
  getTVHiddenGems,
  getTVTrendingInternational,
  getTVHollywood,
  getPersonalizedRecommendations,
  getBecauseYouWatched,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import HeroSlider from "../components/HeroSlider";
import MediaSlider from "../components/MediaSlider";
import Loader from "../components/Loader";

const TVPage = () => {
  const navigate = useNavigate();
  const { user, getWatchlist, getContinueWatching } = useAuth();
  
  // Section states
  const [trendingTV, setTrendingTV] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [topRatedTV, setTopRatedTV] = useState([]);
  const [drama, setDrama] = useState([]);
  const [comedy, setComedy] = useState([]);
  const [crime, setCrime] = useState([]);
  const [thriller, setThriller] = useState([]);
  const [reality, setReality] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [trendingInternational, setTrendingInternational] = useState([]);
  const [hollywood, setHollywood] = useState([]);
  const [recommendedTV, setRecommendedTV] = useState([]);
  const [becauseYouWatched, setBecauseYouWatched] = useState({ sourceTitle: "", results: [] });

  const [loadingPage, setLoadingPage] = useState(true);

  // Load initial content
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoadingPage(true);
        const endpoints = [
          getTVTrending(),                           // 0
          getTVPopular(),                            // 1
          getTVTopRated(),                           // 2
          getTVDrama(),                              // 3
          getTVComedy(),                             // 4
          getTVCrime(),                              // 5
          getTVThriller(),                           // 6
          getTVReality(),                            // 7
          getTVHiddenGems(),                         // 8
          getTVTrendingInternational(),              // 9
          getTVHollywood(),                          // 10
          getPersonalizedRecommendations("tv"),      // 11
          getBecauseYouWatched("tv"),                // 12
        ];

        const results = await Promise.allSettled(endpoints);

        if (results[0].status === "fulfilled") setTrendingTV(results[0].value || []);
        if (results[1].status === "fulfilled") setPopularTV(results[1].value || []);
        if (results[2].status === "fulfilled") setTopRatedTV(results[2].value || []);
        if (results[3].status === "fulfilled") setDrama(results[3].value || []);
        if (results[4].status === "fulfilled") setComedy(results[4].value || []);
        if (results[5].status === "fulfilled") setCrime(results[5].value || []);
        if (results[6].status === "fulfilled") setThriller(results[6].value || []);
        if (results[7].status === "fulfilled") setReality(results[7].value || []);
        if (results[8].status === "fulfilled") setHiddenGems(results[8].value || []);
        if (results[9].status === "fulfilled") setTrendingInternational(results[9].value || []);
        if (results[10].status === "fulfilled") setHollywood(results[10].value || []);
        if (results[11].status === "fulfilled") setRecommendedTV(results[11].value || []);
        if (results[12].status === "fulfilled") setBecauseYouWatched(results[12].value || { sourceTitle: "", results: [] });

      } catch (err) {
        console.error("Error loading TV page content:", err);
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

  // Get user lists using context helpers
  const continueWatching = getContinueWatching("tv");
  const watchlist = getWatchlist("tv");
  const lastSessionItem = continueWatching[0] || null;

  return (
    <div className="min-h-screen bg-black text-white pb-12 select-none font-[Inter]">
      {/* Hero Section */}
      <HeroSlider items={trendingTV.length > 0 ? trendingTV : popularTV} type="tv" />

      {/* Standard Landing View with TV Sections */}
      <div className="relative z-20 -mt-16 md:-mt-24 space-y-2">
        {/* 1. Continue Watching (TV only) */}
        {user && continueWatching.length > 0 && (
          <MediaSlider title="Continue Watching" items={continueWatching} type="tv" />
        )}

        {/* 2. Trending Indian Shows */}
        <MediaSlider title="Trending Indian Shows" items={trendingTV} type="tv" viewMoreLink="/tv/trending" />

        {/* 3. Popular Indian Shows */}
        <MediaSlider title="Popular Indian Shows" items={popularTV} type="tv" viewMoreLink="/tv/popular" />

        {/* 4. Top Rated Indian Shows */}
        <MediaSlider title="Top Rated Indian Shows" items={topRatedTV} type="tv" viewMoreLink="/tv/top-rated" />

        {/* 5. Indian Drama */}
        <MediaSlider title="Indian Drama" items={drama} type="tv" viewMoreLink="/tv/drama" />

        {/* 6. Indian Comedy */}
        <MediaSlider title="Indian Comedy" items={comedy} type="tv" viewMoreLink="/tv/comedy" />

        {/* 7. Indian Crime */}
        <MediaSlider title="Indian Crime" items={crime} type="tv" viewMoreLink="/tv/crime" />

        {/* 8. Indian Thriller */}
        <MediaSlider title="Indian Thrillers" items={thriller} type="tv" viewMoreLink="/tv/thriller" />

        {/* 9. Indian Reality Shows */}
        <MediaSlider title="Indian Reality Shows" items={reality} type="tv" viewMoreLink="/tv/reality" />


        {/* 11. Trending International */}
        <MediaSlider title="Trending International" items={trendingInternational} type="tv" viewMoreLink="/tv/trending-international" />

        {/* 12. Top Hollywood Shows */}
        <MediaSlider title="Top Hollywood Shows" items={hollywood} type="tv" viewMoreLink="/tv/hollywood" />

        {/* 13. Recommended Shows */}
        <MediaSlider
          title={user ? "Recommended For You" : "Recommended TV Shows"}
          items={recommendedTV}
          type="tv"
          viewMoreLink="/tv/recommended"
        />

        {/* 14. Because You Watched */}
        {becauseYouWatched.results && becauseYouWatched.results.length > 0 && (
          <MediaSlider
            title={`Because You Watched: ${becauseYouWatched.sourceTitle}`}
            items={becauseYouWatched.results}
            type="tv"
            viewMoreLink="/tv/because-you-watched"
          />
        )}

        {/* 15. TV Watchlist */}
        {user && watchlist.length > 0 && (
          <MediaSlider title="TV Watchlist" items={watchlist} type="tv" />
        )}
      </div>

      {/* Continue From Last Session Banner (Continue From Last Episode) */}
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
              onClick={() => navigate(`/tv/${lastSessionItem.showId || lastSessionItem.id}`)}
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

export default TVPage;
