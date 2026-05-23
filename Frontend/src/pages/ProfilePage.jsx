import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MovieCard from "../components/MovieCard";

const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Jack",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, removeContinueWatching } = useAuth();
  
  const getWatchlistCount = () => {
    if (!user || !user.watchlist) return 0;
    if (Array.isArray(user.watchlist)) return user.watchlist.length;
    const { movie = [], cartoon = [], tv = [], anime = [] } = user.watchlist;
    return movie.length + cartoon.length + tv.length + anime.length;
  };

  const getContinueWatchingCount = () => {
    if (!user || !user.continueWatching) return 0;
    if (Array.isArray(user.continueWatching)) return user.continueWatching.length;
    const { movie = [], cartoon = [], tv = [], anime = [] } = user.continueWatching;
    return movie.length + cartoon.length + tv.length + anime.length;
  };

  const getMergedWatchlist = () => {
    if (!user || !user.watchlist) return [];
    if (Array.isArray(user.watchlist)) return user.watchlist;
    const { movie = [], cartoon = [], tv = [], anime = [] } = user.watchlist;
    return [
      ...movie.map(item => ({ ...item, type: "movie" })),
      ...cartoon.map(item => ({ ...item, type: "cartoon" })),
      ...tv.map(item => ({ ...item, type: "tv" })),
      ...anime.map(item => ({ ...item, type: "anime" }))
    ];
  };

  const getMergedContinueWatching = () => {
    if (!user || !user.continueWatching) return [];
    if (Array.isArray(user.continueWatching)) return user.continueWatching;
    const { movie = [], cartoon = [], tv = [], anime = [] } = user.continueWatching;
    const all = [
      ...movie.map(item => ({ ...item, type: "movie" })),
      ...cartoon.map(item => ({ ...item, type: "cartoon" })),
      ...tv.map(item => ({ ...item, type: "tv" })),
      ...anime.map(item => ({ ...item, type: "anime" }))
    ];
    return all.sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";
  const setActiveTab = (tab) => setSearchParams({ tab });

  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [language, setLanguage] = useState(user?.preferences?.language || "en");
  
  // Content preferences states
  const [safeMode, setSafeMode] = useState(user?.safeMode ?? true);
  const [hideMature, setHideMature] = useState(user?.hideMature ?? true);
  const [isEditingDob, setIsEditingDob] = useState(false);
  const [dob, setDob] = useState(user?.dob || "");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Sync state with user profile updates
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setAvatar(user.avatar || "");
      setLanguage(user.preferences?.language || "en");
      setSafeMode(user.safeMode ?? true);
      setHideMature(user.hideMature ?? true);
      setDob(user.dob || "");
    }
  }, [user]);

  // Guard: redirect minors away from content preferences tab
  useEffect(() => {
    if (activeTab === "preferences" && !(user?.showContentPreferences || user?.isAdult)) {
      setActiveTab("profile");
    }
  }, [activeTab, user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    
    if (!name.trim()) {
      setErrorMsg("Display name cannot be empty.");
      return;
    }

    try {
      setLoading(true);
      await updateProfile({
        name,
        avatar,
        preferences: {
          language,
          theme: "dark"
        }
      });
      setSuccessMsg("Profile settings updated successfully.");
    } catch (err) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    try {
      setLoading(true);
      await updateProfile({
        safeMode,
        hideMature,
      });
      setSuccessMsg("Content preferences updated successfully.");
    } catch (err) {
      setErrorMsg(err.message || "Failed to update preferences.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDob = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!dob) {
      setErrorMsg("Please select your date of birth.");
      return;
    }

    const selectedDate = new Date(dob);
    const today = new Date();
    if (selectedDate > today) {
      setErrorMsg("Date of Birth cannot be in the future.");
      return;
    }

    try {
      setLoading(true);
      await updateProfile({
        dob,
        confirmPassword: user?.googleId ? undefined : confirmPassword,
      });
      setSuccessMsg("Date of Birth updated successfully.");
      setIsEditingDob(false);
      setConfirmPassword("");
    } catch (err) {
      setErrorMsg(err.message || "Failed to update Date of Birth.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Render list grid or empty state
  const renderMediaGrid = (items, type) => {
    if (!items || items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 text-zinc-600 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M12.0006 18.26L4.94715 22.2082L6.52248 14.2799L0.587891 8.7918L8.61493 7.84006L12.0006 0.5L15.3862 7.84006L23.4132 8.7918L17.4787 14.2799L19.054 22.2082L12.0006 18.26Z"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Your list is empty</h3>
          <p className="text-zinc-500 text-sm max-w-xs mb-6">
            Explore movies, TV shows, and anime to add them to your personalized collections.
          </p>
          <button
            onClick={() => navigate("/explore")}
            className="gradient-btn px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition hover:scale-105 active:scale-95 cursor-pointer"
          >
            Explore Content
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {items.map((item) => (
          <MovieCard key={item.id} movie={item} type={item.type} />
        ))}
      </div>
    );
  };

  // Render continue watching grid
  const renderContinueWatchingGrid = (items) => {
    if (!items || items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 text-zinc-600 border border-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M8 5V19L19 12L8 5Z"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No recently watched videos</h3>
          <p className="text-zinc-500 text-sm max-w-xs mb-6">
            Watch trailers for your favorite movies and they will automatically appear here!
          </p>
          <button
            onClick={() => navigate("/")}
            className="gradient-btn px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition hover:scale-105 active:scale-95 cursor-pointer"
          >
            Go Home
          </button>
        </div>
      );
    }

    const handleRemove = (item) => {
      removeContinueWatching({
        id: item.movieId || item.showId || item.animeId || item.id,
        type: item.type,
      });
    };

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {items.map((item) => (
          <div key={item.id} className="relative group rounded-xl overflow-hidden border border-white/5 bg-zinc-950">
            <MovieCard movie={item} type={item.type} />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemove(item);
              }}
              className="absolute top-2 left-2 bg-black/60 border border-white/10 hover:border-red-500 hover:bg-red-500 text-white rounded-full p-1.5 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 shadow-md backdrop-blur-sm z-30 cursor-pointer flex items-center justify-center"
              title="Remove from history"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <path d="M12.0007 10.5865L16.9504 5.63672L18.3646 7.05093L13.4149 12.0007L18.3646 16.9504L16.9504 18.3646L12.0007 13.4149L7.05093 18.3646L5.63672 16.9504L10.5865 12.0007L5.63672 7.05093L7.05093 5.63672L12.0007 10.5865Z" />
              </svg>
            </button>
            <div className="absolute bottom-0 left-0 w-full bg-black/60 backdrop-blur-md px-3 py-1.5 flex items-center justify-between pointer-events-none">
              <span className="text-[10px] text-zinc-400">
                {new Date(item.watchedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-[10px] text-yellow-400 uppercase font-bold">Resume</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16 font-[Inter]">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pb-8 border-b border-zinc-800 mb-8">
          <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-zinc-900 shrink-0">
            <img
              src={avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || "User")}`}
              alt={user?.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center md:text-left flex-1 min-w-0">
            <span className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Premium Member</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold truncate mt-1">{user?.name}</h1>
            <p className="text-zinc-400 text-sm mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold transition cursor-pointer shrink-0"
          >
            Log Out
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 mb-8 overflow-x-auto no-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3 px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "profile"
                ? "border-yellow-400 text-white"
                : "border-transparent text-zinc-500 hover:text-white"
            }`}
          >
            Account Settings
          </button>
          {/* Content Preferences — only visible for adult (18+) users */}
          {(user?.showContentPreferences || user?.isAdult) && (
            <button
              onClick={() => setActiveTab("preferences")}
              className={`py-3 px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "preferences"
                  ? "border-yellow-400 text-white"
                  : "border-transparent text-zinc-500 hover:text-white"
              }`}
            >
              Content Preferences
            </button>
          )}
          <button
            onClick={() => setActiveTab("watchlist")}
            className={`py-3 px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "watchlist"
                ? "border-yellow-400 text-white"
                : "border-transparent text-zinc-500 hover:text-white"
            }`}
          >
            Watchlist ({getWatchlistCount()})
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`py-3 px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "favorites"
                ? "border-yellow-400 text-white"
                : "border-transparent text-zinc-500 hover:text-white"
            }`}
          >
            Favorites ({user?.favorites?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("continue-watching")}
            className={`py-3 px-5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "continue-watching"
                ? "border-yellow-400 text-white"
                : "border-transparent text-zinc-500 hover:text-white"
            }`}
          >
            Continue Watching ({getContinueWatchingCount()})
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "profile" && (
            <div className="max-w-2xl bg-zinc-950/40 p-6 sm:p-8 rounded-2xl border border-white/5 backdrop-blur-md">
              <h2 className="text-xl font-bold mb-6">Profile Settings</h2>
              
              {successMsg && (
                <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Name */}
                <div>
                  <label htmlFor="name-input" className="block text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/5 focus:border-blue-500 text-white text-sm outline-none transition"
                    required
                  />
                </div>

                {/* Email (Read Only) */}
                <div>
                  <label className="block text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900/20 border border-white/5 text-zinc-500 text-sm outline-none cursor-not-allowed"
                    readOnly
                  />
                </div>

                {/* Avatar Presets Selection */}
                <div>
                  <label className="block text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">
                    Choose Profile Avatar
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {AVATAR_PRESETS.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setAvatar(preset)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition hover:scale-105 active:scale-95 cursor-pointer ${
                          avatar === preset ? "border-yellow-400 bg-zinc-800" : "border-transparent bg-zinc-900"
                        }`}
                      >
                        <img src={preset} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Preference */}
                <div>
                  <label htmlFor="lang-select" className="block text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">
                    Preferred Language
                  </label>
                  <select
                    id="lang-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/5 text-white text-sm outline-none transition cursor-pointer"
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                    <option value="hi">Hindi</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="gradient-btn px-6 py-3 rounded-xl text-white font-semibold text-sm cursor-pointer shadow-lg transition active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? "Saving Changes..." : "Save Changes"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "preferences" && (user?.showContentPreferences || user?.isAdult) && (
            <div className="max-w-2xl bg-zinc-950/40 p-6 sm:p-8 rounded-2xl border border-white/5 backdrop-blur-md space-y-6 animate-fade-in font-[Inter]">
              <div>
                <h2 className="text-xl font-bold mb-1">Content Preferences</h2>
                <p className="text-xs text-zinc-400">Manage mature filtering, age restrictions, and Date of Birth details.</p>
              </div>

              {successMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Age restriction status badge */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white font-[Inter]">Age Restriction Status</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">Calculated based on your Date of Birth.</p>
                </div>
                {user?.isAdult ? (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                    </svg>
                    Adult (18+)
                  </span>
                ) : (
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                    </svg>
                    Restricted (Under 18)
                  </span>
                )}
              </div>

              {/* Toggles Form */}
              <form onSubmit={handleSavePreferences} className="space-y-4">
                {/* Safe Mode */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-white/5">
                  <div>
                    <h4 className="text-sm font-semibold text-white font-[Inter]">Safe Mode</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Hide sexually suggestive content, violence, and gore.</p>
                    {!user?.isAdult && (
                      <p className="text-xxs text-amber-500 mt-1 font-semibold">
                        * Forced to enabled for underage accounts.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!user?.isAdult}
                    onClick={() => setSafeMode(!safeMode)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                      safeMode ? "bg-blue-500" : "bg-zinc-800"
                    } ${!user?.isAdult ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        safeMode ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Hide Mature Content */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-white/5">
                  <div>
                    <h4 className="text-sm font-semibold text-white font-[Inter]">Hide Mature Content (18+)</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Filter out all 18+ titles (movies, shows, and anime).</p>
                    {!user?.isAdult && (
                      <p className="text-xxs text-amber-500 mt-1 font-semibold">
                        * Forced to enabled for underage accounts.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!user?.isAdult}
                    onClick={() => setHideMature(!hideMature)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                      hideMature ? "bg-blue-500" : "bg-zinc-800"
                    } ${!user?.isAdult ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        hideMature ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !user?.isAdult}
                    className="gradient-btn px-5 py-2.5 rounded-xl text-white font-semibold text-xs cursor-pointer shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>

              {/* Date of Birth Section */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white font-[Inter]">Date of Birth</h4>
                    <p className="text-xs text-zinc-500 mt-0.5 font-[Inter]">
                      Current DOB: <span className="text-white font-medium">{user?.dob || "Not set"}</span> (Age: {user?.age || 0})
                    </p>
                  </div>
                  {!isEditingDob && (
                    <button
                      type="button"
                      onClick={() => setIsEditingDob(true)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 border border-white/10 hover:border-white/20 rounded-xl cursor-pointer hover:bg-zinc-850 transition duration-200"
                    >
                      Change DOB
                    </button>
                  )}
                </div>

                {isEditingDob && (
                  <form onSubmit={handleUpdateDob} className="pt-4 border-t border-white/5 space-y-4 animate-fade-in">
                    <div className="relative">
                      <label htmlFor="edit-dob" className="block text-xxs text-zinc-400 mb-1 uppercase tracking-wider pl-1 font-semibold">
                        New Date of Birth
                      </label>
                      <input
                        type="date"
                        id="edit-dob"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/5 focus:border-blue-500 text-white text-sm outline-none transition cursor-pointer [color-scheme:dark]"
                        required
                      />
                    </div>

                    {!user?.googleId && (
                      <div className="relative">
                        <label htmlFor="confirm-pass" className="block text-xxs text-zinc-400 mb-1 uppercase tracking-wider pl-1 font-semibold">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          id="confirm-pass"
                          placeholder="Enter password to verify changes"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/5 focus:border-blue-500 text-white text-sm outline-none transition"
                          required
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="gradient-btn px-5 py-2.5 rounded-xl text-white font-semibold text-xs cursor-pointer shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                      >
                        {loading ? "Saving..." : "Verify & Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingDob(false);
                          setDob(user?.dob || "");
                          setConfirmPassword("");
                        }}
                        className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white font-semibold text-xs cursor-pointer transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {activeTab === "favorites" && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold mb-6">Your Favorites</h2>
              {renderMediaGrid(user?.favorites, "movie")}
            </div>
          )}

          {activeTab === "watchlist" && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold mb-6">Your Watchlist</h2>
              {renderMediaGrid(getMergedWatchlist(), "movie")}
            </div>
          )}

          {activeTab === "continue-watching" && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold mb-6">Continue Watching</h2>
              {renderContinueWatchingGrid(getMergedContinueWatching())}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
