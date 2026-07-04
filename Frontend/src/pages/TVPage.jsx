import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getTVShowList,
  getPersonalizedRecommendations,
  getBecauseYouWatched,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import HeroSlider from "../components/HeroSlider";
import MediaSlider from "../components/MediaSlider";
import LazyMediaRow from "../components/LazyMediaRow";
import Loader from "../components/Loader";
import { SEOHead, generateBreadcrumbJsonLd } from "../seo";


const TVPage = () => {
  const navigate = useNavigate();
  const { user, getWatchlist, getContinueWatching } = useAuth();
  const [heroItems, setHeroItems] = useState([]);
  const [loadingHero, setLoadingHero] = useState(true);

  // Fetch traditional TV trending shows initially for the Hero Slider
  useEffect(() => {
    const fetchHero = async () => {
      try {
        setLoadingHero(true);
        const data = await getTVShowList("trending", 1);
        setHeroItems(data || []);
      } catch (err) {
        console.error("Error loading TV page hero:", err);
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

  const continueWatching = getContinueWatching("tv");
  const watchlist = getWatchlist("tv");
  const lastSessionItem = continueWatching[0] || null;

  return (
    <div className="min-h-screen bg-black text-white pb-12 select-none font-[Inter]">
      <SEOHead
        title="Browse TV Shows — Popular, Trending & Top Rated"
        description="Explore the best collection of TV series and shows online. Stream trending, top-rated, comedy, drama, and reality series on MoviGenix."
        keywords="watch TV shows, best TV shows, top rated TV shows, trending TV series, TV recommendations, stream shows"
        canonicalPath="/tv"
        jsonLd={generateBreadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "TV Shows", path: "/tv" }])}
      />
      {/* Hero Section */}
      <HeroSlider items={heroItems.length > 0 ? heroItems : []} type="tv" />

      {/* Landing View with Traditional TV Sections */}
      <div className="relative z-20 -mt-16 md:-mt-24 space-y-2">
        {/* Continue Watching (TV shows only) */}
        {user && continueWatching.length > 0 && (
          <MediaSlider title="Continue Watching" items={continueWatching} type="tv" />
        )}

        {/* 1. Trending TV Shows */}
        <LazyMediaRow
          title="Trending TV Shows"
          fetchFn={() => getTVShowList("trending")}
          type="tv"
          viewMoreLink="/tv/trending"
        />

        {/* 2. Popular TV Shows */}
        <LazyMediaRow
          title="Popular TV Shows"
          fetchFn={() => getTVShowList("popular")}
          type="tv"
          viewMoreLink="/tv/popular"
        />

        {/* 3. Crime Shows */}
        <LazyMediaRow
          title="Crime Shows"
          fetchFn={() => getTVShowList("crime")}
          type="tv"
          viewMoreLink="/tv/crime"
        />

        {/* 4. Comedy Shows */}
        <LazyMediaRow
          title="Comedy Shows"
          fetchFn={() => getTVShowList("comedy")}
          type="tv"
          viewMoreLink="/tv/comedy"
        />

        {/* 5. Reality Shows */}
        <LazyMediaRow
          title="Reality Shows"
          fetchFn={() => getTVShowList("reality")}
          type="tv"
          viewMoreLink="/tv/reality"
        />

        {/* 6. Family Dramas */}
        <LazyMediaRow
          title="Family Dramas"
          fetchFn={() => getTVShowList("family-dramas")}
          type="tv"
          viewMoreLink="/tv/family-dramas"
        />

        {/* 7. Daily Soaps */}
        <LazyMediaRow
          title="Daily Soaps"
          fetchFn={() => getTVShowList("daily-soaps")}
          type="tv"
          viewMoreLink="/tv/daily-soaps"
        />

        {/* 8. TV Classics */}
        <LazyMediaRow
          title="TV Classics"
          fetchFn={() => getTVShowList("tv-classics")}
          type="tv"
          viewMoreLink="/tv/tv-classics"
        />

        {/* 9. Most Watched This Week */}
        <LazyMediaRow
          title="Most Watched This Week"
          fetchFn={() => getTVShowList("most-watched")}
          type="tv"
          viewMoreLink="/tv/most-watched"
        />

        {/* 10. Recommended For You */}
        <LazyMediaRow
          title="Recommended For You"
          fetchFn={() => getPersonalizedRecommendations("tv")}
          type="tv"
          viewMoreLink="/tv/recommended"
          isAuthRequired={true}
        />

        {/* 11. Because You Watched */}
        <LazyMediaRow
          title="Because You Watched"
          fetchFn={() => getBecauseYouWatched("tv")}
          type="tv"
          viewMoreLink="/tv/because-you-watched"
          isAuthRequired={true}
          isDynamic={true}
        />

        {/* Watchlist */}
        {user && watchlist.length > 0 && (
          <MediaSlider title="TV Watchlist" items={watchlist} type="tv" />
        )}
      </div>

      {/* Continue From Last Session Banner */}
      {lastSessionItem && (
        <div className="px-8 md:px-12 py-10 w-full bg-black">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/60 shadow-2xl flex flex-col md:flex-row items-center justify-between p-6 sm:p-8 backdrop-blur-xl">
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
