import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InfiniteMenu from "../components/InfiniteMenu";
import Loader from "../components/Loader";
import { getPopularMovies, getBollywoodMovies, getTollywoodMovies } from "../services/api";

const ExplorePage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const [
          hw1, hw2,
          bw1, bw2,
          tw1, tw2
        ] = await Promise.all([
          getPopularMovies(1), getPopularMovies(2),
          getBollywoodMovies(1), getBollywoodMovies(2),
          getTollywoodMovies(1), getTollywoodMovies(2)
        ]);

        const hollywoodResults = [...(Array.isArray(hw1) ? hw1 : hw1.results || []), ...(Array.isArray(hw2) ? hw2 : hw2.results || [])];
        const bollywoodResults = [...(Array.isArray(bw1) ? bw1 : bw1.results || []), ...(Array.isArray(bw2) ? bw2 : bw2.results || [])];
        const tollywoodResults = [...(Array.isArray(tw1) ? tw1 : tw1.results || []), ...(Array.isArray(tw2) ? tw2 : tw2.results || [])];
        
        // Helper to extract unique movies with poster up to limit
        const getUniqueLimit = (list, limit) => {
          const unique = [];
          const seen = new Set();
          for (const movie of list) {
            if (movie && movie.id && movie.poster_path && !seen.has(movie.id)) {
              seen.add(movie.id);
              unique.push(movie);
              if (unique.length === limit) break;
            }
          }
          return unique;
        };

        const hwUnique = getUniqueLimit(hollywoodResults, 30);
        const bwUnique = getUniqueLimit(bollywoodResults, 30);
        const twUnique = getUniqueLimit(tollywoodResults, 30);

        const combined = [...hwUnique, ...bwUnique, ...twUnique];

        // Map to InfiniteMenu items format
        const mappedItems = combined.map((movie) => {
          const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
          const year = movie.release_date ? movie.release_date.split("-")[0] : movie.first_air_date ? movie.first_air_date.split("-")[0] : "N/A";
          
          return {
            image: `https://image.tmdb.org/t/p/w500${movie.poster_path}?cors=true`,
            title: movie.title || movie.name || "Untitled",
            description: `${rating} ★ • ${year} • ${movie.overview ? movie.overview.substring(0, 110) + "..." : "No description available."}`,
            link: `/movie/${movie.id}`
          };
        });

        setItems(mappedItems);
      } catch (err) {
        console.error("Error loading explore page movies:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  const handleItemClick = (item) => {
    if (item && item.link) {
      navigate(item.link);
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-zinc-500 gap-4">
        <span>Failed to load movies. Please check your connection.</span>
        <button 
          onClick={() => window.location.reload()} 
          className="gradient-btn text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {/* Immersive 3D Cylinder Catalog */}
      <div className="w-full h-full">
        <InfiniteMenu
          items={items}
          onItemClick={handleItemClick}
          scale={0.95}
        />
      </div>

      {/* Floating minimalistic hints */}
      <div className="absolute font-[Inter] bottom-6 left-1/2 -translate-x-1/2 bg-black/60 border border-white/5 rounded-full px-5 py-2 text-[10px] md:text-xs font-semibold text-zinc-400 backdrop-blur-md pointer-events-none select-none text-center shadow-lg uppercase tracking-wider">
        Drag to spin movies • Click ↗ to view details
      </div>
    </div>
  );
};

export default ExplorePage;
