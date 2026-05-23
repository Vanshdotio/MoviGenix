import React, { useEffect, useState, Suspense } from "react";
import { getPopularMovies } from "../services/api";
import { OrbitProgress } from "react-loading-indicators";
import Loader from "./Loader";

const MovieCard = React.lazy(() => import("../components/MovieCard"));

// 🔥 Swiper Imports
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode } from "swiper/modules";

const CurrentPopular = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopular = async () => {
      try {
        setLoading(true);
        const data = await getPopularMovies();
        setMovies(data.slice(0, 10)); // only 10 movies
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPopular();
  }, []);

  return (
    <>
      <div className="flex bg-black p-10 px-12 -mt-15 text-white flex-col font-[Inter] w-full">
        <h1 className="text-2xl font-medium  ">Popular</h1>

        {/* 🔥 Swiper Slider */}
        <div className=" select-none py-6">
          {loading ? (
            <span className="flex items-center justify-center w-full">
              <OrbitProgress color="#cbcaca" size="medium" />
            </span>
          ) : (
            <Swiper
              modules={[FreeMode]}
              freeMode={true}
              grabCursor={true}
              spaceBetween={20}
              slidesPerView={"auto"}
              className="mySwiper"
            >
              {movies.map((movie) => (
                <SwiperSlide
                  key={movie.id}
                  style={{ width: "180px" }} // card width
                >
                  <Suspense fallback={<div><Loader /></div>}>
                    <MovieCard movie={movie} />
                  </Suspense>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>
      </div>
    </>
  );
};

export default CurrentPopular;
