import React, { useEffect, useState, useRef, useCallback } from "react";
import { getSecurePlayerUrl } from "../services/api";
import AudioSelector from "./AudioSelector";

const VideoPlayer = ({
  type,
  id,
  season,
  episode,
  title,
  posterPath,
  initialProgress = 0,
  onProgressUpdate,
  onClose,
  onNextEpisode,
  nextEpisodeAvailable = false,
  availableLanguages = [],
  originalLanguage = "",
  initialAudio = "",
  onAudioChange,
}) => {
  const [playerUrl, setPlayerUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(initialAudio || "original");
  
  const playerContainerRef = useRef(null);
  const iframeRef = useRef(null);
  const currentProgressRef = useRef(initialProgress);

  // Build and fetch secure player URL
  const fetchPlayerUrl = useCallback(async (audioLang, progress) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        color: "217df5",
        progress: Math.floor(progress),
      };
      
      if (type !== "movie") {
        params.season = season;
        params.episode = episode;
        params.nextEpisode = "true";
        params.episodeSelector = "true";
      }

      // Add audio parameter if not original
      if (audioLang && audioLang !== "original") {
        params.audio = audioLang;
      }
      
      const response = await getSecurePlayerUrl(type, id, params);
      if (response && response.playerUrl) {
        setPlayerUrl(response.playerUrl);
      } else {
        setError("Failed to fetch streaming player source.");
      }
    } catch (err) {
      console.error("Error fetching secure player URL:", err);
      if (err.response && err.response.status === 403) {
        setError("restricted");
      } else {
        setError("Failed to initialize player. Please try again.");
      }
    }
  }, [type, id, season, episode]);

  // Initial load
  useEffect(() => {
    fetchPlayerUrl(selectedAudio, initialProgress);
  }, [type, id, season, episode]); // Only re-fetch when media changes, not audio

  // Handle audio language change — refetch URL preserving current progress
  const handleAudioChange = useCallback((newAudioLang) => {
    if (newAudioLang === selectedAudio) return;
    
    setSelectedAudio(newAudioLang);
    
    // Notify parent about audio change
    if (onAudioChange) {
      onAudioChange(newAudioLang);
    }

    // Re-fetch player URL with the new audio language, preserving playback position
    fetchPlayerUrl(newAudioLang, currentProgressRef.current);
  }, [selectedAudio, fetchPlayerUrl, onAudioChange]);

  // Fullscreen support
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Listen to postMessage from Vidking iframe player
  useEffect(() => {
    const handlePlayerMessage = (event) => {
      // Validate or handle messages safely
      if (!event.data) return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (!data || !data.event) return;

        const eventType = data.event;
        
        // Track: play, pause, seeked, timeupdate, ended
        switch (eventType) {
          case "play":
            console.log("Vidking playback started");
            break;
          case "pause":
            console.log("Vidking playback paused");
            if (data.progress || data.currentTime) {
              const currentProgress = data.progress || data.currentTime || data.time || 0;
              const duration = data.duration || 0;
              currentProgressRef.current = currentProgress;
              onProgressUpdate(currentProgress, duration, "pause");
            }
            break;
          case "seeked":
            console.log("Vidking seeked");
            if (data.progress || data.currentTime) {
              const currentProgress = data.progress || data.currentTime || data.time || 0;
              const duration = data.duration || 0;
              currentProgressRef.current = currentProgress;
              onProgressUpdate(currentProgress, duration, "seeked");
            }
            break;
          case "timeupdate":
            const currentProgress = data.progress || data.currentTime || data.time || data.value || 0;
            const duration = data.duration || 0;
            currentProgressRef.current = currentProgress;
            onProgressUpdate(currentProgress, duration, "timeupdate");
            break;
          case "ended":
            console.log("Vidking playback ended");
            onProgressUpdate(data.duration || 0, data.duration || 0, "ended");
            if (nextEpisodeAvailable && onNextEpisode) {
              onNextEpisode();
            }
            break;
          default:
            break;
        }
      } catch (err) {
        // Silent error for messages that are not JSON or unrelated
      }
    };

    window.addEventListener("message", handlePlayerMessage);
    return () => {
      window.removeEventListener("message", handlePlayerMessage);
    };
  }, [onProgressUpdate, nextEpisodeAvailable, onNextEpisode]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  if (error === "restricted") {
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[9999] flex flex-col items-center justify-center p-4 select-none font-[Inter]">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-red-600/10 blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-zinc-950/60 border border-white/10 backdrop-blur-xl shadow-2xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-wider text-white mb-2 uppercase">🔒 Age Restricted</h2>
          <p className="text-xs text-zinc-400 mb-8 leading-relaxed">
            Streaming of mature content (18+) is blocked for underage accounts. If this is an error, please update your profile.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-zinc-900 border border-white/5 hover:border-white/15 text-white font-semibold text-sm cursor-pointer transition-all duration-200"
          >
            Close Player
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[9999] flex flex-col items-center justify-center p-4 md:p-8 select-none font-[Inter]">
      {/* Immersive cinematic background glow */}
      <div 
        className="absolute inset-0 opacity-15 filter blur-3xl pointer-events-none scale-105 transition-all duration-500 bg-cover bg-center"
        style={{ backgroundImage: posterPath ? `url(https://image.tmdb.org/t/p/w780${posterPath})` : "none" }}
      ></div>

      <div 
        ref={playerContainerRef}
        className="relative w-full max-w-5xl bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col aspect-video group"
      >
        {/* Immersive Custom Header overlay (fades out unless hovered) */}
        <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-30 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="bg-black/60 hover:bg-zinc-850 border border-white/10 text-white rounded-full p-2.5 backdrop-blur-md transition cursor-pointer flex items-center justify-center"
              title="Go Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M7.82843 10.9999H20V12.9999H7.82843L13.1924 18.3638L11.7782 19.778L4 11.9999L11.7782 4.22168L13.1924 5.63589L7.82843 10.9999Z" />
              </svg>
            </button>
            <div>
              <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest">
                Now Streaming
              </span>
              <h3 className="text-sm md:text-base font-bold text-white leading-tight">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Selector Button */}
            {availableLanguages && availableLanguages.length > 0 && (
              <AudioSelector
                availableLanguages={availableLanguages}
                selectedAudio={selectedAudio}
                originalLanguage={originalLanguage}
                onAudioChange={handleAudioChange}
              />
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="bg-black/60 hover:bg-zinc-850 border border-white/10 text-white rounded-full p-2.5 backdrop-blur-md transition cursor-pointer flex items-center justify-center"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M18 7H22V9H16V3H18V7ZM8 9H2V7H6V3H8V9ZM18 17V21H16V15H22V17H18ZM6 17H2V15H8V21H6V17Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M20 3H14V5H19V10H21V4C21 3.44772 20.5523 3 20 3ZM20 20H19V15H21V19.999C21 20.5513 20.5523 21 20 21H14V19H20V20ZM4 3C3.44772 3 3 3.44772 3 4V10H5V5H10V3H4ZM4 20H10V21H4C3.44772 21 3 20.5523 3 19.999V14H5V19H4V20Z" />
                </svg>
              )}
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="bg-black/60 hover:bg-red-500/20 border border-white/10 hover:border-red-500/50 text-white hover:text-red-400 rounded-full p-2.5 backdrop-blur-md transition cursor-pointer flex items-center justify-center"
              title="Close Player"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12.0007 10.5865L16.9504 5.63672L18.3646 7.05093L13.4149 12.0007L18.3646 16.9504L16.9504 18.3646L12.0007 13.4149L7.05093 18.3646L5.63672 16.9504L10.5865 12.0007L5.63672 7.05093L7.05093 5.63672L12.0007 10.5865Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Streaming Video Screen */}
        <div className="flex-1 bg-black relative w-full h-full flex items-center justify-center">
          {/* Glowing Loading Skeleton */}
          {loading && (
            <div className="absolute inset-0 z-20 bg-zinc-950 flex flex-col items-center justify-center gap-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/10 border-t-blue-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-4 border-pink-500/10 border-b-pink-500 animate-spin animate-duration-1000"></div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-400 animate-pulse">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM8 16V8L16 12L8 16Z" />
                </svg>
              </div>
              <span className="text-zinc-500 text-xs font-semibold tracking-widest uppercase animate-pulse">
                {selectedAudio && selectedAudio !== "original"
                  ? `Loading ${selectedAudio.toUpperCase()} Audio Stream...`
                  : "Initializing Secure Vidking Stream..."
                }
              </span>
            </div>
          )}

          {error && error !== "restricted" && (
            <div className="absolute inset-0 z-20 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM11 15V17H13V15H11ZM11 7V13H13V7H11Z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">{error}</h3>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-zinc-900 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer transition duration-200"
              >
                Close Player
              </button>
            </div>
          )}

          {playerUrl && (
            <iframe
              ref={iframeRef}
              src={playerUrl}
              onLoad={handleIframeLoad}
              allowFullScreen
              scrolling="no"
              allow="autoplay; fullscreen; picture-in-picture"
              className="absolute inset-0 w-full h-full border-0 z-10"
              title={title}
            ></iframe>
          )}
          
          {/* Custom Next Episode floating overlay (only TV/Anime, when active and on hover) */}
          {type !== "movie" && nextEpisodeAvailable && onNextEpisode && !loading && (
            <button
              onClick={onNextEpisode}
              className="absolute bottom-28 md:bottom-32 right-6 z-30 bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 active:scale-95 transition duration-200 shadow-xl opacity-0 md:group-hover:opacity-100 hover:scale-105 cursor-pointer backdrop-blur-md border border-white/10"
            >
              <span>Next Episode</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M16 12L10 18V6L16 12ZM18 6V18H20V6H18Z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
