import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { searchMedia } from "../services/api";
import { trackSearch } from "../services/telemetry";
import { useAuth } from "../context/AuthContext";
import { SEOHead, generateBreadcrumbJsonLd } from "../seo";


const DEBOUNCE_MS = 400;

const SearchOverlay = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const qParam = queryParams.get("q") || queryParams.get("query") || "";

  const [text, setText] = useState(qParam);
  const [searchType, setSearchType] = useState("movie"); // 'movie', 'tv', 'anime', 'cartoon'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const { contentPreferences } = useAuth();
  const showAnime = contentPreferences?.showAnime ?? true;

  // Sync text when URL search param changes
  useEffect(() => {
    const qParams = new URLSearchParams(location.search);
    const qVal = qParams.get("q") || qParams.get("query") || "";
    if (qVal !== text) {
      setText(qVal);
    }
  }, [location.search]);

  // Reset search type if current category is disabled
  useEffect(() => {
    if (!showAnime && searchType === "anime") {
      setSearchType("movie");
    }
  }, [showAnime, searchType]);

  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const trimmedText = text.trim();

    // Don't fire a request for empty/whitespace-only input — clear results
    if (!trimmedText) {
      setResults([]);
      setLoading(false);
      const qParams = new URLSearchParams(window.location.search);
      if (qParams.get("q")) {
        navigate("/search", { replace: true });
      }
      return;
    }

    // Skip very short queries (fewer than 2 characters)
    if (trimmedText.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (searchType === "anime" && !showAnime) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Show loading indicator while request is debouncing / in flight
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchMedia(searchType, trimmedText, 1, { signal: controller.signal });
        
        // Ignore stale response if request was aborted
        if (!controller.signal.aborted) {
          const searchResults = data.results || [];
          setResults(searchResults);
          trackSearch(trimmedText, searchResults.length);

          const qParams = new URLSearchParams(window.location.search);
          const currentQ = qParams.get("q") || "";
          if (trimmedText !== currentQ) {
            navigate(`/search?q=${encodeURIComponent(trimmedText)}`, { replace: true });
          }
        }
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError" || controller.signal.aborted) {
          return;
        }
        if (!controller.signal.aborted) {
          console.error("Error searching media:", err);
          setResults([]);
          trackSearch(trimmedText, 0);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    // Teardown / Cleanup: clear debounce timer & abort in-flight API request
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, searchType, showAnime, navigate]);

  const Back = () => {
    window.history.back();
  };

  const getPlaceholderText = () => {
    switch (searchType) {
      case "movie":
        return "Search Movies...";
      case "tv":
        return "Search TV Shows...";
      case "anime":
        return "Search Anime...";
      case "cartoon":
        return "Search Cartoons...";
      case "web-series":
        return "Search Web Series...";
      default:
        return "Search...";
    }
  };

  const getNoResultsText = () => {
    switch (searchType) {
      case "movie":
        return "Movies";
      case "tv":
        return "TV Shows";
      case "anime":
        return "Anime";
      case "cartoon":
        return "Cartoons";
      case "web-series":
        return "Web Series";
      default:
        return "Content";
    }
  };

  return (
    <div className="relative w-full text-white pt-24 font-[Inter] min-h-screen bg-black select-none">
      <SEOHead
        title={text.trim() ? `Search Results for "${text}"` : "Search Movies, TV Shows, Anime & Cartoons"}
        description={text.trim() ? `Browse search results for "${text}" on MoviGenix.` : "Search for your favorite movies, TV series, anime, cartoons, and directors on MoviGenix."}
        keywords="search movies, search tv shows, search anime, search cartoons, MoviGenix search"
        canonicalPath={text.trim() ? `/search?q=${encodeURIComponent(text)}` : "/search"}
        noIndex={true}
        jsonLd={generateBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Search", path: "/search" }
        ])}
      />
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 px-6 md:px-10 mb-6">
        <button
          onClick={Back}
          className="cursor-pointer hover:text-yellow-400 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-8 h-8"
          >
            <path d="M22.0003 13.0001L22.0004 11.0002L5.82845 11.0002L9.77817 7.05044L8.36396 5.63623L2 12.0002L8.36396 18.3642L9.77817 16.9499L5.8284 13.0002L22.0003 13.0001Z"></path>
          </svg>
        </button>
        <h1 className="text-3xl font-semibold">Search</h1>
      </div>

      {/* Search Input Box */}
      <div className="w-full flex justify-center px-6 md:px-10">
        <div className="flex gap-3 w-full max-w-4xl p-3.5 rounded-xl bg-gray-900 relative items-center border border-gray-800 focus-within:border-yellow-400 transition">
          {/* Search Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            className="text-gray-400"
            viewBox="0 0 256 256"
          >
            <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
          </svg>

          {/* Input */}
          <input
            ref={inputRef}
            className="w-full h-8 outline-none border-none text-white placeholder-gray-400 bg-transparent text-base"
            type="search"
            placeholder={getPlaceholderText()}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {/* Custom clear button */}
          {text && (
            <button
              onClick={() => setText("")}
              className="absolute cursor-pointer right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category Selection Tabs */}
      <div className="flex justify-center gap-4 mt-6">
        {[
          { key: "movie", label: "Movies" },
          { key: "web-series", label: "Web Series" },
          { key: "tv", label: "TV Shows" },
          showAnime && { key: "anime", label: "Anime" },
          { key: "cartoon", label: "Cartoons" },
        ].filter(Boolean).map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setSearchType(tab.key);
              setResults([]); // Clear results on type change to show fresh data
            }}
            className={`px-6 py-2 rounded-full text-sm font-medium transition cursor-pointer ${
              searchType === tab.key
                ? "bg-yellow-400 text-black font-bold shadow-md"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results Container */}
      <div className="mt-10 px-6 md:px-10 max-w-7xl mx-auto pb-12">
        {loading && (
          <div className="flex justify-center py-10">
            <p className="text-gray-400">Searching...</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-400 mb-6 tracking-wide border-l-4 border-yellow-400 pl-3">
              Search Results
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {results.map((item) => {

                const title = item.title || item.name || "Untitled";
                const date = item.release_date || item.first_air_date || "";
                const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
                const posterUrl = item.poster_path
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=500&q=80";

                return (
                  <Link
                    key={item.id}
                    to={`/${searchType}/${item.id}`}
                    className="group block bg-[#111] rounded-xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer"
                  >
                    <div className="relative aspect-[2/3] overflow-hidden bg-gray-950">
                      <img
                        src={posterUrl}
                        alt={title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      />

                      <span className="absolute flex items-center gap-1 top-2 right-2 bg-black/75 text-yellow-400 text-xs px-2 py-1 rounded-md font-medium backdrop-blur-sm">
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

                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 p-3.5 flex flex-col justify-end">
                        <p className="text-sm font-semibold text-white leading-tight line-clamp-2">
                          {title}
                        </p>
                        {date ? (
                          <p className="text-[11px] text-gray-400 mt-1">
                            {date.slice(0, 4)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {!loading && text.trim() && results.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No results found for "{text}" in {getNoResultsText()}.
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
