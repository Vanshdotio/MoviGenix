import React, { useEffect, useState } from "react";
import { getSwipeMovies } from "../services/api";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import { Autoplay, Pagination, Navigation } from "swiper/modules";

const Swipe = () => {
  const [movies, setMovies] = useState([]);
  const [isFastNetwork, setIsFastNetwork] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [playedVideos, setPlayedVideos] = useState({});
  const [expandedMovie, setExpandedMovie] = useState(null); // 🔥 for "more"

  // 🌐 Network detect
  useEffect(() => {
    const connection = navigator.connection;
    if (connection) {
      setIsFastNetwork(connection.effectiveType === "4g");
    }
  }, []);

  // 📡 Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSwipeMovies();
        setMovies(data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
  }, []);

  // 🔥 SMART TIMER (RESUME)
  useEffect(() => {
    const currentMovie = movies[activeIndex];
    if (!currentMovie) return;

    if (playedVideos[currentMovie.id]) {
      setShowVideo(true);
      return;
    }

    setShowVideo(false);

    const timer = setTimeout(() => {
      setShowVideo(true);

      setPlayedVideos((prev) => ({
        ...prev,
        [currentMovie.id]: true,
      }));
    }, 4000);

    return () => clearTimeout(timer);
  }, [activeIndex, movies]);

  return (
    <Swiper
      onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
      autoplay={{ delay: 10000, disableOnInteraction: false }}
      modules={[Autoplay, Pagination, Navigation]}
      className="h-screen w-full"
    >
      {movies.map((movie, index) => (
        <SwiperSlide key={movie.id}>
          <div className="relative w-full h-screen overflow-hidden text-white">
            {/* IMAGE */}
            <img
              className="absolute inset-0 w-full h-full object-cover"
              src={`https://image.tmdb.org/t/p/w780${movie.backdrop_path}`}
              alt={movie.title}
              width={1280}
              height={720}
              loading="lazy"
            />

            {/* VIDEO */}
            {isFastNetwork &&
              movie.videoKey &&
              index === activeIndex &&
              showVideo && (
                <iframe
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-115"
                  src={`https://www.youtube.com/embed/${movie.videoKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${movie.videoKey}&rel=0&showinfo=0&iv_load_policy=3&modestbranding=1&disablekb=1`}
                  allow="autoplay"
                />
              )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

            {/* Content */}
            <div className="absolute bottom-10 left-6 max-w-lg">
              {/* Logo / Title */}
              {movie.logoPath ? (
                <img
                  className="h-24 mb-4 object-contain"
                  src={`https://image.tmdb.org/t/p/w500${movie.logoPath}`}
                  alt={movie.title}
                  width={240}
                  height={96}
                  loading="lazy"
                />
              ) : (
                <h1 className="text-5xl font-bold">{movie.title}</h1>
              )}

              {/* Overview with MORE */}
              <p className="mt-3 text-white/80">
                {expandedMovie === movie.id
                  ? movie.overview
                  : movie.overview.slice(0, 120)}

                {movie.overview.length > 120 && (
                  <span
                    className="text-blue-400 cursor-pointer ml-1"
                    onClick={() =>
                      setExpandedMovie(
                        expandedMovie === movie.id ? null : movie.id,
                      )
                    }
                  >
                    {expandedMovie === movie.id ? " less" : "... more"}
                  </span>
                )}
              </p>

              {/* Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap gap-3 mt-5  no-scrollbar">
                {/* Watch Now */}
                <button className="shrink-0 cursor-pointer gap-2 active:scale-95 transition-all flex items-center bg-white font-[inter] text-black px-5 sm:px-6 py-2 font-semibold rounded">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width={20}
                    height={20}
                  >
                    <path d="M6 20.1957V3.80421C6 3.01878 6.86395 2.53993 7.53 2.95621L20.6432 11.152C21.2699 11.5436 21.2699 12.4563 20.6432 12.848L7.53 21.0437C6.86395 21.46 6 20.9812 6 20.1957Z"></path>
                  </svg>
                  Watch Now
                </button>

                {/* Trailer */}
                {movie.videoKey && (
                  <a
                    href={`https://www.youtube.com/watch?v=${movie.videoKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 bg-white/20 px-5 sm:px-5 py-2 gap-2 font-[inter] active:scale-95 rounded flex items-center font-semibold backdrop-blur hover:bg-white/30 transition-all duration-300"
                  >
                    <svg width="28" height="26" viewBox="0 0 360 216">
                      <path
                        d="m210 221c0 0 98 0 122-6 13-3 24-14 27-27 6-23 6-74 6-74s0-50-6-73c-3-13-14-24-27-27-24-6-122-6-122-6s-97 0-122 6c-13 3-24 14-27 27-6 23-6 73-6 73s0 51 6 74c3 13 14 24 27 27 24 6 122 6 122 6z"
                        fill="#ff0033"
                      />
                      <path d="M259 113 178 67v92z" fill="#fff" />
                    </svg>
                    See Full Trailer
                  </a>
                )}

                {/* Watchlist */}
                <button className="shrink-0 bg-white/10 px-8 sm:px-6 py-2 cursor-pointer active:scale-95 rounded flex items-center font-[inter] gap-2 backdrop-blur hover:bg-white/20 transition-all duration-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    height={16}
                    width={16}
                  >
                    <path d="M11 11V2h2v9h9v2h-9v9h-2v-9H2v-2z"></path>
                  </svg>
                  Watchlist
                </button>
              </div>
            </div>
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default Swipe;