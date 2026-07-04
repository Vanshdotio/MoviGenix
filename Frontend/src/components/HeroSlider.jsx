import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { useAuth } from "../context/AuthContext";
import { isUpcomingContent, formatReleaseDate, getCountdownLabel } from "../utils/releaseUtils";

const HeroSlider = ({ items = [], type = "movie" }) => {
  const [expandedMovie, setExpandedMovie] = useState(null);
  const { user, toggleWatchlist, toggleNotifyMe, isNotifiedFor } = useAuth();
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  const heroItems = items.slice(0, 6);

  const isInWatchlist = (itemId) => {
    if (!user?.watchlist) return false;
    if (Array.isArray(user.watchlist)) {
      return user.watchlist.some((w) => w.id === itemId);
    }
    const allItems = [
      ...(user.watchlist.movie || []),
      ...(user.watchlist.cartoon || []),
      ...(user.watchlist.tv || []),
      ...(user.watchlist.anime || []),
    ];
    return allItems.some((w) => w.id === itemId);
  };

  const handleWatchlist = (item) => {
    if (!user) {
      navigate("/login");
      return;
    }
    toggleWatchlist({
      id: item.id,
      type,
      title: item.title || item.name,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
    });
  };

  const handleNotifyMe = (item) => {
    if (!user) {
      navigate("/login");
      return;
    }
    toggleNotifyMe({
      contentId: String(item.id),
      contentType: type,
      title: item.title || item.name,
      releaseDate: item.release_date || item.first_air_date,
    });
  };

  return (
    <div className="relative w-full h-[100vh] md:h-[85vh] bg-black">
      <Swiper
        autoplay={{ delay: 8000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        modules={[Autoplay, Navigation, Pagination]}
        className="w-full h-full"
      >
        {heroItems.map((item) => {
          const title = item.title || item.name || "Untitled";
          const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
          const backdropUrl = item.backdrop_path
            ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
            : `https://image.tmdb.org/t/p/w780${item.poster_path}`;
          const upcoming = isUpcomingContent(item);
          const releaseDateStr = item.release_date || item.first_air_date;
          const notified = isNotifiedFor ? isNotifiedFor(String(item.id)) : false;

          return (
            <SwiperSlide key={item.id}>
              <div className="relative w-full h-full text-white">
                {/* Backdrop Image */}
                <img
                  className="absolute inset-0 w-full h-full object-cover"
                  src={backdropUrl}
                  alt={title}
                  loading="eager"
                  fetchPriority="high"
                  width={1920}
                  height={1080}
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent hidden lg:block"></div>
                
                {/* Bottom Blur Vignette for seamless transition */}
                <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-black via-black/90 to-transparent backdrop-blur-[1.5px] pointer-events-none z-10"></div>

                {/* Upcoming ribbon badge on hero image */}
                {upcoming && (
                  <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-1">
                    <span className="bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                      Coming Soon
                    </span>
                    <span className="bg-black/60 backdrop-blur-sm text-violet-300 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                      {getCountdownLabel(item)}
                    </span>
                  </div>
                )}

                {/* ===== DESKTOP Content (left-aligned, hidden on mobile) ===== */}
                <div className="absolute bottom-16 lg:bottom-24 left-6 lg:left-12 max-w-2xl z-10 px-4 lg:px-0 hidden lg:block">
                  {/* Rating & Release Year */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center gap-1 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M12.0006 18.26L4.94715 22.2082L6.52248 14.2799L0.587891 8.7918L8.61493 7.84006L12.0006 0.5L15.3862 7.84006L23.4132 8.7918L17.4787 14.2799L19.054 22.2082L12.0006 18.26Z"></path>
                      </svg>
                      {rating}
                    </span>
                    {releaseDateStr && (
                      <span className="text-gray-300 text-sm font-medium">
                        {upcoming ? formatReleaseDate(releaseDateStr) : releaseDateStr.slice(0, 4)}
                      </span>
                    )}
                    <span className="text-gray-400 text-xs uppercase border border-gray-500 px-1.5 py-0.25 rounded">
                      {type === "movie" ? "Movie" : type === "cartoon" ? "Cartoon" : type === "tv" ? "TV Show" : type === "web-series" ? "Web Series" : "Anime"}
                    </span>
                    {upcoming && (
                      <span className="text-violet-400 text-xs border border-violet-500/50 px-1.5 py-0.25 rounded bg-violet-500/10">
                        Upcoming
                      </span>
                    )}
                  </div>

                  {/* Logo / Title */}
                  {item.logoPath ? (
                    <img
                      className="h-16 md:h-24 mb-4 object-contain"
                      src={`https://image.tmdb.org/t/p/w500${item.logoPath}`}
                      alt={title}
                      width={240}
                      height={96}
                    />
                  ) : (
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight font-[Inter] leading-tight mb-4 drop-shadow-md">
                      {title}
                    </h1>
                  )}

                  {/* Description */}
                  {item.overview && (
                    <p className="text-sm md:text-base text-gray-300 leading-relaxed drop-shadow max-w-xl mb-6">
                      {expandedMovie === item.id
                        ? item.overview
                        : item.overview.slice(0, 150)}
                      {item.overview.length > 150 && (
                        <span
                          className="text-yellow-400 hover:text-yellow-300 cursor-pointer ml-1 font-semibold"
                          onClick={(e) => {
                            e.preventDefault();
                            setExpandedMovie(expandedMovie === item.id ? null : item.id);
                          }}
                        >
                          {expandedMovie === item.id ? " less" : "... more"}
                        </span>
                      )}
                    </p>
                  )}

                  {/* Desktop CTA Buttons */}
                  <div className="flex items-center gap-4">
                    {upcoming ? (
                      /* Upcoming: Notify Me + Watchlist + More Info */
                      <>
                        <button
                          onClick={() => handleNotifyMe(item)}
                          className={`cursor-pointer flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition duration-200 active:scale-95 shadow-lg font-[Inter] ${
                            notified
                              ? "bg-violet-600 hover:bg-violet-500 text-white"
                              : "bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500 text-violet-300"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M20 17H22V19H2V17H4V10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10V17ZM18 17V10C18 6.68629 15.3137 4 12 4C8.68629 4 6 6.68629 6 10V17H18ZM9 21H15V23H9V21Z" />
                          </svg>
                          {notified ? "Notified ✓" : "Notify Me"}
                        </button>
                        <button
                          onClick={() => handleWatchlist(item)}
                          className={`cursor-pointer flex items-center gap-2 px-6 py-3 font-semibold rounded-xl transition duration-200 active:scale-95 shadow-lg font-[Inter] ${
                            isInWatchlist(item.id)
                              ? "bg-emerald-600/20 border border-emerald-500 text-emerald-400"
                              : "bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isInWatchlist(item.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                            <path d="M5 3H19C20.1046 3 21 3.89543 21 5V21L12 17L3 21V5C3 3.89543 3.89543 3 5 3Z" />
                          </svg>
                          {isInWatchlist(item.id) ? "In Watchlist" : "Add to List"}
                        </button>
                        <Link
                          to={`/${type}/${item.id}`}
                          className="cursor-pointer flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-6 py-3 font-semibold rounded-xl transition duration-200 active:scale-95 shadow-lg font-[Inter]"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 17v-5" />
                            <circle cx="12" cy="8" r="0.75" fill="currentColor" />
                          </svg>
                          More Info
                        </Link>
                      </>
                    ) : (
                      /* Released: Watch Now + More Info */
                      <>
                        <Link
                          to={`/${type}/${item.id}`}
                          className="cursor-pointer flex items-center gap-2 bg-[#ffc600] hover:bg-[#e0af00] text-black px-6 py-3 font-bold rounded-xl transition duration-200 active:scale-95 shadow-lg font-[Inter]"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          Watch Now
                        </Link>
                        <Link
                          to={`/${type}/${item.id}`}
                          className="cursor-pointer flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-6 py-3 font-semibold rounded-xl transition duration-200 active:scale-95 shadow-lg font-[Inter]"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 17v-5" />
                            <circle cx="12" cy="8" r="0.75" fill="currentColor" />
                          </svg>
                          More Info
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* ===== MOBILE Content (centered bottom, hidden on desktop) ===== */}
                <div className="absolute bottom-28 left-0 right-0 z-10 px-6 flex flex-col items-center text-center lg:hidden">
                  {/* Rating & Year & Type Badge */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="flex items-center gap-1 bg-yellow-400 text-black text-[11px] font-bold px-2 py-0.5 rounded">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                        <path d="M12.0006 18.26L4.94715 22.2082L6.52248 14.2799L0.587891 8.7918L8.61493 7.84006L12.0006 0.5L15.3862 7.84006L23.4132 8.7918L17.4787 14.2799L19.054 22.2082L12.0006 18.26Z"></path>
                      </svg>
                      {rating}
                    </span>
                    {releaseDateStr && (
                      <span className="text-gray-300 text-xs font-medium">
                        {upcoming ? formatReleaseDate(releaseDateStr) : releaseDateStr.slice(0, 4)}
                      </span>
                    )}
                    <span className="text-gray-400 text-[10px] uppercase border border-gray-500 px-1.5 py-0.5 rounded">
                      {type === "movie" ? "Movie" : type === "cartoon" ? "Cartoon" : type === "tv" ? "TV Show" : type === "web-series" ? "Web Series" : "Anime"}
                    </span>
                  </div>

                  {/* Title */}
                  {item.logoPath ? (
                    <img
                      className="h-12 mb-3 object-contain"
                      src={`https://image.tmdb.org/t/p/w500${item.logoPath}`}
                      alt={title}
                      width={120}
                      height={48}
                    />
                  ) : (
                    <h1 className="text-2xl font-bold tracking-tight font-[Inter] leading-tight mb-3 drop-shadow-lg">
                      {title}
                    </h1>
                  )}

                  {/* Description (shorter on mobile) */}
                  {item.overview && (
                    <p className="text-xs text-gray-300 leading-relaxed drop-shadow max-w-xs mb-5 line-clamp-2">
                      {item.overview.slice(0, 100)}...
                    </p>
                  )}

                  {/* Mobile CTA */}
                  <div className="flex items-center justify-center gap-6 w-full">
                    {/* Watchlist Button */}
                    <button
                      onClick={() => handleWatchlist(item)}
                      className="flex flex-col items-center gap-1.5 cursor-pointer group"
                    >
                      <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        isInWatchlist(item.id)
                          ? "border-yellow-400 bg-yellow-400/20 text-yellow-400"
                          : "border-white/40 bg-white/10 text-white group-active:scale-90"
                      }`}>
                        {isInWatchlist(item.id) ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-300 font-medium">
                        {isInWatchlist(item.id) ? "Listed" : "My List"}
                      </span>
                    </button>

                    {/* Main CTA: Play or Notify Me */}
                    {upcoming ? (
                      <button
                        onClick={() => handleNotifyMe(item)}
                        className={`flex items-center gap-2 px-8 py-3.5 font-bold rounded-full transition duration-200 active:scale-95 shadow-xl font-[Inter] text-sm ${
                          notified
                            ? "bg-violet-600 text-white"
                            : "bg-violet-600/30 border-2 border-violet-500 text-violet-300"
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M20 17H22V19H2V17H4V10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10V17ZM18 17V10C18 6.68629 15.3137 4 12 4C8.68629 4 6 6.68629 6 10V17H18ZM9 21H15V23H9V21Z" />
                        </svg>
                        {notified ? "Notified" : "Notify Me"}
                      </button>
                    ) : (
                      <Link
                        to={`/${type}/${item.id}`}
                        className="flex items-center gap-2 bg-[#ffc600] hover:bg-[#e0af00] text-black px-8 py-3.5 font-bold rounded-full transition duration-200 active:scale-95 shadow-xl font-[Inter] text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Play
                      </Link>
                    )}

                    {/* Details Button */}
                    <Link
                      to={`/${type}/${item.id}`}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className="w-11 h-11 rounded-full border-2 border-white/40 bg-white/10 flex items-center justify-center text-white group-active:scale-90 transition-all duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 17v-5" />
                          <circle cx="12" cy="8" r="0.75" fill="currentColor" />
                        </svg>
                      </div>
                      <span className="text-[10px] text-gray-300 font-medium">Details</span>
                    </Link>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Bottom gradient fade for smooth transition to content below */}
      <div className="absolute bottom-0 left-0 right-0 h-32 md:h-40 bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none"></div>
    </div>
  );
};

export default HeroSlider;
