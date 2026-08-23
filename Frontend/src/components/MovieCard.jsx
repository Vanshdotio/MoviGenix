import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProgressiveImage from "./ProgressiveImage";
import { isUpcomingContent, formatReleaseDate } from "../utils/releaseUtils";
import { generateSlug } from "../seo";

const MovieCard = ({ movie, type = "movie" }) => {
  const navigate = useNavigate();
  const { user, toggleWatchlist, getWatchlist } = useAuth();

  const title = movie.title || movie.name || "Untitled";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";

  // Responsive Image urls (w92 for tiny preview, w342 for high-res cards)
  const lowResPosterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w92${movie.poster_path}`
    : "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=92&q=60";

  const highResPosterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
    : "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=342&q=80";

  const srcSet = movie.poster_path
    ? `https://image.tmdb.org/t/p/w185${movie.poster_path} 1x, https://image.tmdb.org/t/p/w342${movie.poster_path} 2x`
    : undefined;

  const cardType = type === "anime" ? "anime" : (type === "web-series" ? "web-series" : (movie.media_type || type));

  // Check if item is in user's watchlist
  const watchlist = getWatchlist(cardType);
  const isInWatchlist = watchlist.some((item) => String(item.id || item.movieId || item.showId || item.animeId) === String(movie.id));

  // Release gate check
  const upcoming = isUpcomingContent(movie);
  const releaseDateStr = movie.release_date || movie.first_air_date;

  const handlePlayClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (upcoming) return; // Block play for unreleased content
    navigate(`/${cardType}/${generateSlug(title, movie.id)}`, { state: { autoplay: true } });
  };

  const handleWatchlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate("/login");
      return;
    }

    await toggleWatchlist({
      id: movie.id,
      title: movie.title || movie.name,
      name: movie.name,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      vote_average: movie.vote_average,
      release_date: movie.release_date || movie.first_air_date,
      type: cardType
    });
  };

  return (
    <Link
      to={`/${cardType}/${generateSlug(title, movie.id)}`}
      aria-label={`View details for ${title}`}
      className="group block bg-[#111] rounded-xl overflow-hidden 
                 shadow-md md:hover:shadow-2xl md:hover:-translate-y-1.5 
                 transition-all duration-300 cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-[2/3] overflow-hidden bg-gray-950">
        <ProgressiveImage
          lowResSrc={lowResPosterUrl}
          highResSrc={highResPosterUrl}
          srcSet={srcSet}
          sizes="180px"
          alt={title}
          width={180}
          height={270}
          loading="lazy"
          className="w-full h-full object-cover 
                     md:group-hover:scale-105 
                     transition-all duration-300"
        />

        {/* Rating Badge */}
        <span
          className="absolute flex items-center gap-1 top-2 right-2 bg-black/75 
                         text-yellow-400 text-xs px-2 py-1 rounded-md font-[Inter] font-medium backdrop-blur-sm z-20"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5"
          >
            <path d="M12.0006 18.26L4.94715 22.2082L6.52248 14.2799L0.587891 8.7918L8.61493 7.84006L12.0006 0.5L15.3862 7.84006L23.4132 8.7918L17.4787 14.2799L19.054 22.2082L12.0006 18.26Z"></path>
          </svg>
          {rating}
        </span>

        {/* COMING SOON Badge (top-left, only for upcoming) */}
        {upcoming && (
          <span className="absolute top-2 left-2 z-20  bg-violet-600/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-lg">
            Coming Soon
          </span>
        )}

        {/* Overlay + Title & Quick Action Buttons */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/95 
                        via-black/40 to-transparent 
                        opacity-100 md:opacity-0 
                        md:group-hover:opacity-100 
                        transition-all duration-300 p-3.5 flex flex-col justify-end z-10"
        >
          <p className="text-sm font-[Inter] font-semibold text-white leading-tight line-clamp-2">
            {title}
          </p>

          {/* Show full release date for upcoming, just year for released */}
          {upcoming && releaseDateStr ? (
            <p className="text-[10px] text-violet-300 mt-1 font-[Inter] font-medium">
              {formatReleaseDate(releaseDateStr)}
            </p>
          ) : releaseDateStr ? (
            <p className="text-[11px] text-gray-400 mt-1 font-[Inter]">
              {releaseDateStr.slice(0, 4)}
            </p>
          ) : null}

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 mt-3.5">
            {upcoming ? (
              /* Coming Soon state — show calendar icon + watchlist */
              <>
                <div className="flex-1 shrink-0 bg-violet-600/30 border border-violet-500/50 text-violet-300 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M17 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H7V1H9V3H15V1H17V3ZM19 11H5V19H19V11ZM15 3H9V5H15V3ZM4 9H20V5H4V9Z" />
                  </svg>
                  Coming Soon
                </div>
                <button
                  onClick={handleWatchlistClick}
                  className={`p-2 rounded-lg border text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center shrink-0 ${
                    isInWatchlist
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-emerald-500/30"
                      : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                  }`}
                  title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                  aria-label={isInWatchlist ? `Remove ${title} from Watchlist` : `Add ${title} to Watchlist`}
                >
                  {isInWatchlist ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2211L9.9997 15.1709Z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
                    </svg>
                  )}
                </button>
              </>
            ) : (
              /* Released state — normal play + watchlist */
              <>
                <button
                  onClick={handlePlayClick}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border-none"
                  title="Quick Play"
                  aria-label={`Play ${title}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </button>
                <button
                  onClick={handleWatchlistClick}
                  className={`p-2 rounded-lg border text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center shrink-0 ${
                    isInWatchlist
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-emerald-500/30"
                      : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                  }`}
                  title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                  aria-label={isInWatchlist ? `Remove ${title} from Watchlist` : `Add ${title} to Watchlist`}
                >
                  {isInWatchlist ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2211L9.9997 15.1709Z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
                    </svg>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default React.memo(MovieCard);
