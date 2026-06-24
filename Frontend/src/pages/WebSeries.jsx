import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getWebSeriesList,
  getWebSeriesRecommendations
} from "../services/api";
import HeroSlider from "../components/HeroSlider";
import MediaSlider from "../components/MediaSlider";
import LazyMediaRow from "../components/LazyMediaRow";
import Loader from "../components/Loader";

const WebSeries = () => {
  const navigate = useNavigate();
  const { user, getWatchlist, getContinueWatching } = useAuth();
  const [heroItems, setHeroItems] = useState([]);
  const [loadingHero, setLoadingHero] = useState(true);

  // Fetch trending initially just for hero slider
  useEffect(() => {
    const fetchHero = async () => {
      try {
        setLoadingHero(true);
        const data = await getWebSeriesList("trending", 1);
        setHeroItems(data || []);
      } catch (err) {
        console.error("Error loading Web Series hero:", err);
      } finally {
        setLoadingHero(false);
      }
    };
    fetchHero();
  }, []);

  if (loadingHero) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  const continueWatching = getContinueWatching("webSeries");
  const watchlist = getWatchlist("webSeries");
  const lastSessionItem = continueWatching[0] || null;

  return (
    <div className="min-h-screen bg-black text-white pb-12 select-none font-[Inter]">
      {/* Hero Section */}
      <HeroSlider items={heroItems.length > 0 ? heroItems : []} type="web-series" />

      {/* Landing View with Web Series Sections */}
      <div className="relative z-20 -mt-16 md:-mt-24 space-y-2">
        {/* Continue Watching */}
        {user && continueWatching.length > 0 && (
          <MediaSlider title="Continue Watching" items={continueWatching} type="web-series" />
        )}

        {/* 1. Trending Web Series */}
        <LazyMediaRow
          title="Trending Web Series"
          fetchFn={() => getWebSeriesList("trending")}
          type="web-series"
          viewMoreLink="/web-series/trending"
        />

        {/* 2. Top Rated Web Series */}
        <LazyMediaRow
          title="Top Rated Web Series"
          fetchFn={() => getWebSeriesList("top-rated")}
          type="web-series"
          viewMoreLink="/web-series/top-rated"
        />

        {/* 3. Indian Web Series */}
        <LazyMediaRow
          title="Indian Web Series"
          fetchFn={() => getWebSeriesList("indian")}
          type="web-series"
          viewMoreLink="/web-series/indian"
        />

        {/* 4. International Web Series */}
        <LazyMediaRow
          title="International Web Series"
          fetchFn={() => getWebSeriesList("international")}
          type="web-series"
          viewMoreLink="/web-series/international"
        />

        {/* 5. Crime Web Series */}
        <LazyMediaRow
          title="Crime Web Series"
          fetchFn={() => getWebSeriesList("crime")}
          type="web-series"
          viewMoreLink="/web-series/crime"
        />

        {/* 6. Thriller Web Series */}
        <LazyMediaRow
          title="Thriller Web Series"
          fetchFn={() => getWebSeriesList("thriller")}
          type="web-series"
          viewMoreLink="/web-series/thriller"
        />

        {/* 7. Recommended For You */}
        <LazyMediaRow
          title="Recommended For You"
          fetchFn={() => getWebSeriesRecommendations()}
          type="web-series"
          viewMoreLink="/web-series/recommended"
          isAuthRequired={true}
        />

        {/* Watchlist */}
        {user && watchlist.length > 0 && (
          <MediaSlider title="Web Series Watchlist" items={watchlist} type="web-series" />
        )}
      </div>

      {/* Continue watching floating panel / banner */}
      {lastSessionItem && (
        <div className="px-8 md:px-12 py-10 w-full bg-black">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/60 shadow-2xl flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 backdrop-blur-xl">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <img
                src={`https://image.tmdb.org/t/p/w780${lastSessionItem.backdrop_path || lastSessionItem.poster_path}`}
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
                  Last active: {new Date(lastSessionItem.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/web-series/${lastSessionItem.id}`)}
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

export default WebSeries;