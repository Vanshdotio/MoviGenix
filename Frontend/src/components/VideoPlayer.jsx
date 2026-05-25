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
  episodes = [],
  onPlayEpisode,
}) => {
  const [playerUrl, setPlayerUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(initialAudio || "original");

  // Custom Player Overlay States
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialProgress);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [showEpisodesMenu, setShowEpisodesMenu] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(null);
  const [selectedServer, setSelectedServer] = useState("vidking");
  const [showServerMenu, setShowServerMenu] = useState(false);

  const playerContainerRef = useRef(null);
  const iframeRef = useRef(null);
  const currentProgressRef = useRef(initialProgress);
  const controlsTimeoutRef = useRef(null);
  const touchStartY = useRef(null);
  const serverMenuRef = useRef(null);
  const episodesMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (serverMenuRef.current && !serverMenuRef.current.contains(event.target)) {
        setShowServerMenu(false);
      }
      if (episodesMenuRef.current && !episodesMenuRef.current.contains(event.target)) {
        setShowEpisodesMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Build and fetch secure player URL
  const fetchPlayerUrl = useCallback(async (audioLang, progress, serverName = selectedServer) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        color: "ffc600", // Match custom gold theme
        progress: Math.floor(progress),
        autoplay: "1", // Auto play next/initial
        server: serverName,
      };
      
      if (type !== "movie") {
        params.season = season;
        params.episode = episode;
        params.nextEpisode = "true";
        params.episodeSelector = "true";
      }

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
  }, [type, id, season, episode, selectedServer]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    setPlayerUrl("");
    fetchPlayerUrl(selectedAudio, initialProgress, selectedServer);
  }, [type, id, season, episode]);

  // keydown Escape event listener to close player
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Orientation Check for Mobile
  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 1024;
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      setIsPortraitMobile(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // Set body overflow hidden & attempt landscape orientation lock
  useEffect(() => {
    document.body.style.overflow = "hidden";

    const lockOrientation = async () => {
      try {
        if (playerContainerRef.current && playerContainerRef.current.requestFullscreen) {
          await playerContainerRef.current.requestFullscreen().catch(() => {});
        }
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock("landscape").catch(() => {});
        }
      } catch (err) {
        console.warn("Screen orientation lock failed:", err);
      }
    };

    lockOrientation();

    return () => {
      document.body.style.overflow = "";
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock();
      }
    };
  }, []);

  // PostMessage Commands Sender Helper
  const sendIframeCommand = (event, key = null, val = null) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    try {
      const targetWindow = iframeRef.current.contentWindow;
      
      // Send multiple styles of player postMessage control payloads for max compatibility
      if (event === "play" || event === "pause") {
        const playCommand = event === "play" ? "playVideo" : "pauseVideo";
        targetWindow.postMessage(JSON.stringify({ event: "command", func: playCommand }), "*");
        targetWindow.postMessage(JSON.stringify({ event }), "*");
        targetWindow.postMessage({ event }, "*");
        targetWindow.postMessage({ method: event }, "*");
      } else if (event === "seek" && typeof val === "number") {
        targetWindow.postMessage(JSON.stringify({ event: "command", func: "seekTo", params: [val, true] }), "*");
        targetWindow.postMessage(JSON.stringify({ event: "seek", value: val }), "*");
        targetWindow.postMessage({ event: "seek", time: val, currentTime: val }, "*");
        targetWindow.postMessage({ method: "setCurrentTime", value: val }, "*");
      } else if (event === "mute" || event === "unmute") {
        const muteCommand = event === "mute" ? "mute" : "unMute";
        targetWindow.postMessage(JSON.stringify({ event: "command", func: muteCommand }), "*");
        targetWindow.postMessage(JSON.stringify({ event }), "*");
        targetWindow.postMessage({ event }, "*");
        targetWindow.postMessage({ method: event }, "*");
      }
    } catch (err) {
      console.warn("Failed to dispatch command to player iframe:", err);
    }
  };

  // Play/Pause toggler
  const togglePlay = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    sendIframeCommand(nextPlay ? "play" : "pause");
  };

  // Mute toggler
  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sendIframeCommand(nextMute ? "mute" : "unmute");
  };

  // Seek handler
  const handleSeek = (e) => {
    const seekVal = parseFloat(e.target.value);
    setCurrentTime(seekVal);
    currentProgressRef.current = seekVal;
    sendIframeCommand("seek", null, seekVal);
  };

  // Handle Swipe-Down gesture to exit on mobile
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - touchStartY.current;
    
    // If swiped down more than 140px, close player
    if (diffY > 140) {
      onClose();
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  // Listen to postMessage from Vidking iframe player
  useEffect(() => {
    const handlePlayerMessage = (event) => {
      if (!event.data) return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (!data || !data.event) return;

        const eventType = data.event;
        
        switch (eventType) {
          case "play":
            setIsPlaying(true);
            break;
          case "pause":
            setIsPlaying(false);
            if (data.progress || data.currentTime) {
              const currentProgress = data.progress || data.currentTime || data.time || 0;
              const dur = data.duration || 0;
              currentProgressRef.current = currentProgress;
              setCurrentTime(currentProgress);
              if (dur) setDuration(dur);
              onProgressUpdate(currentProgress, dur, "pause");
            }
            break;
          case "seeked":
            if (data.progress || data.currentTime) {
              const currentProgress = data.progress || data.currentTime || data.time || 0;
              const dur = data.duration || 0;
              currentProgressRef.current = currentProgress;
              setCurrentTime(currentProgress);
              if (dur) setDuration(dur);
              onProgressUpdate(currentProgress, dur, "seeked");
            }
            break;
          case "timeupdate":
            const currentProgress = data.progress || data.currentTime || data.time || data.value || 0;
            const dur = data.duration || data.maxTime || 0;
            currentProgressRef.current = currentProgress;
            setCurrentTime(currentProgress);
            if (dur) setDuration(dur);
            onProgressUpdate(currentProgress, dur, "timeupdate");
            break;
          case "ended":
            onProgressUpdate(data.duration || 0, data.duration || 0, "ended");
            if (nextEpisodeAvailable && onNextEpisode) {
              setCountdownSeconds(5);
            }
            break;
          default:
            break;
        }
      } catch (err) {
        // Safe catch for non-JSON postmessages
      }
    };

    window.addEventListener("message", handlePlayerMessage);
    return () => {
      window.removeEventListener("message", handlePlayerMessage);
    };
  }, [onProgressUpdate, nextEpisodeAvailable, onNextEpisode]);

  // Custom 5-second countdown timer for next episode
  useEffect(() => {
    if (countdownSeconds === null) return;
    if (countdownSeconds <= 0) {
      setCountdownSeconds(null);
      onNextEpisode();
      return;
    }
    const t = setTimeout(() => {
      setCountdownSeconds(countdownSeconds - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [countdownSeconds, onNextEpisode]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleAudioChange = useCallback((newAudioLang) => {
    if (newAudioLang === selectedAudio) return;
    setSelectedAudio(newAudioLang);
    if (onAudioChange) {
      onAudioChange(newAudioLang);
    }
    fetchPlayerUrl(newAudioLang, currentProgressRef.current, selectedServer);
  }, [selectedAudio, fetchPlayerUrl, onAudioChange, selectedServer]);

  const handleServerChange = useCallback((newServer) => {
    if (newServer === selectedServer) return;
    setSelectedServer(newServer);
    setShowServerMenu(false);
    fetchPlayerUrl(selectedAudio, currentProgressRef.current, newServer);
  }, [selectedServer, selectedAudio, fetchPlayerUrl]);

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
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

  // Auto-hide controls handler
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showEpisodesMenu && countdownSeconds === null) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, showEpisodesMenu, countdownSeconds]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // Time formatter
  const formatTime = (secs) => {
    if (isNaN(secs) || secs === Infinity || secs < 0) return "0:00";
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  if (error === "restricted") {
    return (
      <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 select-none font-[Inter]">
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
    <div 
      ref={playerContainerRef}
      onMouseMove={resetControlsTimeout}
      onTouchStart={(e) => {
        resetControlsTimeout();
        handleTouchStart(e);
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`fixed inset-0 bg-black z-[9999] select-none font-[Inter] overflow-hidden w-screen h-screen flex items-center justify-center ${
        showControls ? "cursor-auto" : "cursor-none"
      }`}
    >
      {/* 1. Sleek Background-Poster Loading Screen (Fades out when ready) */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden transition-all duration-500">
          <div 
            className="absolute inset-0 opacity-30 filter blur-2xl scale-110 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: posterPath ? `url(https://image.tmdb.org/t/p/w780${posterPath})` : "none" }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/90 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6">
            {posterPath && (
              <img 
                src={`https://image.tmdb.org/t/p/w300${posterPath}`} 
                alt={title} 
                className="w-36 md:w-44 rounded-xl shadow-2xl border border-white/10 object-cover aspect-[2/3] animate-pulse"
              />
            )}
            <div>
              <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-widest animate-pulse">
                Preparing Stream
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white mt-1 max-w-lg leading-tight tracking-wide drop-shadow-md">
                {title}
              </h2>
            </div>
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-yellow-400 animate-spin"></div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Orientation Prompt (Portrait Mobile) */}
      {isPortraitMobile && (
        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6 text-center select-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-yellow-400 animate-bounce mb-4">
            <path d="M16 1H8C6.9 1 6 1.9 6 3v18C6 22.1 6.9 23 8 23h8c1.1 0 2-.9 2-2V3C18 1.9 17.1 1 16 1zm0 18H8V5h8v14z" />
          </svg>
          <h3 className="text-lg font-bold text-white mb-2">Rotate device for better viewing</h3>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
            We recommend rotating your device to landscape mode for the best streaming experience.
          </p>
          <button
            onClick={() => setIsPortraitMobile(false)}
            className="mt-6 px-5 py-2 bg-zinc-900 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Continue Anyway
          </button>
        </div>
      )}

      {/* Error View */}
      {error && error !== "restricted" && (
        <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center p-6 text-center gap-4">
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

      {/* Main Video Iframe */}
      {playerUrl && (
        <div className="relative w-full h-full">
          <iframe
            ref={iframeRef}
            src={playerUrl}
            onLoad={handleIframeLoad}
            allowFullScreen
            scrolling="no"
            allow="autoplay; fullscreen"
            className="absolute inset-0 w-full h-full border-0 z-10 bg-black pointer-events-auto"
            title={title}
          ></iframe>
        </div>
      )}

      {/* Interaction Overlay (captures mouse movements & click to reveal controls when they are hidden) */}
      {!showControls && (
        <div 
          className="absolute inset-0 z-30 bg-transparent cursor-none"
          onMouseMove={resetControlsTimeout}
          onClick={resetControlsTimeout}
        />
      )}


      {/* Custom Header Overlay (Top controls) */}
      <div 
        className={`absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-center z-40 transition-all duration-300 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="bg-black/60 hover:bg-zinc-800 border border-white/10 text-white rounded-full p-2.5 backdrop-blur-md transition cursor-pointer flex items-center justify-center"
            title="Go Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M7.82843 10.9999H20V12.9999H7.82843L13.1924 18.3638L11.7782 19.778L4 11.9999L11.7782 4.22168L13.1924 5.63589L7.82843 10.9999Z" />
            </svg>
          </button>
          <div>
            <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-widest">
              Now Streaming
            </span>
            <h3 className="text-sm md:text-base font-bold text-white leading-tight">
              {title}
            </h3>
          </div>
        </div>

        {/* Top-Right Controls Group */}
        <div className="flex items-center gap-3">
          {/* Custom Episodes Selector Dropdown Menu */}
          {type !== "movie" && episodes && episodes.length > 0 && (
            <div ref={episodesMenuRef} className="relative">
              <button 
                onClick={() => setShowEpisodesMenu(!showEpisodesMenu)}
                className="flex items-center gap-1.5 bg-black/60 hover:bg-black/80 border border-white/10 hover:border-white/25 text-white rounded-full px-3 py-2 backdrop-blur-xl transition-all duration-200 cursor-pointer text-xs font-semibold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-yellow-400">
                  <path d="M3 4H21V6H3V4ZM3 11H21V13H3V11ZM3 18H21V20H3V18Z" />
                </svg>
                <span className="hidden sm:inline">Episodes</span>
              </button>
              {showEpisodesMenu && (
                <div className="absolute top-full right-0 mt-3 w-64 max-h-72 overflow-y-auto rounded-xl bg-zinc-950/95 border border-white/10 backdrop-blur-2xl shadow-2xl py-1 z-[50]">
                  <div className="sticky top-0 bg-zinc-950 px-4 py-2 font-black text-[10px] uppercase tracking-widest border-b border-white/5 text-zinc-400">
                    Select Episode
                  </div>
                  {episodes.map((ep) => {
                    const isCurrent = ep.episode_number === episode;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => {
                          if (onPlayEpisode) onPlayEpisode(ep.episode_number);
                          setShowEpisodesMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition text-xs ${
                          isCurrent ? "text-yellow-400 font-bold bg-yellow-400/10" : "text-zinc-300 font-semibold"
                        }`}
                      >
                        <span className="truncate">E{ep.episode_number} - {ep.name || `Episode ${ep.episode_number}`}</span>
                        {isCurrent && <span className="text-[9px] uppercase font-extrabold text-yellow-400 tracking-wider">Playing</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Server Selector Dropdown */}
          <div ref={serverMenuRef} className="relative">
            <button 
              onClick={() => setShowServerMenu(!showServerMenu)}
              className="flex items-center gap-1.5 bg-black/60 hover:bg-black/80 border border-white/10 hover:border-white/25 text-white rounded-full px-3 py-2 backdrop-blur-xl transition-all duration-200 cursor-pointer text-xs font-semibold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-yellow-400">
                <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
                <path d="M12 6c-3.309 0-6 2.691-6 6s2.691 6 6 6 6-2.691 6-6-2.691-6-6-6zm0 10c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z"/>
              </svg>
              <span>Server: {selectedServer === "vidking" ? "Main" : selectedServer === "vidsrc" ? "Server 2" : "Server 3"}</span>
            </button>
            {showServerMenu && (
              <div className="absolute top-full right-0 mt-3 w-48 rounded-xl bg-zinc-950/95 border border-white/10 backdrop-blur-2xl shadow-2xl py-1 z-[50]">
                <div className="sticky top-0 bg-zinc-950 px-4 py-2 font-black text-[10px] uppercase tracking-widest border-b border-white/5 text-zinc-400">
                  Choose Server
                </div>
                {[
                  { id: "vidking", name: "Main Server" },
                  { id: "vidsrc", name: "Server 2 (Backup)" },
                  { id: "vidlink", name: "Server 3 (Fast)" },
                ].map((srv) => {
                  const isCurrent = srv.id === selectedServer;
                  return (
                    <button
                      key={srv.id}
                      onClick={() => handleServerChange(srv.id)}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition text-xs ${
                        isCurrent ? "text-yellow-400 font-bold bg-yellow-400/10" : "text-zinc-300 font-semibold"
                      }`}
                    >
                      <span>{srv.name}</span>
                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Audio Selector Dropdown */}
          {availableLanguages && availableLanguages.length > 0 && (
            <AudioSelector
              availableLanguages={availableLanguages}
              selectedAudio={selectedAudio}
              originalLanguage={originalLanguage}
              onAudioChange={handleAudioChange}
            />
          )}

          {/* Next Episode Button */}
          {type !== "movie" && nextEpisodeAvailable && onNextEpisode && (
            <button
              onClick={onNextEpisode}
              className="bg-black/60 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-white font-bold px-3.5 py-2.5 rounded-full flex items-center gap-1.5 transition text-xs cursor-pointer"
              title="Play Next Episode"
            >
              <span>Next</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M16 12L10 18V6L16 12ZM18 6V18H20V6H18Z" />
              </svg>
            </button>
          )}

        </div>
      </div>

      {/* 3. Immersive Netflix-style Countdown Timer (Ends of Episode) */}
      {countdownSeconds !== null && (
        <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-6 text-center select-none font-[Inter]">
          <div className="relative w-28 h-28 flex items-center justify-center mb-6">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="56" cy="56" r="48" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle cx="56" cy="56" r="48" fill="transparent" stroke="#ffc600" strokeWidth="6" strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 * (1 - countdownSeconds / 5)} className="transition-all duration-1000 ease-linear" />
            </svg>
            <span className="text-4xl font-extrabold text-white">{countdownSeconds}</span>
          </div>
          <h3 className="text-2xl font-black tracking-wide text-white mb-1">Playing Next Episode</h3>
          <p className="text-sm text-zinc-400 mb-8 max-w-xs">
            The next episode will play automatically.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setCountdownSeconds(null);
                onNextEpisode();
              }}
              className="px-6 py-3 rounded-xl bg-yellow-400 text-black font-bold text-sm cursor-pointer hover:bg-yellow-300 transition"
            >
              Play Now
            </button>
            <button
              onClick={() => setCountdownSeconds(null)}
              className="px-6 py-3 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 text-white font-semibold text-sm cursor-pointer transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
