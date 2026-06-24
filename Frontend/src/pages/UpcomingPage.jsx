import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import LazyMediaRow from "../components/LazyMediaRow";
import {
  getUpcomingMovies,
  getAnimeUpcoming,
  getUpcomingTV,
  getUpcomingWebSeries,
  getUpcomingCartoons,
} from "../services/api";
import { formatReleaseDate, getCountdownLabel } from "../utils/releaseUtils";

// ────────────────────────────────────────────────────────────
// Category config
// ────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: "movies",
    label: "🎬 Upcoming Movies",
    type: "movie",
    fetcher: () => getUpcomingMovies(1),
    emoji: "🎬",
    color: "from-yellow-600/20 to-yellow-500/5",
    border: "border-yellow-500/30",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
  {
    key: "web-series",
    label: "📱 Upcoming Web Series",
    type: "web-series",
    fetcher: () => getUpcomingWebSeries(1),
    emoji: "📱",
    color: "from-blue-600/20 to-blue-500/5",
    border: "border-blue-500/30",
    badge: "bg-blue-500/20 text-blue-300",
  },
  {
    key: "tv",
    label: "📺 Upcoming TV Shows",
    type: "tv",
    fetcher: () => getUpcomingTV(1),
    emoji: "📺",
    color: "from-emerald-600/20 to-emerald-500/5",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-300",
  },
  {
    key: "anime",
    label: "⚡ Upcoming Anime",
    type: "anime",
    fetcher: () => getAnimeUpcoming(1),
    emoji: "⚡",
    color: "from-pink-600/20 to-pink-500/5",
    border: "border-pink-500/30",
    badge: "bg-pink-500/20 text-pink-300",
  },
  {
    key: "cartoons",
    label: "🎨 Upcoming Cartoons",
    type: "cartoon",
    fetcher: () => getUpcomingCartoons(1),
    emoji: "🎨",
    color: "from-orange-600/20 to-orange-500/5",
    border: "border-orange-500/30",
    badge: "bg-orange-500/20 text-orange-300",
  },
];

// ────────────────────────────────────────────────────────────
// Countdown card overlay component
// ────────────────────────────────────────────────────────────
const CountdownBadge = ({ item }) => {
  const dateStr = item.release_date || item.first_air_date;
  if (!dateStr) return null;
  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-3 pt-6">
      <p className="text-white text-xs font-bold truncate">{item.title || item.name}</p>
      <p className="text-violet-300 text-[10px] font-medium mt-0.5">{formatReleaseDate(dateStr)}</p>
      <span className="mt-1 inline-block bg-violet-600/30 border border-violet-500/40 text-violet-300 text-[9px] font-bold px-2 py-0.5 rounded-full">
        {getCountdownLabel(item)}
      </span>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Main UpcomingPage component
// ────────────────────────────────────────────────────────────
const UpcomingPage = () => {
  const [stats, setStats] = useState({ totalItems: 0, loaded: false });

  return (
    <div className="min-h-screen bg-black text-white pb-20 font-[Inter]">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden pt-24 pb-12 px-6 md:px-12">
        {/* Animated background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-violet-600/15 blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
              Coming Soon
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4">
            Upcoming
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400"> Releases</span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-2xl leading-relaxed">
            Stay ahead of the curve. Discover what's dropping next — movies, series, anime, and more — all in one place.
          </p>

          {/* Quick category pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {CATEGORIES.map((cat) => (
              <a
                key={cat.key}
                href={`#upcoming-${cat.key}`}
                className="text-sm font-medium px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
              >
                {cat.emoji} {cat.label.split(" ").slice(1).join(" ")}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category Sections ── */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-16">
        {CATEGORIES.map((cat) => (
          <section key={cat.key} id={`upcoming-${cat.key}`}>
            {/* Section header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-8 rounded-full bg-gradient-to-b ${cat.color.replace("/20", "").replace("/5", "")}`} />
                <h2 className="text-xl md:text-2xl font-bold">{cat.label}</h2>
              </div>
              <Link
                to={`/${cat.type === "movie" ? "movies" : cat.type}/upcoming`}
                className="text-xs text-gray-400 hover:text-white transition flex items-center gap-1 group"
              >
                View All
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform">
                  <path d="M13.1717 12.0007L8.22192 7.05093L9.63614 5.63672L16.0001 12.0007L9.63614 18.3646L8.22192 16.9504L13.1717 12.0007Z" />
                </svg>
              </Link>
            </div>

            {/* LazyMediaRow with the upcoming fetcher */}
            <LazyMediaRow
              title=""
              type={cat.type}
              fetcher={cat.fetcher}
              sectionKey={`upcoming-${cat.key}`}
            />
          </section>
        ))}
      </div>

      {/* ── Footer note ── */}
      <div className="text-center mt-16 text-gray-600 text-xs px-4">
        Release dates are sourced from TMDB and may be subject to change.
      </div>
    </div>
  );
};

export default UpcomingPage;
