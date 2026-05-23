import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Autoplay, Navigation, Pagination } from "swiper/modules";

const HeroSlider = ({ items = [], type = "movie" }) => {
  const [expandedMovie, setExpandedMovie] = useState(null);

  if (!items || items.length === 0) return null;

  // Limit to top 6 items for the hero section
  const heroItems = items.slice(0, 6);

  return (
    <div className="relative w-full h-[65vh] md:h-[85vh] bg-black">
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
            ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
            : `https://image.tmdb.org/t/p/original${item.poster_path}`;

          return (
            <SwiperSlide key={item.id}>
              <div className="relative w-full h-full text-white">
                {/* Backdrop Image */}
                <img
                  className="absolute inset-0 w-full h-full object-cover"
                  src={backdropUrl}
                  alt={title}
                  loading="eager"
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent"></div>

                {/* Content Container */}
                <div className="absolute bottom-28 md:bottom-36 left-6 md:left-12 max-w-2xl z-10 px-4 md:px-0">
                  {/* Rating & Release Year */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex items-center gap-1 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">
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
                    {item.release_date || item.first_air_date ? (
                      <span className="text-gray-300 text-sm font-medium">
                        {(item.release_date || item.first_air_date).slice(0, 4)}
                      </span>
                    ) : null}
                    <span className="text-gray-400 text-xs uppercase border border-gray-500 px-1.5 py-0.25 rounded">
                      {type === "movie" ? "Movie" : type === "cartoon" ? "Cartoon" : type === "tv" ? "TV Show" : "Anime"}
                    </span>
                  </div>

                  {/* Logo / Title */}
                  {item.logoPath ? (
                    <img
                      className="h-16 md:h-24 mb-4 object-contain"
                      src={`https://image.tmdb.org/t/p/original${item.logoPath}`}
                      alt={title}
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
                            setExpandedMovie(
                              expandedMovie === item.id ? null : item.id
                            );
                          }}
                        >
                          {expandedMovie === item.id ? " less" : "... more"}
                        </span>
                      )}
                    </p>
                  )}

                  {/* CTA Buttons */}
                  <div className="flex items-center gap-4">
                    <Link
                      to={`/${type}/${item.id}`}
                      className="cursor-pointer flex items-center gap-2 bg-[#ffc600] hover:bg-[#e0af00] text-black px-6 py-3 font-bold rounded-xl transition duration-200 active:scale-95 shadow-lg font-[Inter]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Watch Now
                    </Link>

                    <Link
                      to={`/${type}/${item.id}`}
                      className="cursor-pointer flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-6 py-3 font-semibold rounded-xl transition duration-200 active:scale-95 shadow-lg font-[Inter]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="w-5 h-5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 17v-5" />
                        <circle cx="12" cy="8" r="0.75" fill="currentColor" />
                      </svg>
                      More Info
                    </Link>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

export default HeroSlider;
