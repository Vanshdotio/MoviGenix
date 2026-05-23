import React, { Suspense } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode } from "swiper/modules";
import MovieCard from "./MovieCard";
import { useAuth } from "../context/AuthContext";

const MediaSlider = ({ title, items = [], type = "movie", viewMoreLink }) => {
  const { removeContinueWatching } = useAuth();

  if (!items || items.length === 0) return null;

  const handleDelete = (item) => {
    removeContinueWatching({
      id: item.movieId || item.showId || item.animeId || item.id,
      type: item.type || type,
    });
  };

  return (
    <div className="flex bg-black p-6 md:p-10 px-8 md:px-12 text-white flex-col font-[Inter] w-full">
      {/* Header Container */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-semibold tracking-wide border-l-4 border-yellow-400 pl-3">
          {title}
        </h2>
        {viewMoreLink && (
          <Link
            to={viewMoreLink}
            className="text-yellow-400 hover:text-yellow-300 font-semibold text-xs md:text-sm flex items-center gap-1.5 transition-all duration-250 group cursor-pointer"
          >
            View More
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
        )}
      </div>

      <div className="select-none py-2">
        <Swiper
          modules={[FreeMode]}
          freeMode={true}
          grabCursor={true}
          spaceBetween={16}
          slidesPerView={"auto"}
          className="mySwiper"
        >
          {items.map((item) => (
            <SwiperSlide
              key={item.id}
              style={{ width: "180px" }} // Fixed card width for consistent design
            >
              <div className="relative group rounded-xl overflow-hidden">
                <Suspense fallback={<div className="h-72 bg-gray-900 rounded-xl animate-pulse"></div>}>
                  <MovieCard movie={item} type={item.type || type} />
                </Suspense>
                {title === "Continue Watching" && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(item);
                    }}
                    className="absolute top-2 left-2 bg-black/60 border border-white/10 hover:border-red-500 hover:bg-red-500 text-white rounded-full p-1.5 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 shadow-md backdrop-blur-sm z-30 cursor-pointer flex items-center justify-center"
                    title="Remove from history"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                      <path d="M12.0007 10.5865L16.9504 5.63672L18.3646 7.05093L13.4149 12.0007L18.3646 16.9504L16.9504 18.3646L12.0007 13.4149L7.05093 18.3646L5.63672 16.9504L10.5865 12.0007L5.63672 7.05093L7.05093 5.63672L12.0007 10.5865Z" />
                    </svg>
                  </button>
                )}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default MediaSlider;
