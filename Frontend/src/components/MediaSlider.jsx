import React, { Suspense, useCallback, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode } from "swiper/modules";
import MovieCard from "./MovieCard";
import { useAuth } from "../context/AuthContext";
import CircularGallery from "./CircularGallery";

const MediaSlider = ({ title, items = [], type = "movie", viewMoreLink }) => {
  const { removeContinueWatching } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!items || items.length === 0) return null;

  const handleDelete = (item) => {
    removeContinueWatching({
      id: item.movieId || item.showId || item.animeId || item.id,
      type: item.type || type,
    });
  };

  const handleItemClick = useCallback((item) => {
    const itemType = item.type || item.media_type || type;
    const itemId = item.id;
    navigate(`/${itemType}/${itemId}`);
  }, [navigate, type]);

  const isSpecialSection = title.toLowerCase().includes("continue") || title.toLowerCase().includes("watchlist");

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
            aria-label={`View more ${title} movies and shows`}
            className="text-yellow-400 hover:text-yellow-300 font-semibold text-xs md:text-sm flex items-center gap-1.5 transition-all duration-250 group cursor-pointer"
          >
            <span>View More</span>
            <span className="sr-only"> {title}</span>
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      <div className="select-none py-2 w-full">
        {isSpecialSection || isMobile ? (
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
        ) : (
          <div className="w-full h-[300px] md:h-[360px] bg-black rounded-xl overflow-hidden">
            <CircularGallery
              items={items}
              onItemClick={handleItemClick}
              bend={3}
              textColor="#ffffff"
              borderRadius={0.05}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MediaSlider);
