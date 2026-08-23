import React, { useState, useRef, useEffect, useCallback } from "react";

/**
 * ISO 639-1 language name map for common languages
 */
const LANGUAGE_DISPLAY_NAMES = {
  en: "English",
  hi: "Hindi",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
  de: "German",
  ta: "Tamil",
  te: "Telugu",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
  zh: "Chinese",
  ar: "Arabic",
  th: "Thai",
  tr: "Turkish",
  pl: "Polish",
  nl: "Dutch",
  sv: "Swedish",
  da: "Danish",
  fi: "Finnish",
  no: "Norwegian",
  cs: "Czech",
  hu: "Hungarian",
  ro: "Romanian",
  el: "Greek",
  he: "Hebrew",
  id: "Indonesian",
  ms: "Malay",
  vi: "Vietnamese",
  uk: "Ukrainian",
  bg: "Bulgarian",
  hr: "Croatian",
  sk: "Slovak",
  sl: "Slovenian",
  bn: "Bengali",
  ml: "Malayalam",
  kn: "Kannada",
  mr: "Marathi",
  pa: "Punjabi",
  gu: "Gujarati",
};

const getLanguageName = (lang) => {
  if (!lang) return "Unknown";
  return (
    LANGUAGE_DISPLAY_NAMES[lang.iso_639_1] ||
    lang.english_name ||
    lang.name ||
    lang.iso_639_1 ||
    "Unknown"
  );
};

const AUTO_HIDE_MS = 4000;

const AudioSelector = ({
  availableLanguages = [],
  selectedAudio,
  originalLanguage,
  onAudioChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const dropdownRef = useRef(null);
  const autoHideTimerRef = useRef(null);

  // Clear existing auto-hide timer
  const clearAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, []);

  // Start auto-hide timer with smooth fade-out
  const startAutoHideTimer = useCallback(() => {
    clearAutoHideTimer();
    autoHideTimerRef.current = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsFadingOut(false);
      }, 250);
    }, AUTO_HIDE_MS);
  }, [clearAutoHideTimer]);

  // Close immediately without delay (for selection, outside click, escape key)
  const handleCloseImmediately = useCallback(() => {
    clearAutoHideTimer();
    setIsFadingOut(false);
    setIsOpen(false);
  }, [clearAutoHideTimer]);

  // Auto-hide timer trigger on open/close
  useEffect(() => {
    if (isOpen) {
      setIsFadingOut(false);
      startAutoHideTimer();
    } else {
      clearAutoHideTimer();
      setIsFadingOut(false);
    }
    return () => clearAutoHideTimer();
  }, [isOpen, startAutoHideTimer, clearAutoHideTimer]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        handleCloseImmediately();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, handleCloseImmediately]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") handleCloseImmediately();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleCloseImmediately]);

  if (!availableLanguages || availableLanguages.length === 0) return null;

  const currentLangCode = selectedAudio || "original";
  const currentLang = availableLanguages.find(
    (l) => l.iso_639_1 === currentLangCode
  );
  const currentDisplayName = currentLang
    ? getLanguageName(currentLang)
    : currentLangCode === "original"
    ? "Original"
    : currentLangCode.toUpperCase();

  return (
    <div ref={dropdownRef} className="relative z-40">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-black/60 hover:bg-black/80 border border-white/10 hover:border-white/25 text-white rounded-full px-3 py-2 backdrop-blur-xl transition-all duration-200 cursor-pointer group"
        title="Audio Language"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition"
        >
          <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM7.76 16.24L6.34 14.82L7.17 14C6.45 13.13 6 12.09 6 11H8C8 11.65 8.3 12.24 8.76 12.65L10.59 10.82C9.61 10.24 9 9.2 9 8C9 6.34 10.34 5 12 5C13.66 5 15 6.34 15 8H13C13 7.45 12.55 7 12 7C11.45 7 11 7.45 11 8C11 8.55 11.45 9 12 9C13.66 9 15 10.34 15 12C15 13.09 14.39 14.03 13.5 14.53L14.82 15.85L13.41 17.27L11.59 15.45C10.96 15.79 10.25 16 9.5 16C9.02 16 8.56 15.91 8.13 15.76L7.76 16.24ZM12 13C12.55 13 13 12.55 13 12C13 11.45 12.55 11 12 11C11.45 11 11 11.45 11 12C11 12.55 11.45 13 12 13Z" />
        </svg>
        <span className="text-[11px] font-semibold tracking-wide hidden sm:inline">
          {currentDisplayName}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`w-3 h-3 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path d="M11.9997 13.1714L16.9495 8.22168L18.3637 9.63589L11.9997 15.9999L5.63574 9.63589L7.04996 8.22168L11.9997 13.1714Z" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          onMouseEnter={clearAutoHideTimer}
          onMouseLeave={() => {
            if (isOpen && !isFadingOut) startAutoHideTimer();
          }}
          onFocus={clearAutoHideTimer}
          onBlur={() => {
            if (isOpen && !isFadingOut) startAutoHideTimer();
          }}
          className={`absolute top-full mt-2 right-0 w-64 max-h-72 overflow-y-auto rounded-xl bg-zinc-950/95 border border-white/10 backdrop-blur-2xl shadow-2xl transition-all duration-250 ease-out ${
            isFadingOut ? "opacity-0 -translate-y-2 scale-95 pointer-events-none" : "opacity-100 translate-y-0 scale-100"
          }`}
          style={{
            animation: isFadingOut ? "none" : "audioDropdownIn 150ms ease-out",
          }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-2xl px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-blue-400"
              >
                <path d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3ZM12 19C8.13 19 5 15.87 5 12C5 8.13 8.13 5 12 5C15.87 5 19 8.13 19 12C19 15.87 15.87 19 12 19ZM10 8V16L15 12L10 8Z" />
              </svg>
              <span className="text-xs font-bold text-white uppercase tracking-widest">
                Audio Track
              </span>
            </div>
          </div>

          {/* Language list */}
          <div className="py-1">
            {/* Original option always first */}
            <button
              onClick={() => {
                onAudioChange("original");
                handleCloseImmediately();
              }}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer hover:bg-white/5 ${
                currentLangCode === "original"
                  ? "bg-blue-500/10"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base">🌐</span>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-white block truncate">
                    Original
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                    Default Audio
                  </span>
                </div>
              </div>
              {currentLangCode === "original" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 text-blue-400 shrink-0"
                >
                  <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2211L9.9997 15.1709Z" />
                </svg>
              )}
            </button>

            {/* Divider */}
            <div className="h-px bg-white/5 mx-3 my-1"></div>

            {/* Available languages */}
            {availableLanguages
              .filter((lang) => lang.iso_639_1 !== originalLanguage || lang.name !== "Original")
              .slice(0, 25)
              .map((lang) => {
                const langCode = lang.iso_639_1;
                const isSelected = currentLangCode === langCode;
                const isOriginalLang = langCode === originalLanguage;
                const displayName = getLanguageName(lang);

                return (
                  <button
                    key={`${langCode}-${lang.iso_3166_1}`}
                    onClick={() => {
                      onAudioChange(langCode);
                      handleCloseImmediately();
                    }}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer hover:bg-white/5 ${
                      isSelected ? "bg-blue-500/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base">🎧</span>
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-white block truncate">
                          {displayName}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                          {isOriginalLang ? "Original" : "Dubbed"}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4 text-blue-400 shrink-0"
                      >
                        <path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2211L9.9997 15.1709Z" />
                      </svg>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes audioDropdownIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default AudioSelector;
