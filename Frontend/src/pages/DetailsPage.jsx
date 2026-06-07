import React, { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { getMediaDetails, getTVSeasonDetails } from "../services/api";
import { useAuth } from "../context/AuthContext";
const VideoPlayer = React.lazy(() => import("../components/VideoPlayer"));
import Loader from "../components/Loader";
import MediaSlider from "../components/MediaSlider";
import ProgressiveImage from "../components/ProgressiveImage";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode } from "swiper/modules";

const EpisodeSkeleton = () => (
  <div className="space-y-4 py-4 animate-pulse">
    {[1, 2, 3].map((n) => (
      <div key={n} className="flex flex-col sm:flex-row gap-4 items-start border-b border-gray-800 pb-4">
        <div className="w-full sm:w-44 aspect-[16/9] bg-gray-900 rounded-lg shrink-0"></div>
        <div className="flex-1 space-y-2 w-full">
          <div className="h-4 bg-gray-900 rounded w-1/3"></div>
          <div className="h-3 bg-gray-900 rounded w-1/4"></div>
          <div className="h-3 bg-gray-900 rounded w-3/4"></div>
        </div>
      </div>
    ))}
  </div>
);

const DetailsPage = ({ type: propType }) => {
  const { type: paramType, id } = useParams();
  const type = propType || paramType;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, toggleFavorite, toggleWatchlist, addContinueWatching, getWatchlist, getContinueWatching } = useAuth();
  
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadTrailer, setLoadTrailer] = useState(false);

  // Accordion state for seasons/episodes
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState({});
  const [loadingSeason, setLoadingSeason] = useState(null);

  // Player state
  const [playingVideo, setPlayingVideo] = useState(null); // { type, season, episode, title, duration }
  const [playbackTime, setPlaybackTime] = useState(0);
  const [selectedAudio, setSelectedAudio] = useState("original");

  const lastSavedProgressRef = useRef(0);
  const lastSavedTimeRef = useRef(0);

  // Map "anime" to "tv" since the TMDB backend uses the TV show schema for Anime
  const apiType = type === "anime" ? "tv" : type;
  const isMovie = type === "movie" || (media && !media.seasons);

  useEffect(() => {
    if (authLoading) return;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        setExpandedSeason(null);
        setSeasonEpisodes({});
        setLoadTrailer(false);
        const data = await getMediaDetails(apiType, id);
        setMedia(data);
      } catch (err) {
        console.error("Error fetching media details:", err);
        if (err.response && err.response.status === 403) {
          if (!user) {
            const currentPath = location.pathname + location.search;
            navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
          } else {
            setError("restricted");
          }
        } else {
          setError("Failed to load details. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [apiType, id, authLoading, user, location.pathname, location.search, navigate]);

  // Autoplay trigger
  useEffect(() => {
    if (media && !playingVideo) {
      const isAutoplayRequested = location.state?.autoplay || new URLSearchParams(window.location.search).get("play") === "true";
      if (isAutoplayRequested) {
        if (isMovie) {
          startPlayback({
            type: type,
            title: media.title || media.name,
            duration: (media.runtime || 120) * 60
          });
        } else {
          // TV / Anime / Cartoon series: resume from last saved season/episode or default to S1E1
          const activeSeason = currentContinueItem?.season || 1;
          const activeEpisode = currentContinueItem?.episode || 1;
          startPlayback({
            type: type === "anime" ? "tv" : type,
            season: activeSeason,
            episode: activeEpisode,
            title: `${media.name || media.title} - S${activeSeason}E${activeEpisode}`
          });
        }
        
        // Clear autoplay state from window history to avoid repeating on reload
        if (location.state?.autoplay) {
          window.history.replaceState({}, document.title);
        }
      }
    }
  }, [media, location.state, isMovie]);

  // Get user watchlist & continue watching specifically for this content type
  const watchlist = getWatchlist(type);
  const continueWatching = getContinueWatching(type);

  const isFavorite = user?.favorites?.some((item) => String(item.id) === String(id) && item.type === type) || false;
  const isWatchlisted = watchlist.some((item) => String(item.id) === String(id)) || false;

  // Retrieve continue watching item for this media item if it exists
  const currentContinueItem = continueWatching.find(
    (item) => String(item.id) === String(id) || String(item.showId) === String(id) || String(item.animeId) === String(id)
  );

  const handleFavoriteClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    toggleFavorite({
      id: String(id),
      type,
      title: media.title,
      name: media.name,
      poster_path: media.poster_path,
      vote_average: media.vote_average,
      release_date: media.release_date,
      first_air_date: media.first_air_date,
    });
  };

  const handleWatchlistClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    toggleWatchlist({
      id: String(id),
      type,
      title: media.title,
      name: media.name,
      poster_path: media.poster_path,
      vote_average: media.vote_average,
      release_date: media.release_date,
      first_air_date: media.first_air_date,
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const toggleSeason = async (seasonNumber) => {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null);
      return;
    }

    setExpandedSeason(seasonNumber);

    if (!seasonEpisodes[seasonNumber]) {
      try {
        setLoadingSeason(seasonNumber);
        const data = await getTVSeasonDetails(id, seasonNumber);
        setSeasonEpisodes((prev) => ({
          ...prev,
          [seasonNumber]: data.episodes || [],
        }));
      } catch (err) {
        console.error("Error fetching season episodes:", err);
      } finally {
        setLoadingSeason(null);
      }
    }
  };

  const startPlayback = (item, forceStartFromBeginning = false) => {
    if (!user) {
      navigate("/login");
      return;
    }
    // Initialize playback time
    let initialTime = 0;
    let initialAudio = "original";
    const isItemMovie = item.type === "movie" || (item.type === "cartoon" && !item.season);
    if (!forceStartFromBeginning && currentContinueItem) {
      if (isItemMovie) {
        initialTime = currentContinueItem.progress || 0;
        initialAudio = currentContinueItem.selectedAudio || "original";
      } else if (
        currentContinueItem.season === item.season &&
        currentContinueItem.episode === item.episode
      ) {
        initialTime = currentContinueItem.progress || 0;
        initialAudio = currentContinueItem.selectedAudio || "original";
      }
    }

    // Auto-select dub from user preferences if no saved audio
    if (initialAudio === "original" && user?.preferences?.autoSelectDub && user?.preferences?.audioLanguage) {
      const preferredLang = user.preferences.audioLanguage;
      if (preferredLang !== "original" && media?.available_audio_languages) {
        const langExists = media.available_audio_languages.some((l) => l.iso_639_1 === preferredLang);
        if (langExists) {
          initialAudio = preferredLang;
        }
      }
    }

    lastSavedProgressRef.current = initialTime;
    lastSavedTimeRef.current = Date.now();

    setPlayingVideo(item);
    setPlaybackTime(initialTime);
    setSelectedAudio(initialAudio);

    const mediaPayload = {
      id: String(id),
      type: item.type,
      title: media.title || media.name,
      name: media.name,
      poster_path: media.poster_path,
      progress: Math.floor(initialTime),
      duration: Math.floor(item.duration || 0),
      selectedAudio: initialAudio,
    };
    if (!isItemMovie) {
      mediaPayload.season = item.season;
      mediaPayload.episode = item.episode;
    }

    if (!isItemMovie && item.season && !seasonEpisodes[item.season]) {
      getTVSeasonDetails(id, item.season)
        .then((data) => {
          setSeasonEpisodes((prev) => ({
            ...prev,
            [item.season]: data.episodes || [],
          }));
        })
        .catch((err) => console.error("Error prefetching episodes for player:", err));
    }

    addContinueWatching(mediaPayload);
  };

  const handlePlayerProgress = (progress, duration, eventType) => {
    if (!playingVideo) return;

    setPlaybackTime(progress);

    const now = Date.now();
    const timeSinceLastSave = now - lastSavedTimeRef.current;
    const progressDiff = Math.abs(progress - lastSavedProgressRef.current);

    const isSignificantEvent = ["pause", "seeked", "ended"].includes(eventType);
    const isFiveSecondsPassed = timeSinceLastSave >= 5000 || progressDiff >= 5;

    if (isSignificantEvent || isFiveSecondsPassed) {
      lastSavedTimeRef.current = now;
      lastSavedProgressRef.current = progress;

      const isMoviePlay = playingVideo.type === "movie" || (playingVideo.type === "cartoon" && !playingVideo.season);
      const mediaPayload = {
        id: String(id),
        type: playingVideo.type,
        title: media.title || media.name,
        name: media.name,
        poster_path: media.poster_path,
        progress: Math.floor(progress),
        duration: Math.floor(duration || playingVideo.duration || 0),
        selectedAudio,
      };
      if (!isMoviePlay) {
        mediaPayload.season = playingVideo.season;
        mediaPayload.episode = playingVideo.episode;
      }
      addContinueWatching(mediaPayload);
    }
  };

  const handleClosePlayer = () => {
    setPlayingVideo(null);
  };

  const handleAudioChange = (newAudioLang) => {
    setSelectedAudio(newAudioLang);
  };

  const playNextEpisode = () => {
    if (nextEpisode) {
      startPlayback({
        type,
        season: nextEpisode.season,
        episode: nextEpisode.episode,
        title: `S${nextEpisode.season}E${nextEpisode.episode}`,
        duration: type === "anime" ? 1440 : 2700,
      });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // TV / Anime Next Episode Logic
  const getNextEpisodeInfo = () => {
    if (isMovie || !media || !currentContinueItem) return null;
    const s = currentContinueItem.season || 1;
    const e = currentContinueItem.episode || 1;

    const currentSeason = media.seasons?.find((season) => season.season_number === s);
    if (!currentSeason) return null;

    if (e < currentSeason.episode_count) {
      return { season: s, episode: e + 1 };
    } else {
      const nextSeason = media.seasons?.find((season) => season.season_number === s + 1);
      if (nextSeason) {
        return { season: s + 1, episode: 1 };
      }
    }
    return null;
  };

  const nextEpisode = getNextEpisodeInfo();

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error === "restricted") {
    const isUnderage = user && user.age < 18;
    return (
      <div className="min-h-screen bg-black relative flex items-center justify-center font-[Inter] overflow-hidden text-white px-4">
        {/* Floating Blobs for visual excellence */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-red-600/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-zinc-800/20 blur-[100px] pointer-events-none"></div>
        
        {/* Glassmorphism Restricted Card */}
        <div className="relative z-10 w-full max-w-md p-8 sm:p-10 rounded-2xl bg-zinc-950/60 border border-white/10 backdrop-blur-xl shadow-2xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold font-['ROSSTEN'] tracking-wider text-white mb-2">
            🔒 Age Restricted
          </h2>
          <p className="text-xs text-zinc-400 mb-8 leading-relaxed">
            {isUnderage
              ? "This content is available only for users aged 18 or above."
              : "This content is rated mature (18+) and is locked. You must be at least 18 years old and have content filters disabled to view this page."
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3 text-center justify-center items-center">
            <button
              onClick={handleBack}
              className="w-full sm:flex-1 py-3 rounded-xl bg-zinc-900 border border-white/5 hover:border-white/15 hover:bg-zinc-850 text-white font-semibold text-sm cursor-pointer transition-all duration-200"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="w-full sm:flex-1 gradient-btn py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200"
            >
              Update Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-4">
        <p className="text-xl text-red-500 mb-4">{error || "Media not found"}</p>
        <button
          onClick={handleBack}
          className="bg-yellow-400 hover:bg-yellow-300 text-black px-6 py-2 rounded-lg font-bold transition duration-200 cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const title = media.title || media.name || "Untitled";
  const tagline = media.tagline;
  const overview = media.overview;
  const rating = media.vote_average ? media.vote_average.toFixed(1) : "N/A";
  const releaseDate = media.release_date || media.first_air_date || "";
  const genres = media.genres || [];
  const runtime = media.runtime; // For movie
  const posterPath = media.poster_path;
  const backdropPath = media.backdrop_path;
  const status = media.status || "Unknown";

  const formatCurrency = (amount) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Find YouTube trailer
  const trailerVideo = media.videos?.results?.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );
  const trailerKey = trailerVideo?.key;

  // Format runtime
  const formatRuntime = (mins) => {
    if (!mins) return "";
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return hrs > 0 ? `${hrs}h ${remainingMins}m` : `${remainingMins}m`;
  };

  const cast = media.credits?.cast || [];

  return (
    <div className="min-h-screen bg-black text-white pb-16 font-[Inter]">
      {/* Hero Backdrop Banner */}
      <div className="relative w-full min-h-[60vh] md:min-h-[75vh] flex items-end pt-36 md:pt-44">
        {backdropPath ? (
          <img
            src={`https://image.tmdb.org/t/p/original${backdropPath}`}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover animate-fade-in"
          />
        ) : (
          <div className="absolute inset-0 bg-gray-900"></div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>

        <button
          onClick={handleBack}
          aria-label="Go Back"
          className="absolute top-20 md:top-24 left-6 md:left-12 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full p-2.5 backdrop-blur-md border border-white/10 transition z-20 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M7.82843 10.9999H20V12.9999H7.82843L13.1924 18.3638L11.7782 19.778L4 11.9999L11.7782 4.22168L13.1924 5.63589L7.82843 10.9999Z"></path>
          </svg>
        </button>

        <div className="relative max-w-6xl mx-auto w-full px-6 md:px-12 pb-8 md:pb-12 grid grid-cols-1 md:grid-cols-4 gap-8 items-start z-10">
          <div className="hidden md:block col-span-1 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10">
            <img
              src={
                posterPath
                  ? `https://image.tmdb.org/t/p/w500${posterPath}`
                  : "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=500&q=80"
              }
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="col-span-1 md:col-span-3 flex flex-col items-start gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-medium text-gray-300">
              <span className="bg-yellow-400 text-black font-bold px-2 py-0.5 rounded text-xs uppercase">
                {type === "anime" ? "Anime" : type === "cartoon" ? "Cartoon" : type === "tv" ? "TV Show" : "Movie"}
              </span>
              {releaseDate && <span>{releaseDate.slice(0, 4)}</span>}
              {isMovie && runtime && (
                <>
                  <span>•</span>
                  <span>{formatRuntime(runtime)}</span>
                </>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              {title}
            </h1>

            {tagline && <p className="text-yellow-400 italic text-sm md:text-base">{tagline}</p>}

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => {
                    const starVal = i * 2;
                    const isHalf = parseFloat(rating) > starVal && parseFloat(rating) < starVal + 2;
                    const isFull = parseFloat(rating) >= starVal + 2;
                    return (
                      <svg
                        key={i}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={isFull ? "currentColor" : isHalf ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="w-5 h-5"
                      >
                        <path d="M12.0006 18.26L4.94715 22.2082L6.52248 14.2799L0.587891 8.7918L8.61493 7.84006L12.0006 0.5L15.3862 7.84006L23.4132 8.7918L17.4787 14.2799L19.054 22.2082L12.0006 18.26Z"></path>
                      </svg>
                    );
                  })}
                </div>
                <span className="font-semibold text-sm md:text-base">{rating} / 10</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Play Buttons: Watch Now & Resume/Continue Watching */}
                {isMovie ? (
                  <>
                    <button
                      onClick={() => startPlayback({ type: type, title, duration: (runtime || 120) * 60 }, true)}
                      className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M8 5V19L19 12L8 5Z" />
                      </svg>
                      Watch Now
                    </button>

                    {currentContinueItem && currentContinueItem.progress > 0 && (
                      <button
                        onClick={() => startPlayback({ type: type, title, duration: (runtime || 120) * 60 })}
                        className="gradient-btn text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 active:scale-95 transition-all shadow-lg hover:shadow-blue-500/20 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path d="M8 5V19L19 12L8 5Z" />
                        </svg>
                        Resume Watching ({formatTime(currentContinueItem.progress)})
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() =>
                        startPlayback({
                          type,
                          season: 1,
                          episode: 1,
                          title: `S1E1`,
                          duration: type === "anime" ? 1440 : 2700,
                        }, true)
                      }
                      className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M8 5V19L19 12L8 5Z" />
                      </svg>
                      Play Episode
                    </button>

                    {currentContinueItem && (
                      <button
                        onClick={() =>
                          startPlayback({
                            type,
                            season: currentContinueItem.season || 1,
                            episode: currentContinueItem.episode || 1,
                            title: `S${currentContinueItem.season}E${currentContinueItem.episode}`,
                            duration: currentContinueItem.duration || (type === "anime" ? 1440 : 2700),
                          })
                        }
                        className="gradient-btn text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 active:scale-95 transition-all shadow-lg hover:shadow-blue-500/20 cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path d="M8 5V19L19 12L8 5Z" />
                        </svg>
                        Continue Episode S{currentContinueItem.season}E{currentContinueItem.episode}
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={handleWatchlistClick}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur-sm transition cursor-pointer ${
                    isWatchlisted
                      ? "bg-yellow-400/10 border-yellow-400 text-yellow-400"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/15"
                  }`}
                  title={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={isWatchlisted ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                  >
                    <path d="M5 3H19C20.1046 3 21 3.89543 21 5V21L12 17L3 21V5C3 3.89543 3.89543 3 5 3Z"></path>
                  </svg>
                  {isWatchlisted ? "In Watchlist" : "Watchlist"}
                </button>

                <button
                  onClick={handleFavoriteClick}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur-sm transition cursor-pointer ${
                    isFavorite
                      ? "bg-red-500/10 border-red-500 text-red-500"
                      : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/15"
                  }`}
                  title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={isFavorite ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                  >
                    <path d="M12.001 4.52853C14.35 2.42 17.98 2.49 20.2426 4.75736C22.5053 7.02472 22.583 10.6373 20.4786 12.993L12.0014 21.485L3.52138 12.993C1.41705 10.6373 1.49471 7.01901 3.75736 4.75736C6.02002 2.49571 9.6531 2.41165 12.001 4.52853Z"></path>
                  </svg>
                  {isFavorite ? "Favorited" : "Favorite"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-1">
              {genres.map((g) => (
                <span
                  key={g.id}
                  className="bg-white/10 hover:bg-white/20 text-gray-200 text-xs px-3 py-1 rounded-full backdrop-blur-sm transition"
                >
                  {g.name}
                </span>
              ))}
            </div>

            {overview && (
              <div className="mt-4">
                <h3 className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">
                  Overview
                </h3>
                <p className="text-sm md:text-base text-gray-200 leading-relaxed max-w-3xl">
                  {overview}
                </p>
              </div>
            )}

            {/* Content-Aware Metadata Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-6 w-full max-w-xl text-sm border-t border-white/5 pt-4">
              {isMovie ? (
                <>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase font-bold">Release Date</span>
                    <p className="text-gray-200 font-semibold mt-0.5">{releaseDate || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase font-bold">Runtime</span>
                    <p className="text-gray-200 font-semibold mt-0.5">{formatRuntime(runtime) || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase font-bold">Budget</span>
                    <p className="text-gray-200 font-semibold mt-0.5">{formatCurrency(media.budget)}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase font-bold">Box Office (Revenue)</span>
                    <p className="text-gray-200 font-semibold mt-0.5">{formatCurrency(media.revenue)}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase font-bold">Air Status</span>
                    <p className="text-gray-200 font-semibold mt-0.5">{status}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase font-bold">Total Seasons</span>
                    <p className="text-gray-200 font-semibold mt-0.5">{media.number_of_seasons || "N/A"} Seasons</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase font-bold">Total Episodes</span>
                    <p className="text-gray-200 font-semibold mt-0.5">{media.number_of_episodes || "N/A"} Episodes</p>
                  </div>
                  {type === "anime" ? (
                    <div>
                      <span className="text-zinc-500 text-xs uppercase font-bold">Studio</span>
                      <p className="text-gray-200 font-semibold mt-0.5">
                        {media.production_companies?.[0]?.name || "Unknown"}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-zinc-500 text-xs uppercase font-bold">Network</span>
                      <p className="text-gray-200 font-semibold mt-0.5">
                        {media.networks?.[0]?.name || "Unknown"}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Available Audio Languages Display */}
            {media?.available_audio_languages && media.available_audio_languages.length > 1 && (
              <div className="mt-5 w-full max-w-xl">
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400">
                    <path d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3ZM12 19C8.13 19 5 15.87 5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19ZM10 8V16L15 12L10 8Z" />
                  </svg>
                  <span className="text-zinc-500 text-xs uppercase font-bold tracking-wider">Available Audio</span>
                  <span className="text-zinc-600 text-[10px] font-medium">({media.available_audio_languages.length} languages)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {media.available_audio_languages.slice(0, 12).map((lang) => {
                    const isOriginal = lang.iso_639_1 === media.original_language;
                    return (
                      <span
                        key={`${lang.iso_639_1}-${lang.iso_3166_1}`}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${
                          isOriginal
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                            : "bg-white/5 border-white/10 text-zinc-300"
                        }`}
                      >
                        🎧 {lang.english_name || lang.name || lang.iso_639_1}
                        {isOriginal && <span className="ml-1 opacity-60">(Original)</span>}
                      </span>
                    );
                  })}
                  {media.available_audio_languages.length > 12 && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-500">
                      +{media.available_audio_languages.length - 12} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* TV & Anime Episode Details (Next Episode & Last Watched) */}
            {type !== "movie" && (currentContinueItem || nextEpisode) && (
              <div className="mt-6 w-full max-w-xl space-y-3">
                {currentContinueItem && (
                  <div className="p-3.5 bg-white/5 border border-white/5 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <span className="text-yellow-400 font-bold uppercase tracking-wider text-[10px]">Last Watched Episode</span>
                      <h4 className="font-bold text-white mt-0.5 text-sm">
                        Season {currentContinueItem.season}, Episode {currentContinueItem.episode}
                      </h4>
                      {currentContinueItem.progress > 0 && (
                        <p className="text-zinc-400 mt-0.5">
                          Progress: {formatTime(currentContinueItem.progress)} / {formatTime(currentContinueItem.duration || (type === "anime" ? 1440 : 2700))}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        startPlayback({
                          type,
                          season: currentContinueItem.season,
                          episode: currentContinueItem.episode,
                          title: `S${currentContinueItem.season}E${currentContinueItem.episode}`,
                          duration: currentContinueItem.duration || (type === "anime" ? 1440 : 2700),
                        })
                      }
                      className="bg-yellow-400 text-black font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all text-xs hover:bg-yellow-300 cursor-pointer"
                    >
                      Resume
                    </button>
                  </div>
                )}
                {type === "tv" && nextEpisode && (
                  <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <span className="text-blue-400 font-bold uppercase tracking-wider text-[10px]">Next Episode</span>
                      <h4 className="font-bold text-white mt-0.5 text-sm">
                        Season {nextEpisode.season}, Episode {nextEpisode.episode}
                      </h4>
                    </div>
                    <button
                      onClick={() =>
                        startPlayback({
                          type: "tv",
                          season: nextEpisode.season,
                          episode: nextEpisode.episode,
                          title: `S${nextEpisode.season}E${nextEpisode.episode}`,
                          duration: 2700,
                        })
                      }
                      className="bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all text-xs hover:bg-blue-400 cursor-pointer"
                    >
                      Play Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Movie Collection */}
            {isMovie && media.belongs_to_collection && (
              <div className="mt-6 w-full max-w-xl bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                <img
                  src={`https://image.tmdb.org/t/p/w92${media.belongs_to_collection.poster_path}`}
                  alt=""
                  width={48}
                  height={72}
                  className="w-12 h-18 object-cover rounded shadow"
                />
                <div>
                  <span className="text-[10px] text-yellow-400 uppercase font-bold tracking-wider">Part of the Collection</span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{media.belongs_to_collection.name}</h4>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 mt-12 space-y-12">
        {/* Cast & Crew Horizontal Slider */}
        {cast.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 border-l-4 border-yellow-400 pl-3">
              Cast & Actors
            </h2>
            <div className="select-none py-2">
              <Swiper
                modules={[FreeMode]}
                freeMode={true}
                grabCursor={true}
                spaceBetween={16}
                slidesPerView={"auto"}
                className="mySwiper"
              >
                {cast.slice(0, 15).map((actor) => {
                  const profileImg = actor.profile_path
                    ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
                    : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=185&q=80";

                  return (
                    <SwiperSlide key={actor.id} style={{ width: "128px" }}>
                      <Link
                        to={`/person/${actor.id}`}
                        className="group flex flex-col gap-2 cursor-pointer"
                      >
                        <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/10 bg-gray-950 shadow-md">
                          <img
                            src={profileImg}
                            alt={actor.name}
                            width={128}
                            height={192}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                        </div>
                        <p className="text-xs font-bold text-gray-200 truncate group-hover:text-yellow-400 transition">
                          {actor.name}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate italic leading-tight">
                          {actor.character}
                        </p>
                      </Link>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </div>
          </div>
        )}

        {/* YouTube Trailer Section (Movies only) */}
        {isMovie && (
          trailerKey ? (
            <div>
              <h2 className="text-2xl font-bold mb-4 border-l-4 border-yellow-400 pl-3">
                Official Trailer
              </h2>
              <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/5 bg-zinc-950">
                {loadTrailer ? (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`}
                    title={`${title} Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div 
                    onClick={() => setLoadTrailer(true)}
                    className="absolute inset-0 w-full h-full cursor-pointer group flex items-center justify-center bg-cover bg-center"
                    style={{ backgroundImage: backdropPath ? `url(https://image.tmdb.org/t/p/w780${backdropPath})` : "none" }}
                  >
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors duration-300"></div>
                    
                    {/* Play Icon */}
                    <div className="relative z-10 w-16 h-16 rounded-full bg-red-600 group-hover:bg-red-500 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-all duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 ml-1">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-8 text-center text-gray-400">
              No official trailer available.
            </div>
          )
        )}

        {/* TV/Anime Seasons Section */}
        {type !== "movie" && media.seasons && media.seasons.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 border-l-4 border-yellow-400 pl-3">
              Seasons & Episodes
            </h2>
            <div className="space-y-4">
              {media.seasons
                .filter((season) => season.season_number > 0)
                .map((season) => {
                  const seasonPoster = season.poster_path
                    ? `https://image.tmdb.org/t/p/w92${season.poster_path}`
                    : posterPath
                    ? `https://image.tmdb.org/t/p/w92${posterPath}`
                    : "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=92&q=60";

                  const isExpanded = expandedSeason === season.season_number;
                  const currentEpisodes = seasonEpisodes[season.season_number] || [];
                  const isEpisodesLoading = loadingSeason === season.season_number;

                  return (
                    <div
                      key={season.id}
                      className="border border-gray-800 rounded-xl bg-gray-900/20 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleSeason(season.season_number)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition duration-200 cursor-pointer"
                      >
                        <div className="flex gap-4 items-center min-w-0">
                          <img
                            src={seasonPoster}
                            alt={season.name}
                            width={48}
                            height={72}
                            className="w-12 aspect-[2/3] object-cover rounded shadow"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <h3 className="font-bold text-white text-sm md:text-base truncate">
                              {season.name}
                            </h3>
                            <p className="text-xs text-yellow-400 font-medium mt-0.5">
                              {season.episode_count} Episodes •{" "}
                              {season.air_date ? season.air_date.slice(0, 4) : "TBA"}
                            </p>
                          </div>
                        </div>

                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className={`w-6 h-6 text-gray-400 transition-transform duration-300 shrink-0 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          <path d="M11.9997 13.1714L16.9495 8.22168L18.3637 9.63589L11.9997 15.9999L5.63574 9.63589L7.04996 8.22168L11.9997 13.1714Z"></path>
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-800 bg-black/40 px-6 py-4">
                          {isEpisodesLoading ? (
                            <EpisodeSkeleton />
                          ) : currentEpisodes.length > 0 ? (
                            <div className="space-y-6">
                              {currentEpisodes.map((episode) => {
                                const stillUrl = episode.still_path
                                  ? `https://image.tmdb.org/t/p/w185${episode.still_path}`
                                  : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=185&q=80";

                                // Check if this specific episode is currently being watched
                                const isCurrentEpisodeActive =
                                  currentContinueItem &&
                                  currentContinueItem.season === season.season_number &&
                                  currentContinueItem.episode === episode.episode_number;

                                const epDuration = type === "anime" ? 1440 : 2700;
                                const epProgress = isCurrentEpisodeActive ? currentContinueItem.progress : 0;
                                const progressPercentage = epProgress ? Math.min((epProgress / epDuration) * 100, 100) : 0;

                                return (
                                  <div
                                    key={episode.id}
                                    className="flex flex-col sm:flex-row gap-4 items-start border-b border-gray-800/50 pb-6 last:border-b-0 last:pb-0"
                                  >
                                    {/* Still & Progress Bar */}
                                    <div 
                                      onClick={() =>
                                        startPlayback({
                                          type,
                                          season: season.season_number,
                                          episode: episode.episode_number,
                                          title: `S${season.season_number}E${episode.episode_number} - ${episode.name}`,
                                          duration: epDuration,
                                        })
                                      }
                                      className="relative w-full sm:w-44 aspect-[16/9] rounded-lg overflow-hidden shrink-0 bg-gray-950 border border-white/5 shadow-md group cursor-pointer"
                                    >
                                      <img
                                        src={stillUrl}
                                        alt={episode.name}
                                        width={176}
                                        height={99}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                        loading="lazy"
                                      />
                                      {/* Play Overlay Hover */}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                                          <path d="M8 5V19L19 12L8 5Z" />
                                        </svg>
                                      </div>

                                      {/* Episode Progress Bar */}
                                      {progressPercentage > 0 && (
                                        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-white/20">
                                          <div
                                            className="h-full bg-yellow-400 transition-all duration-300"
                                            style={{ width: `${progressPercentage}%` }}
                                          ></div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-gray-100 text-sm md:text-base leading-snug">
                                        Ep {episode.episode_number}: {episode.name}
                                      </h4>
                                      <div className="flex gap-2 text-xs text-yellow-400 font-medium mt-1">
                                        {episode.air_date && (
                                          <span>
                                            {new Date(episode.air_date).toLocaleDateString("en-US", {
                                              year: "numeric",
                                              month: "short",
                                              day: "numeric",
                                            })}
                                          </span>
                                        )}
                                        {episode.runtime && (
                                          <>
                                            <span className="text-gray-700">•</span>
                                            <span>{episode.runtime}m</span>
                                          </>
                                        )}
                                      </div>
                                      {episode.overview && (
                                        <p className="text-xs md:text-sm text-gray-400 mt-2 leading-relaxed">
                                          {episode.overview}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No episodes found for this season.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Similar & Recommendations Slider lists (Only for Movies and Anime Recommendations if Anime) */}
      <div className="mt-6">
        {(type === "movie" || type === "cartoon") && media.similar?.results && media.similar.results.length > 0 && (
          <MediaSlider
            title={type === "cartoon" ? "Similar Cartoons" : "Similar Movies"}
            items={media.similar.results}
            type={type}
          />
        )}

        {(type === "movie" || type === "cartoon") && media.recommendations?.results && media.recommendations.results.length > 0 && (
          <MediaSlider
            title="Recommendations"
            items={media.recommendations.results}
            type={type}
          />
        )}

        {type === "anime" && media.recommendations?.results && media.recommendations.results.length > 0 && (
          <MediaSlider
            title="Anime Recommendations"
            items={media.recommendations.results.filter(item => item.genre_ids && item.genre_ids.includes(16))}
            type={type}
          />
        )}
      </div>

      {/* Premium Media Player Modal Overlay */}
      {playingVideo && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center gap-3">
            <Loader />
            <p className="text-yellow-400 font-bold font-[Inter] text-sm animate-pulse">Loading Premium Player...</p>
          </div>
        }>
          <VideoPlayer
            type={playingVideo.type}
            id={id}
            season={playingVideo.season}
            episode={playingVideo.episode}
            title={playingVideo.type === "movie" ? (media.title || media.name) : `${media.name || media.title} - S${playingVideo.season}E${playingVideo.episode}`}
            posterPath={media.poster_path}
            initialProgress={playbackTime}
            onProgressUpdate={handlePlayerProgress}
            onClose={handleClosePlayer}
            onNextEpisode={playNextEpisode}
            nextEpisodeAvailable={!!nextEpisode}
            availableLanguages={media?.available_audio_languages || []}
            originalLanguage={media?.original_language || ""}
            initialAudio={selectedAudio}
            onAudioChange={handleAudioChange}
            episodes={seasonEpisodes[playingVideo.season] || []}
            onPlayEpisode={(episodeNumber) => {
              startPlayback({
                type: playingVideo.type,
                season: playingVideo.season,
                episode: episodeNumber,
                title: `S${playingVideo.season}E${episodeNumber}`,
                duration: playingVideo.type === "anime" ? 1440 : 2700,
              });
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default DetailsPage;
