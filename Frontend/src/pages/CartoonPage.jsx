import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
  getPersonalizedRecommendations,
  getBecauseYouWatched,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import HeroSlider from "../components/HeroSlider";
import MediaSlider from "../components/MediaSlider";
import Loader from "../components/Loader";

const CartoonPage = () => {
  const navigate = useNavigate();
  const { user, getWatchlist, getContinueWatching } = useAuth();
  
  // Section states
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [hindiDubbed, setHindiDubbed] = useState([]);
  const [english, setEnglish] = useState([]);
  const [multiAudio, setMultiAudio] = useState([]);
  const [collection, setCollection] = useState([]);
  const [adventure, setAdventure] = useState([]);
  const [comedy, setComedy] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [editorsPicks, setEditorsPicks] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [becauseYouWatched, setBecauseYouWatched] = useState({ sourceTitle: "", results: [] });

  const [loadingPage, setLoadingPage] = useState(true);

  // Load initial content
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoadingPage(true);
        const endpoints = [
          getCartoonTrending(),                         // 0
          getCartoonPopular(),                          // 1
          getCartoonTopRated(),                          // 2
          getCartoonHindiDubbed(),                       // 3
          getCartoonEnglish(),                           // 4
          getCartoonMultiAudio(),                         // 5
          getCartoonCollection(),                        // 6
          getCartoonAdventure(),                         // 7
          getCartoonComedy(),                            // 8
          getCartoonHiddenGems(),                        // 9
          getCartoonEditorsPicks(),                      // 10
          getPersonalizedRecommendations("cartoon"),     // 11
          getBecauseYouWatched("cartoon"),               // 12
        ];

        const results = await Promise.allSettled(endpoints);

        if (results[0].status === "fulfilled") setTrending(results[0].value || []);
        if (results[1].status === "fulfilled") setPopular(results[1].value || []);
        if (results[2].status === "fulfilled") setTopRated(results[2].value || []);
        if (results[3].status === "fulfilled") setHindiDubbed(results[3].value || []);
        if (results[4].status === "fulfilled") setEnglish(results[4].value || []);
        if (results[5].status === "fulfilled") setMultiAudio(results[5].value || []);
        if (results[6].status === "fulfilled") setCollection(results[6].value || []);
        if (results[7].status === "fulfilled") setAdventure(results[7].value || []);
        if (results[8].status === "fulfilled") setComedy(results[8].value || []);
        if (results[9].status === "fulfilled") setHiddenGems(results[9].value || []);
        if (results[10].status === "fulfilled") setEditorsPicks(results[10].value || []);
        if (results[11].status === "fulfilled") setRecommended(results[11].value || []);
        if (results[12].status === "fulfilled") setBecauseYouWatched(results[12].value || { sourceTitle: "", results: [] });

      } catch (err) {
        console.error("Error loading Cartoon page content:", err);
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

  // Get user continueWatching and watchlist specifically for cartoons
  const continueWatching = getContinueWatching("cartoon");
  const watchlist = getWatchlist("cartoon");
  const lastSessionItem = continueWatching[0] || null;

  return (
    <div className="min-h-screen bg-black text-white pb-12 select-none font-[Inter]">
      {/* Hero Section */}
      <HeroSlider items={trending.length > 0 ? trending : popular} type="cartoon" />

      {/* Standard Landing View with Cartoon Sections */}
      <div className="relative z-20 -mt-16 md:-mt-24 space-y-2">
        {/* 1. Continue Watching (Cartoons only) */}
        {user && continueWatching.length > 0 && (
          <MediaSlider title="Continue Watching" items={continueWatching} type="cartoon" />
        )}

        {/* 2. Trending Cartoons */}
        <MediaSlider title="Trending Cartoons" items={trending} type="cartoon" viewMoreLink="/cartoon/trending" />

        {/* 3. Popular Cartoons */}
        <MediaSlider title="Popular Cartoons" items={popular} type="cartoon" viewMoreLink="/cartoon/popular" />

        {/* 4. Top Rated Cartoons */}
        <MediaSlider title="Top Rated Cartoons" items={topRated} type="cartoon" viewMoreLink="/cartoon/top-rated" />

        {/* 5. Hindi Dubbed Cartoons */}
        <MediaSlider title="Hindi Dubbed Cartoons" items={hindiDubbed} type="cartoon" viewMoreLink="/cartoon/hindi-dubbed" />

        {/* 6. English Cartoons */}
        <MediaSlider title="English Cartoons" items={english} type="cartoon" viewMoreLink="/cartoon/english" />

        {/* 7. Multi Audio Cartoons */}
        <MediaSlider title="Multi Audio Cartoons" items={multiAudio} type="cartoon" viewMoreLink="/cartoon/multi-audio" />

        {/* 8. Cartoon Collection */}
        <MediaSlider title="Cartoon Collection" items={collection} type="cartoon" viewMoreLink="/cartoon/collection" />

        {/* 9. Adventure Cartoons */}
        <MediaSlider title="Adventure Cartoons" items={adventure} type="cartoon" viewMoreLink="/cartoon/adventure" />

        {/* 10. Comedy Cartoons */}
        <MediaSlider title="Comedy Cartoons" items={comedy} type="cartoon" viewMoreLink="/cartoon/comedy" />


        {/* 12. Editor's Picks */}
        <MediaSlider title="Editor's Picks" items={editorsPicks} type="cartoon" viewMoreLink="/cartoon/editors-picks" />

        {/* 13. Recommended Cartoons */}
        <MediaSlider
          title={user ? "Recommended For You" : "Recommended Cartoons"}
          items={recommended}
          type="cartoon"
          viewMoreLink="/cartoon/recommended"
        />

        {/* 14. Because You Watched */}
        {becauseYouWatched.results && becauseYouWatched.results.length > 0 && (
          <MediaSlider
            title={`Because You Watched: ${becauseYouWatched.sourceTitle}`}
            items={becauseYouWatched.results}
            type="cartoon"
            viewMoreLink="/cartoon/because-you-watched"
          />
        )}

        {/* 15. Cartoon Watchlist */}
        {user && watchlist.length > 0 && (
          <MediaSlider title="Cartoon Watchlist" items={watchlist} type="cartoon" />
        )}
      </div>

      {/* Continue From Last Episode (Cartoon banner at the bottom) */}
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
              onClick={() => navigate(`/cartoon/${lastSessionItem.cartoonId || lastSessionItem.id}`)}
              className="relative z-10 mt-6 md:mt-0 gradient-btn text-white text-sm font-semibold px-6 py-3 rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-lg hover:shadow-pink-500/10 cursor-pointer border-none"
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

export default CartoonPage;
