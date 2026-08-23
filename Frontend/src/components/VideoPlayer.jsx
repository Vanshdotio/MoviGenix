import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  getSecurePlayerUrl,
  getAvailableLanguages,
  getActiveAdsApi,
  trackAdViewApi,
  trackAdClickApi,
  trackAdCompleteApi,
  trackAdSkipApi,
} from "../services/api";
import AudioSelector from "./AudioSelector";
import { trackPlayerEvent, trackWatchProgress } from "../services/telemetry";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
const AUTO_HIDE_MS = 4000;
import { useAuth } from "../context/AuthContext";

// Web Audio API Audio Enhancer Class
class AudioEnhancer {
  constructor(mediaElement) {
    if (!mediaElement) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.source = this.audioContext.createMediaElementSource(mediaElement);

      this.gainNode = this.audioContext.createGain();
      this.compressor = this.audioContext.createDynamicsCompressor();

      // Equalizer nodes
      this.lowFilter = this.audioContext.createBiquadFilter();
      this.lowFilter.type = "lowshelf";
      this.lowFilter.frequency.value = 250;

      this.midFilter = this.audioContext.createBiquadFilter();
      this.midFilter.type = "peaking";
      this.midFilter.frequency.value = 1500;
      this.midFilter.Q.value = 1.0;

      this.highFilter = this.audioContext.createBiquadFilter();
      this.highFilter.type = "highshelf";
      this.highFilter.frequency.value = 6000;

      // Connect: Source -> LowFilter -> MidFilter -> HighFilter -> Compressor -> Gain -> Destination
      this.source.connect(this.lowFilter);
      this.lowFilter.connect(this.midFilter);
      this.midFilter.connect(this.highFilter);
      this.highFilter.connect(this.compressor);
      this.compressor.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      // Default mode
      this.setMode("Voice Boost");
    } catch (err) {
      console.warn("Web Audio API not fully supported or blocked for this element:", err);
    }
  }

  setVolume(volume) {
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }
  }

  setMode(mode) {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    // Reset EQ gains
    this.lowFilter.gain.setValueAtTime(0, now);
    this.midFilter.gain.setValueAtTime(0, now);
    this.highFilter.gain.setValueAtTime(0, now);

    // Default Compressor settings (Normalize audio)
    this.compressor.threshold.setValueAtTime(-24, now);
    this.compressor.knee.setValueAtTime(30, now);
    this.compressor.ratio.setValueAtTime(12, now);
    this.compressor.attack.setValueAtTime(0.003, now);
    this.compressor.release.setValueAtTime(0.25, now);

    switch (mode) {
      case "Standard":
        // Bypass/Flat response
        this.compressor.threshold.setValueAtTime(-10, now);
        this.compressor.ratio.setValueAtTime(1, now);
        break;

      case "Voice Boost":
        // Enhance dialogue / speech clarity
        this.lowFilter.gain.setValueAtTime(-4, now); // Reduce background rumble
        this.midFilter.gain.setValueAtTime(6, now);  // Boost speech mid range (1.5kHz)
        this.highFilter.gain.setValueAtTime(2, now); // Add clarity to consonants
        this.compressor.threshold.setValueAtTime(-20, now);
        this.compressor.ratio.setValueAtTime(4, now);
        break;

      case "Cinema":
        // Rich bass and sparkling highs for action/movie feel
        this.lowFilter.gain.setValueAtTime(5, now);
        this.midFilter.gain.setValueAtTime(2, now);
        this.highFilter.gain.setValueAtTime(4, now);
        this.compressor.threshold.setValueAtTime(-15, now);
        this.compressor.ratio.setValueAtTime(3, now);
        break;

      case "Loud":
        // Heavy compression to maximize average loudness, slight mid-high boost
        this.midFilter.gain.setValueAtTime(3, now);
        this.highFilter.gain.setValueAtTime(3, now);
        this.compressor.threshold.setValueAtTime(-36, now);
        this.compressor.ratio.setValueAtTime(8, now);
        break;

      case "Night Mode":
        // Compress heavily, cut deep bass (wall shaking), boost voice range slightly
        this.lowFilter.gain.setValueAtTime(-12, now); // Remove bass
        this.midFilter.gain.setValueAtTime(4, now);   // Clear voices
        this.highFilter.gain.setValueAtTime(-2, now);  // Smooth high frequencies
        this.compressor.threshold.setValueAtTime(-30, now);
        this.compressor.ratio.setValueAtTime(12, now);
        break;

      default:
        break;
    }
  }

  close() {
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
    }
  }
}

