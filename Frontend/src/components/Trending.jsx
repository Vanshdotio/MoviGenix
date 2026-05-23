import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTrendingMovies } from "../services/api";
import Lenis from "lenis";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode } from "swiper/modules";

const lenis = new Lenis();

// Use requestAnimationFrame to continuously update the scroll
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

const Trending = () => {
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await getTrendingMovies();
        setMovies(data);
      } catch (err) {
        console.log("Error:", err);
      }
    };

    fetchTrending();
  }, []);

  return (
    <div className="explore w-full font-[inter] p-10 px-12 text-white bg-black">
      <h1 className="text-2xl md:text-3xl font-medium">Trending</h1>

      <div className="select-none py-2">
        <Swiper
          modules={[FreeMode]}
          freeMode={true}
          grabCursor={true}
          spaceBetween={32}
          slidesPerView={"auto"}
          className="mySwiper"
        >
          {movies.map((movie, index) => (
            <SwiperSlide key={movie.id} style={{ width: "auto" }}>
              <div className="font-[ROSSTEN] mt-5 -space-x-1 flex items-baseline select-none">
                {/* Number */}
                <span className="text-[6rem] md:text-[12rem] opacity-80 leading-none">
                  {index + 1}
                </span>

                {/* Poster */}
                <Link to={`/movie/${movie.id}`} className="h-64 w-44 relative block">
                  <img
                    loading="lazy"
                    className="h-full w-full rounded-xl object-cover hover:scale-105 transition-all duration-300 cursor-pointer"
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
                  />
                </Link>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default Trending;