const ALL_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi (Original)" },
  { code: "te", name: "Telugu" },
  { code: "ta", name: "Tamil" },
  { code: "ml", name: "Malayalam" },
  { code: "kn", name: "Kannada" },
  { code: "pa", name: "Punjabi" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" }
];

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
  const { user, updateProfile } = useAuth();

  const [playerUrl, setPlayerUrl] = useState("");
  const [canLoadPlayer, setCanLoadPlayer] = useState(false);
  const [adsList, setAdsList] = useState([]);
  const [currentAd, setCurrentAd] = useState(null);
  const [adPlaying, setAdPlaying] = useState(false);
  const [adDuration, setAdDuration] = useState(0);
  const [adCurrentTime, setAdCurrentTime] = useState(0);
  const [skipTimer, setSkipTimer] = useState(0);
  const [firedMidRolls, setFiredMidRolls] = useState([]);
  const [postRollPlayed, setPostRollPlayed] = useState(false);
  const adVideoRef = useRef(null);

  const [adSkippable, setAdSkippable] = useState(false);
  const [preRollCount, setPreRollCount] = useState(0);
  const [midRollCount, setMidRollCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(initialAudio || "original");

  // Load initial settings
  const getInitialVolume = () => {
    const saved = localStorage.getItem("movigenix_volume");
    if (saved !== null) return parseFloat(saved);
    if (user?.preferences?.volume !== undefined) return user.preferences.volume;
    return 0.9; // Default 90% volume
  };

  const getInitialAudioMode = () => {
    const saved = localStorage.getItem("movigenix_audioMode");
    if (saved !== null) return saved;
    if (user?.preferences?.audioMode !== undefined) return user.preferences.audioMode;
    return "Voice Boost"; // Default "Voice Boost"
  };

  // Settings State
  const [volume, setVolumeState] = useState(getInitialVolume());
  const [audioMode, setAudioModeState] = useState(getInitialAudioMode());

  // Custom Player Overlay States
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialProgress);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [showEpisodesMenu, setShowEpisodesMenu] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(null);
  const [selectedServer, setSelectedServer] = useState(() => {
    return localStorage.getItem("movigenix_server") || "main";
  });
  const [showServerMenu, setShowServerMenu] = useState(false);

  // OTT Custom Language Selector States & Refs
  const [switchingLanguage, setSwitchingLanguage] = useState(false);
  const [switchingMessage, setSwitchingMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [languageSelected, setLanguageSelected] = useState(false);
  const [failedPlayers, setFailedPlayers] = useState([]);
  const [isLangMenuFading, setIsLangMenuFading] = useState(false);

  const langScrollRef = useRef(null);
  const langAutoHideTimerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const playerContainerRef = useRef(null);
  const iframeRef = useRef(null);
  const audioRef = useRef(null);
  const audioEnhancerRef = useRef(null);
  const currentProgressRef = useRef(initialProgress);
  const controlsTimeoutRef = useRef(null);
  const touchStartY = useRef(null);
  const serverMenuRef = useRef(null);
  const episodesMenuRef = useRef(null);
  const lastProgressSentTimeRef = useRef(0);
  const syncSettingsTimeoutRef = useRef(null);
  const activePlayerRef = useRef(null);
  const fallbackTimeoutRef = useRef(null);

  // Clear existing auto-hide timer
  const clearLangAutoHideTimer = useCallback(() => {
    if (langAutoHideTimerRef.current) {
      clearTimeout(langAutoHideTimerRef.current);
      langAutoHideTimerRef.current = null;
    }
  }, []);

  // Start auto-hide timer with smooth fade-out
  const startLangAutoHideTimer = useCallback(() => {
    clearLangAutoHideTimer();
    langAutoHideTimerRef.current = setTimeout(() => {
      setIsLangMenuFading(true);
      setTimeout(() => {
        setLanguageSelected(true);
        setIsLangMenuFading(false);
      }, 250);
    }, AUTO_HIDE_MS);
  }, [clearLangAutoHideTimer]);

  // Auto-hide timer effect when language menu is shown/hidden
  useEffect(() => {
    if (!languageSelected) {
      setIsLangMenuFading(false);
      startLangAutoHideTimer();
    } else {
      clearLangAutoHideTimer();
      setIsLangMenuFading(false);
    }
    return () => clearLangAutoHideTimer();
  }, [languageSelected, startLangAutoHideTimer, clearLangAutoHideTimer]);

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

  const clearFallbackTimeout = () => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    setLanguageSelected(true);
    console.log(`[Playback Verified] Playback verified for active player: ${activePlayerRef.current}`);
  };

  const startPlaybackCheck = (playerName, audioLang, progress, serverName) => {
    // Disabled auto-switching on playback issues as requested by the user
    return;
  };

  // Build and fetch secure player URL
  const fetchPlayerUrl = useCallback(async (audioLang, progress, serverName = selectedServer, excludeList = failedPlayers) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        color: "ffc600", // Match custom gold theme
        progress: Math.floor(progress),
        autoplay: "1", // Auto play next/initial
        server: serverName,
      };

      if (excludeList && excludeList.length > 0) {
        params.exclude = excludeList.join(",");
      }
      
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
      if (response && response.error) {
        setError(response.error);
        setLoading(false);
        setSwitchingLanguage(false);
        return;
      }
      
      if (response && (response.embedUrl || response.playerUrl)) {
        const nextUrl = response.embedUrl || response.playerUrl;
        setPlayerUrl(nextUrl);
        activePlayerRef.current = response.player;
        if (response.language) {
          setSelectedAudio(response.language);
        }
        
        startPlaybackCheck(response.player, response.language || audioLang, progress, serverName);
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
  }, [type, id, season, episode, selectedServer, failedPlayers]);

  const isLanguageSupported = (code) => {
    if (availableLanguages && availableLanguages.length > 0) {
      return availableLanguages.some(
        (l) => l.iso_639_1 === code || l.code === code || l === code
      );
    }
    const allSupported = ["en", "hi", "te", "ta", "ml", "kn", "pa", "fr", "es", "de", "ja", "ko", "zh"];
    return allSupported.includes(code);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  const handleLanguageSelect = async (langCode) => {
    if (langCode === selectedAudio) return;
    
    // Clear auto-hide timer and close language menu immediately on selection
    clearLangAutoHideTimer();
    setIsLangMenuFading(false);

    // Hide controls immediately on selection so it disappears
    setShowControls(false);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    setLanguageSelected(true);
    
    try {
      setSwitchingLanguage(true);
      setSwitchingMessage("Switching Language...");
      
      const t1 = setTimeout(() => setSwitchingMessage("Finding Best Stream..."), 1200);
      const t2 = setTimeout(() => setSwitchingMessage("Connecting..."), 2400);

      const currentProgress = currentProgressRef.current || 0;
      
      const params = {
        progress: Math.floor(currentProgress),
        autoplay: "1",
        audio: langCode
      };
      
      if (type !== "movie") {
        params.season = season;
        params.episode = episode;
      }
      
      const response = await getSecurePlayerUrl(type, id, params);
      
      clearTimeout(t1);
      clearTimeout(t2);

      if (response && response.error) {
        showToast("Language unavailable: No player supports this language.");
        setLanguageSelected(false);
        setSwitchingLanguage(false);
        return;
      }
      
      if (response && (response.embedUrl || response.playerUrl)) {
        setPlayerUrl(response.embedUrl || response.playerUrl);
        setSelectedAudio(response.language || langCode);
      } else {
        showToast("Language switching failed.");
        setLanguageSelected(false);
        setSwitchingLanguage(false);
      }
    } catch (err) {
      console.error("Error switching language:", err);
      showToast("Failed to switch audio stream.");
      setLanguageSelected(false);
      setSwitchingLanguage(false);
    }
  };

  const handleLangScrollWheel = (e) => {
    if (langScrollRef.current) {
      langScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - langScrollRef.current.offsetLeft);
    setScrollLeft(langScrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMoveDrag = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - langScrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    langScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  // Initial load
  useEffect(() => {
    setLoading(true);
    setPlayerUrl("");
    setLanguageSelected(false);
    setFailedPlayers([]);
    fetchPlayerUrl(selectedAudio, initialProgress, selectedServer, []);
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

  // Volume scaling function based on active audioMode
  const getScaledVolume = useCallback((volVal, modeVal) => {
    let multiplier = 1.0;
    switch (modeVal) {
      case "Standard":
        multiplier = 1.0;
        break;
      case "Voice Boost":
        multiplier = 1.15; // Boost dialogue level slightly
        break;
      case "Cinema":
        multiplier = 1.25; // Boost rich effects/dialogue
        break;
      case "Loud":
        multiplier = 1.5;  // Hard boost
        break;
      case "Night Mode":
        multiplier = 0.7;  // Soften level
        break;
      default:
        break;
    }
    return Math.min(1.0, volVal * multiplier);
  }, []);

  // Settings persistence handler (LocalStorage + DB updateProfile)
  const saveSettings = useCallback((newVol, newMode) => {
    localStorage.setItem("movigenix_volume", newVol);
    localStorage.setItem("movigenix_audioMode", newMode);

    if (syncSettingsTimeoutRef.current) {
      clearTimeout(syncSettingsTimeoutRef.current);
    }

    syncSettingsTimeoutRef.current = setTimeout(() => {
      if (user) {
        updateProfile({
          preferences: {
            volume: newVol,
            audioMode: newMode
          }
        }).catch((err) => console.error("Failed to sync player preferences:", err));
      }
    }, 1000);
  }, [user, updateProfile]);

  // Audio Enhancer effects controller
  useEffect(() => {
    if (audioEnhancerRef.current) {
      audioEnhancerRef.current.setMode(audioMode);
      audioEnhancerRef.current.setVolume(getScaledVolume(volume, audioMode));
    }
    
    // Also notify iframe player about volume updates
    if (playerUrl && !loading) {
      const scaledVol = getScaledVolume(volume, audioMode);
      sendIframeCommand("volume", null, scaledVol);
    }
  }, [volume, audioMode, playerUrl, loading, getScaledVolume]);

  // Initialize Web Audio API Audio Enhancer on mounting
  useEffect(() => {
    if (audioRef.current) {
      audioEnhancerRef.current = new AudioEnhancer(audioRef.current);
      audioEnhancerRef.current.setMode(audioMode);
      audioEnhancerRef.current.setVolume(getScaledVolume(volume, audioMode));
    }
    return () => {
      if (audioEnhancerRef.current) {
        audioEnhancerRef.current.close();
      }
      if (syncSettingsTimeoutRef.current) {
        clearTimeout(syncSettingsTimeoutRef.current);
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
      clearLangAutoHideTimer();
    };
  }, [clearLangAutoHideTimer]);

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
      } else if (event === "volume" && typeof val === "number") {
        // Send volume configurations in all expected formats
        targetWindow.postMessage(JSON.stringify({ event: "command", func: "setVolume", params: [val * 100] }), "*");
        targetWindow.postMessage(JSON.stringify({ event: "command", func: "setVolume", params: [val] }), "*");
        targetWindow.postMessage(JSON.stringify({ event: "volume", value: val }), "*");
        targetWindow.postMessage({ event: "volume", value: val }, "*");
        targetWindow.postMessage({ method: "setVolume", value: val }, "*");
        targetWindow.postMessage({ method: "setVolume", value: val * 100 }, "*");
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

        // Clear playback verification fallback since player is active
        clearFallbackTimeout();

        const eventType = data.event;
        
        switch (eventType) {
          case "play":
            setIsPlaying(true);
            trackPlayerEvent(id, type, title, "play");
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
              
              // Track event and save progress immediately on pause
              trackPlayerEvent(id, type, title, "pause");
              if (dur > 0) {
                trackWatchProgress(id, type, title, posterPath, currentProgress, dur);
              }
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
              
              trackPlayerEvent(id, type, title, "seek", { seekTo: currentProgress });
            }
            break;
          case "timeupdate":
            const currentProgress = data.progress || data.currentTime || data.time || data.value || 0;
            const dur = data.duration || data.maxTime || 0;
            currentProgressRef.current = currentProgress;
            setCurrentTime(currentProgress);
            if (dur) setDuration(dur);
            onProgressUpdate(currentProgress, dur, "timeupdate");
            checkMidRollAds(currentProgress);
            
            // Throttle telemetry progress reports to once every 15 seconds
            if (dur > 0 && Date.now() - lastProgressSentTimeRef.current > 15000) {
              trackWatchProgress(id, type, title, posterPath, currentProgress, dur);
              lastProgressSentTimeRef.current = Date.now();
            }
            break;
          case "ended":
            const finalDur = data.duration || duration || 0;
            onProgressUpdate(finalDur, finalDur, "ended");
            
            trackPlayerEvent(id, type, title, "complete");
            if (finalDur > 0) {
              trackWatchProgress(id, type, title, posterPath, finalDur, finalDur);
            }
            
             // Check for Post-roll ad!
             const postRollAd = type === "movie" ? adsList.find(a => a.placement === "post-roll") : null;
             if (postRollAd && !user?.isPremium && !postRollPlayed) {
               setPostRollPlayed(true);
               playAd(postRollAd);
             } else if (nextEpisodeAvailable && onNextEpisode) {
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
  }, [onProgressUpdate, nextEpisodeAvailable, onNextEpisode, id, type, title, posterPath, duration]);

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
    setSwitchingLanguage(false);
    setSwitchingMessage("");
    setShowControls(false);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Set initial volume immediately on load
    const scaledVol = getScaledVolume(volume, audioMode);
    sendIframeCommand("volume", null, scaledVol);
  };

  const handleAudioChange = useCallback((newAudioLang) => {
    if (newAudioLang === selectedAudio) return;
    setSelectedAudio(newAudioLang);
    if (onAudioChange) {
      onAudioChange(newAudioLang);
    }
    trackPlayerEvent(id, type, title, "audio_change", { fromAudio: selectedAudio, toAudio: newAudioLang });
    fetchPlayerUrl(newAudioLang, currentProgressRef.current, selectedServer);
  }, [selectedAudio, fetchPlayerUrl, onAudioChange, selectedServer, id, type, title]);

  const handleServerChange = useCallback((newServer) => {
    if (newServer === selectedServer) return;
    setSelectedServer(newServer);
    localStorage.setItem("movigenix_server", newServer);
    setShowServerMenu(false);
    trackPlayerEvent(id, type, title, "quality_change", { fromServer: selectedServer, toServer: newServer });
    fetchPlayerUrl(selectedAudio, currentProgressRef.current, newServer);
  }, [selectedServer, selectedAudio, fetchPlayerUrl, id, type, title]);

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

  // Reset ad playback and limits when media changes
  useEffect(() => {
    setPreRollCount(0);
    setMidRollCount(0);
    setFiredMidRolls([]);
    setPostRollPlayed(false);
    setCanLoadPlayer(false);
  }, [id, season, episode]);

  const getMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}${url}`;
  };

  const playAd = (ad) => {
    setCurrentAd(ad);
    setAdPlaying(true);
    setSkipTimer(ad.skipAfter);
    setAdCurrentTime(0);
    
    // Pause movie if already loaded
    sendIframeCommand("pause");
    
    trackAdViewApi(ad._id).catch(err => console.error("Error tracking ad view:", err));
  };

  // Sync volume with ad video element
  useEffect(() => {
    if (adPlaying && adVideoRef.current) {
      adVideoRef.current.volume = isMuted ? 0 : volume;
      adVideoRef.current.muted = isMuted;
    }
  }, [volume, isMuted, adPlaying]);

  // Skip countdown effect
  useEffect(() => {
    if (!adPlaying || !currentAd || skipTimer <= 0) return;
    const timer = setTimeout(() => {
      setSkipTimer(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [adPlaying, currentAd, skipTimer]);

  // Fetch active ads on mount / media change
  useEffect(() => {
    const fetchAds = async () => {
      if (user?.isPremium) {
        setCanLoadPlayer(true);
        return;
      }
      try {
        const res = await getActiveAdsApi();
        if (res.success && res.ads && res.ads.length > 0) {
          setAdsList(res.ads);
          // Check for pre-roll ad (limit 1)
          const preRollAd = res.ads.find(a => a.placement === "pre-roll");
          if (preRollAd && preRollCount < 1) {
            setPreRollCount(1);
            playAd(preRollAd);
          } else {
            setCanLoadPlayer(true);
          }
        } else {
          setCanLoadPlayer(true);
        }
      } catch (err) {
        console.error("Error loading active ads:", err);
        setCanLoadPlayer(true);
      }
    };
    fetchAds();
  }, [id, type, user, season, episode]);

  const handleAdClick = (e) => {
    e.stopPropagation();
    if (!currentAd) return;
    trackAdClickApi(currentAd._id).catch(err => console.error("Error tracking ad click:", err));
    const dest = currentAd.description && currentAd.description.startsWith("http")
      ? currentAd.description
      : "https://www.google.com";
    window.open(dest, "_blank");
  };

  const handleAdTimeUpdate = () => {
    if (adVideoRef.current) {
      setAdCurrentTime(adVideoRef.current.currentTime);
    }
  };

  const handleAdLoadedMetadata = () => {
    if (adVideoRef.current && currentAd) {
      const dur = adVideoRef.current.duration;
      setAdDuration(dur);
      
      let isSkippable = false;
      let delay = 0;
      
      if (currentAd.smartSkip) {
        // Smart Skip: <=15s -> No Skip, >15s -> Skip after delay (default 5s)
        if (dur > 15) {
          isSkippable = true;
          delay = currentAd.skipAfter || 5;
        } else {
          isSkippable = false;
          delay = 0;
        }
      } else {
        // Smart Skip disabled -> respect custom setting
        isSkippable = currentAd.skipAfter > 0;
        delay = currentAd.skipAfter;
      }
      
      setAdSkippable(isSkippable);
      setSkipTimer(delay);
    }
  };

  const handleAdEnded = () => {
    const finishedAd = currentAd;
    const watchedTime = adVideoRef.current ? Math.round(adVideoRef.current.currentTime) : 0;
    trackAdCompleteApi(finishedAd._id, watchedTime).catch(err => console.error("Error tracking ad complete:", err));
    finishAd(finishedAd);
  };

  const handleSkipAd = (e) => {
    e.stopPropagation();
    const skippedAd = currentAd;
    const watchedTime = adVideoRef.current ? Math.round(adVideoRef.current.currentTime) : 0;
    trackAdSkipApi(skippedAd._id, watchedTime).catch(err => console.error("Error tracking ad skip:", err));
    finishAd(skippedAd);
  };

  const finishAd = (ad) => {
    setAdPlaying(false);
    setCurrentAd(null);
    if (ad.placement === "pre-roll") {
      setCanLoadPlayer(true);
    } else if (ad.placement === "mid-roll") {
      sendIframeCommand("play");
    } else if (ad.placement === "post-roll") {
      if (nextEpisodeAvailable && onNextEpisode) {
        setCountdownSeconds(5);
      }
    }
  };

  const checkMidRollAds = (progressTime) => {
    if (user?.isPremium || adsList.length === 0 || adPlaying) return;
    
    // Limits: only mid-roll for movie, max 2
    if (type !== "movie") return;
    if (midRollCount >= 2) return;
    
    const midRolls = adsList.filter(ad => ad.placement === "mid-roll");
    for (const ad of midRolls) {
      if (
        progressTime >= ad.midRollTime &&
        progressTime <= ad.midRollTime + 5 &&
        !firedMidRolls.includes(ad._id)
      ) {
        setFiredMidRolls(prev => [...prev, ad._id]);
        setMidRollCount(prev => prev + 1);
        playAd(ad);
        break;
      }
    }
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
      {playerUrl && canLoadPlayer && (
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
              <span>Server: {{ main: "Main", scape: "Scape", core: "Core", fast: "Fast", super: "Super" }[selectedServer] || "Main"}</span>
            </button>
            {showServerMenu && (
              <div className="absolute top-full right-0 mt-3 w-48 rounded-xl bg-zinc-950/95 border border-white/10 backdrop-blur-2xl shadow-2xl py-1 z-[50]">
                <div className="sticky top-0 bg-zinc-950 px-4 py-2 font-black text-[10px] uppercase tracking-widest border-b border-white/5 text-zinc-400">
                  Choose Server
                </div>
                {[
                  { id: "main", name: "Main Server" },
                  { id: "scape", name: "Server 2 (Scape)" },
                  { id: "core", name: "Server 3 (Core)" },
                  { id: "fast", name: "Server 4 (Fast)" },
                  { id: "super", name: "Server 5 (Super)" },
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

          {/* Audio Mode Selector */}
          <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 hover:border-white/25 rounded-full px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-xl transition duration-200">
            <span className="text-zinc-400 select-none">🎧 Mode:</span>
            <select
              value={audioMode}
              onChange={(e) => {
                const val = e.target.value;
                setAudioModeState(val);
                saveSettings(volume, val);
                if (audioEnhancerRef.current) {
                  audioEnhancerRef.current.setMode(val);
                }
              }}
              className="bg-transparent border-none text-yellow-400 font-bold outline-none cursor-pointer select-none"
            >
              <option value="Standard" className="bg-zinc-950 text-white">Standard</option>
              <option value="Voice Boost" className="bg-zinc-950 text-yellow-400 font-bold">Voice Boost</option>
              <option value="Cinema" className="bg-zinc-950 text-white">Cinema</option>
              <option value="Loud" className="bg-zinc-950 text-white">Loud</option>
              <option value="Night Mode" className="bg-zinc-950 text-white">Night Mode</option>
            </select>
          </div>

          {/* Volume Control Group */}
          <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-full px-3.5 py-2 backdrop-blur-xl text-xs font-semibold text-white">
            <button
              onClick={toggleMute}
              className="text-white hover:text-yellow-400 transition cursor-pointer flex items-center justify-center"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-400">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (isMuted) setIsMuted(false);
                setVolumeState(val);
                saveSettings(val, audioMode);
              }}
              className="w-16 md:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-yellow-400 outline-none"
            />
            <span className="text-[10px] text-zinc-400 font-bold select-none min-w-[24px] text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>

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

      {/* 4. Premium Language Switching Loading Overlay */}
      {switchingLanguage && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center overflow-hidden transition-all duration-500 font-[Inter] backdrop-blur-md">
          <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-yellow-400 animate-spin"></div>
            </div>
            <div>
              <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-widest animate-pulse">
                Multi-Language Swapping
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white mt-1 max-w-lg leading-tight tracking-wide drop-shadow-md">
                {switchingMessage}
              </h2>
            </div>
          </div>
        </div>
      )}

      {/* 5. Custom Toast Alert */}
      {toastMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-xs md:text-sm font-bold px-6 py-3 rounded-full border border-red-500/20 backdrop-blur-xl shadow-2xl z-[99999] animate-bounce flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-white">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* 6. Custom OTT-style Language Selector Bar */}
      {!languageSelected && (
        <div
          onMouseEnter={clearLangAutoHideTimer}
          onMouseLeave={() => {
            if (!languageSelected && !isLangMenuFading) {
              startLangAutoHideTimer();
            }
          }}
          onFocus={clearLangAutoHideTimer}
          onBlur={() => {
            if (!languageSelected && !isLangMenuFading) {
              startLangAutoHideTimer();
            }
          }}
          className={`absolute bottom-0 left-0 w-full px-6 py-8 bg-gradient-to-t from-black/95 via-black/80 to-transparent z-40 transition-all duration-300 ease-out flex flex-col gap-4 ${
            showControls && !isLangMenuFading
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8 pointer-events-none"
          }`}
        >
          <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
            {/* Header Label */}
            <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 select-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-yellow-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138A14.37 14.37 0 0 0 9 5.25M17.25 21a3.75 3.75 0 0 1-3.75-3.75H18c0 2.072-1.678 3.75-3.75 3.75Zm0 0c1.12 0 2.233-.038 3.334-.114" />
              </svg>
              <span>Audio Language</span>
            </div>

            {/* Scrolling Pills */}
            <div 
              ref={langScrollRef}
              onWheel={handleLangScrollWheel}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseLeaveOrUp}
              onMouseLeave={handleMouseLeaveOrUp}
              onMouseMove={handleMouseMoveDrag}
              className="w-full flex items-center justify-start gap-3 overflow-x-auto py-2.5 px-4 scrollbar-none snap-x snap-mandatory scroll-smooth bg-zinc-950/40 border border-white/5 rounded-full backdrop-blur-2xl shadow-inner cursor-grab active:cursor-grabbing select-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {ALL_LANGUAGES.map((lang) => {
                const isSelected = selectedAudio === lang.code;
                const isSupported = isLanguageSupported(lang.code);
                
                return (
                  <button
                    key={lang.code}
                    disabled={!isSupported}
                    onClick={() => handleLanguageSelect(lang.code)}
                    className={`snap-center shrink-0 rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 border focus:outline-none focus:ring-1 focus:ring-yellow-400 select-none ${
                      isSelected
                        ? "bg-yellow-400 text-black border-yellow-400 shadow-lg shadow-yellow-400/20 scale-105"
                        : isSupported
                          ? "bg-white/5 border-white/10 text-white hover:bg-white/15 hover:border-white/20 hover:scale-102 cursor-pointer"
                          : "bg-white/2 border-white/2 text-zinc-600 border-dashed opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {lang.name} {isSelected && <span className="ml-1.5 text-[9px] uppercase font-black tracking-wider">Active</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hidden dummy audio element for Web Audio API registration reference */}
      <audio ref={audioRef} muted className="hidden" />

      {/* 5. Custom Ad Player Overlay */}
      {adPlaying && currentAd && (
        <div className="absolute inset-0 bg-black z-[9999] flex items-center justify-center font-[Inter]">
          <video
            ref={adVideoRef}
            src={getMediaUrl(currentAd.videoUrl)}
            className="w-full h-full object-contain cursor-pointer"
            autoPlay
            playsInline
            onClick={handleAdClick}
            onTimeUpdate={handleAdTimeUpdate}
            onLoadedMetadata={handleAdLoadedMetadata}
            onEnded={handleAdEnded}
          />
          
          {/* Ad Info Overlays */}
          <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/60 border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping"></div>
            <div>
              <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-widest">Advertisement</span>
              <h4 className="text-xs font-bold text-white leading-tight mt-0.5">{currentAd.title}</h4>
            </div>
          </div>

          {/* Ad Call To Action Card */}
          <div 
            onClick={handleAdClick}
            className="absolute bottom-16 left-6 max-w-sm bg-black/85 border border-white/10 p-3.5 rounded-xl backdrop-blur-md flex items-center gap-3 cursor-pointer hover:border-white/20 hover:bg-black/95 transition duration-200"
          >
            {currentAd.thumbnail && (
              <img src={getMediaUrl(currentAd.thumbnail)} alt="ad thumb" className="w-12 h-12 object-cover rounded-lg border border-white/10" />
            )}
            <div className="overflow-hidden">
              <h5 className="text-xs font-bold text-white truncate">{currentAd.title}</h5>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5">{currentAd.description || "Click to learn more"}</p>
            </div>
            <div className="ml-auto w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-black font-bold">
              <i className="ri-external-link-line"></i>
            </div>
          </div>

          {/* Ad Controls / Skip Button - Repositioned to Top Right */}
          <div className="absolute top-6 right-6 z-[99999] flex items-center gap-3">
            {!adSkippable ? (
              <div className="bg-black/65 border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md text-xs font-bold text-zinc-300 select-none tracking-wide">
                Ad <span className="text-yellow-400 font-mono ml-1.5">{formatTime(Math.max(0, adDuration - adCurrentTime))}</span>
              </div>
            ) : skipTimer > 0 ? (
              <div className="bg-black/65 border border-white/10 px-4 py-2.5 rounded-xl backdrop-blur-md text-xs font-bold text-zinc-300 select-none tracking-wide">
                Ad Skip in <span className="text-yellow-400 font-mono ml-1">{skipTimer}</span>...
              </div>
            ) : (
              <button
                onClick={handleSkipAd}
                className="bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-yellow-400/20 border-0"
              >
                <span>Skip Ad</span>
                <i className="ri-arrow-right-line font-bold"></i>
              </button>
            )}
          </div>
        </div>
      )}



    </div>
  );
};

export default VideoPlayer;
