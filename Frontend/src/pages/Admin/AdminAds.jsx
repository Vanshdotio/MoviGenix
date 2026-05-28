import React, { useState, useEffect, useRef } from "react";
import { getAdsListApi, createAdApi, updateAdApi, deleteAdApi, getAdStatsApi } from "../../services/api";
import Loader from "../../components/Loader";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const AdminAds = () => {
  const [ads, setAds] = useState([]);
  const [stats, setStats] = useState({
    totalAds: 0,
    activeAds: 0,
    scheduledAds: 0,
    totalViews: 0,
    totalClicks: 0,
    totalCompletions: 0,
    totalSkips: 0,
    completionRate: 0,
    skipRate: 0,
    ctr: 0,
    averageWatch: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form / Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [placement, setPlacement] = useState("pre-roll");
  const [midRollTime, setMidRollTime] = useState(600); // 10 min default
  const [midRollMinutes, setMidRollMinutes] = useState(10); // helper state
  const [skipAfter, setSkipAfter] = useState(5);
  const [smartSkip, setSmartSkip] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState(0);

  // Upload/URL Choice States
  const [videoSource, setVideoSource] = useState("url"); // 'url' or 'upload'
  const [thumbnailSource, setThumbnailSource] = useState("url"); // 'url' or 'upload'
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const videoFileInputRef = useRef(null);
  const thumbnailFileInputRef = useRef(null);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [adsRes, statsRes] = await Promise.all([getAdsListApi(), getAdStatsApi()]);
      if (adsRes.success) setAds(adsRes.ads);
      if (statsRes.success) setStats(statsRes.stats);
    } catch (err) {
      console.error("Failed to load advertisements:", err);
      setError("Failed to fetch ads list and statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Show status message temporarily
  const triggerNotification = (msg, isSuccess = true) => {
    if (isSuccess) {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    }
  };

  // Helper: format relative and absolute media urls
  const getMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}${url}`;
  };

  // Handle mid roll time sync
  useEffect(() => {
    if (placement === "mid-roll") {
      setMidRollTime(midRollMinutes * 60);
    }
  }, [midRollMinutes, placement]);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingAd(null);
    setTitle("");
    setDescription("");
    setPlacement("pre-roll");
    setMidRollMinutes(10);
    setMidRollTime(600);
    setSkipAfter(5);
    setSmartSkip(true);
    setIsActive(true);
    setPriority(0);
    setVideoSource("url");
    setThumbnailSource("url");
    setVideoUrl("");
    setThumbnailUrl("");
    setVideoFile(null);
    setThumbnailFile(null);

    // Default dates (today and 30 days later)
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 30);
    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(future.toISOString().split("T")[0]);

    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (ad) => {
    setEditingAd(ad);
    setTitle(ad.title || "");
    setDescription(ad.description || "");
    setPlacement(ad.placement || "pre-roll");
    const minutesVal = Math.round((ad.midRollTime || 600) / 60);
    setMidRollMinutes(minutesVal);
    setMidRollTime(ad.midRollTime || 600);
    setSkipAfter(ad.skipAfter !== undefined ? ad.skipAfter : 5);
    setSmartSkip(ad.smartSkip !== undefined ? ad.smartSkip : true);
    setIsActive(ad.isActive);
    setPriority(ad.priority || 0);

    // Date formatting
    if (ad.startDate) {
      setStartDate(new Date(ad.startDate).toISOString().split("T")[0]);
    } else {
      setStartDate("");
    }
    if (ad.endDate) {
      setEndDate(new Date(ad.endDate).toISOString().split("T")[0]);
    } else {
      setEndDate("");
    }

    // Set source fields
    if (ad.videoUrl && ad.videoUrl.startsWith("/uploads/")) {
      setVideoSource("upload");
      setVideoFile(null);
      setVideoUrl("");
    } else {
      setVideoSource("url");
      setVideoUrl(ad.videoUrl || "");
      setVideoFile(null);
    }

    if (ad.thumbnail && ad.thumbnail.startsWith("/uploads/")) {
      setThumbnailSource("upload");
      setThumbnailFile(null);
      setThumbnailUrl("");
    } else {
      setThumbnailSource("url");
      setThumbnailUrl(ad.thumbnail || "");
      setThumbnailFile(null);
    }

    setIsModalOpen(true);
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) {
      const card = document.getElementById("ad-modal-card");
      if (card) card.scrollTop = 0;
      return triggerNotification("Ad Title is required.", false);
    }
    if (!startDate) {
      return triggerNotification("Start Date is required.", false);
    }
    if (!endDate) {
      return triggerNotification("End Date is required.", false);
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("placement", placement);
    formData.append("midRollTime", midRollTime);
    formData.append("skipAfter", skipAfter);
    formData.append("smartSkip", smartSkip);
    formData.append("isActive", isActive);
    formData.append("startDate", startDate);
    formData.append("endDate", endDate);
    formData.append("priority", priority);

    // Append video source
    if (videoSource === "upload") {
      if (videoFile) {
        formData.append("video", videoFile);
      } else if (!editingAd) {
        return triggerNotification("Please upload a video file.", false);
      }
    } else {
      if (!videoUrl && !editingAd) {
        return triggerNotification("Please enter a video URL.", false);
      }
      formData.append("videoUrl", videoUrl);
    }

    // Append thumbnail source
    if (thumbnailSource === "upload") {
      if (thumbnailFile) {
        formData.append("thumbnail", thumbnailFile);
      }
    } else {
      formData.append("thumbnail", thumbnailUrl);
    }

    try {
      setLoading(true);
      let response;
      if (editingAd) {
        response = await updateAdApi(editingAd._id, formData);
        if (response.success) {
          triggerNotification("Ad updated successfully!");
        }
      } else {
        response = await createAdApi(formData);
        if (response.success) {
          triggerNotification("New ad created successfully!");
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Save Ad Error:", err);
      triggerNotification(
        err.response?.data?.error || "Failed to save advertisement. Please try again.",
        false
      );
      setLoading(false);
    }
  };

  // Toggle active directly from list
  const handleToggleActive = async (ad) => {
    try {
      const formData = new FormData();
      formData.append("isActive", !ad.isActive);
      const res = await updateAdApi(ad._id, formData);
      if (res.success) {
        setAds((prev) =>
          prev.map((item) => (item._id === ad._id ? { ...item, isActive: !item.isActive } : item))
        );
        setStats((prev) => ({
          ...prev,
          activeAds: ad.isActive ? prev.activeAds - 1 : prev.activeAds + 1,
        }));
        triggerNotification(`Ad ${!ad.isActive ? "enabled" : "disabled"} successfully!`);
      }
    } catch (err) {
      console.error("Toggle Active Error:", err);
      triggerNotification("Failed to toggle ad status.", false);
    }
  };

  // Delete Ad Handler
  const handleDeleteAd = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ad permanently?")) return;
    try {
      setLoading(true);
      const res = await deleteAdApi(id);
      if (res.success) {
        triggerNotification("Advertisement deleted successfully!");
        fetchData();
      }
    } catch (err) {
      console.error("Delete Ad Error:", err);
      triggerNotification("Failed to delete ad.", false);
      setLoading(false);
    }
  };

  // Get human readable placement name
  const getPlacementLabel = (p) => {
    switch (p) {
      case "pre-roll":
        return "Pre-roll (Before Movie)";
      case "mid-roll":
        return "Mid-roll (During Movie)";
      case "post-roll":
        return "Post-roll (After Movie)";
      default:
        return p;
    }
  };

  // Check if date range is currently active
  const getAdStatusLabel = (ad) => {
    if (!ad.isActive) return { text: "Disabled", color: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20" };
    const now = new Date();
    const start = new Date(ad.startDate);
    const end = new Date(ad.endDate);
    if (now < start) {
      return { text: "Scheduled", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    } else if (now > end) {
      return { text: "Ended", color: "text-pink-500 bg-pink-500/10 border-pink-500/20" };
    }
    return { text: "Active", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  };

  return (
    <div className="space-y-8 font-[Inter]">
      {/* Top Banner Alert / Success */}
      {successMsg && (
        <div className="fixed top-24 right-8 bg-zinc-900 border-l-4 border-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl z-[9999] flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <i className="ri-checkbox-circle-fill text-emerald-400 text-xl"></i>
          <div>
            <p className="text-sm font-semibold">{successMsg}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-24 right-8 bg-zinc-900 border-l-4 border-pink-500 text-white px-6 py-4 rounded-xl shadow-2xl z-[9999] flex items-center gap-3 animate-fade-in backdrop-blur-md">
          <i className="ri-error-warning-fill text-pink-400 text-xl"></i>
          <div>
            <p className="text-sm font-semibold">{error}</p>
          </div>
        </div>
      )}

      {/* 1. Analytics Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-blue-500/5 blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-xs text-zinc-400 font-semibold tracking-wider uppercase">Campaigns</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <i className="ri-advertisement-line"></i>
            </div>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white">{stats.activeAds} active</h2>
            <p className="text-[10px] text-zinc-500 mt-1">
              {stats.totalAds} total • {stats.scheduledAds} scheduled
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-xs text-zinc-400 font-semibold tracking-wider uppercase">Views & CTR</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <i className="ri-eye-line"></i>
            </div>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white">{stats.totalViews.toLocaleString()}</h2>
            <p className="text-[10px] text-zinc-500 mt-1">
              {stats.totalClicks} clicks ({stats.ctr}% CTR)
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-yellow-500/5 blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-xs text-zinc-400 font-semibold tracking-wider uppercase">Ad Completion</span>
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
              <i className="ri-checkbox-circle-line"></i>
            </div>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white">{stats.completionRate}%</h2>
            <p className="text-[10px] text-zinc-500 mt-1">
              {stats.totalCompletions} completions • {stats.totalSkips} skips
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-pink-500/5 blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-xs text-zinc-400 font-semibold tracking-wider uppercase">Avg Watch Time</span>
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <i className="ri-time-line"></i>
            </div>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white">{stats.averageWatch}s</h2>
            <p className="text-[10px] text-zinc-500 mt-1">
              Skip Rate: {stats.skipRate}%
            </p>
          </div>
        </div>
      </div>

      {/* 2. Headline and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Video Advertisements</h2>
          <p className="text-xs text-zinc-400">Upload and configure pre-roll, mid-roll, and post-roll video campaigns.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition duration-200 cursor-pointer shadow-lg shadow-blue-600/25 border border-blue-500/30"
        >
          <i className="ri-add-line text-sm"></i>
          <span>Create Advertisement</span>
        </button>
      </div>

      {/* 3. Ads Table Listing */}
      <div className="glass-panel overflow-hidden">
        {loading && ads.length === 0 ? (
          <div className="py-20 flex justify-center"><Loader /></div>
        ) : ads.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500">
              <i className="ri-advertisement-fill text-2xl"></i>
            </div>
            <div>
              <p className="font-semibold text-white">No advertisements found</p>
              <p className="text-xs text-zinc-400 mt-1">Create your first ad campaign to see it listed here.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table text-left w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-6 py-4">Ad Details</th>
                  <th className="px-6 py-4">Placement</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Views</th>
                  <th className="px-6 py-4 text-center">CTR</th>
                  <th className="px-6 py-4 text-center">Completion</th>
                  <th className="px-6 py-4">Campaign Period</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ads.map((ad) => {
                  const status = getAdStatusLabel(ad);
                  const adCompletionPercent = ad.views > 0 ? Math.round((ad.completions / ad.views) * 100) : 0;
                  const adCtr = ad.views > 0 ? Number(((ad.clicks / ad.views) * 100).toFixed(1)) : 0;

                  return (
                    <tr key={ad._id} className="hover:bg-white/[0.01] transition duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {ad.thumbnail ? (
                            <img
                              src={getMediaUrl(ad.thumbnail)}
                              alt="Thumbnail"
                              className="w-16 h-10 object-cover rounded-lg border border-white/10 bg-zinc-900"
                              onError={(e) => { e.target.src = "/assets/placeholder.jpg"; }}
                            />
                          ) : (
                            <div className="w-16 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-600">
                              <i className="ri-image-line"></i>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white text-sm max-w-[200px] truncate">{ad.title}</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                              <span className="font-mono text-zinc-500">Priority: {ad.priority}</span>
                              <span>•</span>
                              <span>
                                {ad.smartSkip 
                                  ? "Smart Skip" 
                                  : ad.skipAfter === 0 
                                    ? "No Skip" 
                                    : `Skip: ${ad.skipAfter}s`}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-200 font-semibold">{getPlacementLabel(ad.placement)}</span>
                          {ad.placement === "mid-roll" && (
                            <span className="text-[10px] text-yellow-400/90 font-mono mt-0.5">
                              Trigger: {Math.round(ad.midRollTime / 60)} min ({ad.midRollTime}s)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-zinc-300">
                        {ad.views.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold text-zinc-300">{adCtr}%</span>
                          <span className="text-[9px] text-zinc-500 mt-0.5 font-mono">{ad.clicks} clicks</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-semibold text-zinc-300">{adCompletionPercent}%</span>
                          <span className="text-[9px] text-zinc-500 mt-0.5 font-mono">
                            {ad.completions} of {ad.views}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400 font-medium">
                        <div className="flex flex-col gap-0.5">
                          <span>S: {new Date(ad.startDate).toLocaleDateString()}</span>
                          <span>E: {new Date(ad.endDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Active state Toggle */}
                          <button
                            onClick={() => handleToggleActive(ad)}
                            className={`p-2 rounded-lg text-xs font-bold border transition ${
                              ad.isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700"
                            }`}
                            title={ad.isActive ? "Disable Campaign" : "Enable Campaign"}
                          >
                            <i className={ad.isActive ? "ri-play-line" : "ri-pause-line"}></i>
                          </button>

                          {/* Edit Ad */}
                          <button
                            onClick={() => handleOpenEditModal(ad)}
                            className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition cursor-pointer"
                            title="Edit Ad"
                          >
                            <i className="ri-edit-line"></i>
                          </button>

                          {/* Delete Ad */}
                          <button
                            onClick={() => handleDeleteAd(ad._id)}
                            className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20 transition cursor-pointer"
                            title="Delete Ad"
                          >
                            <i className="ri-delete-bin-6-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Edit/Create Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4" data-lenis-prevent>
          <div id="ad-modal-card" className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col" data-lenis-prevent>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
              <h3 className="text-base font-bold text-white">
                {editingAd ? `Edit Advertisement: ${editingAd.title}` : "Create New Advertisement"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white transition cursor-pointer flex items-center justify-center p-1.5 hover:bg-white/5 rounded-full"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Ad Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter descriptive title (e.g. Summer Mega Sale 2026)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Description / Catchphrase
                  </label>
                  <textarea
                    placeholder="Briefly describe what this ad is about..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50 resize-none"
                  />
                </div>

                {/* Placement and Priority Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      Ad Placement
                    </label>
                    <select
                      value={placement}
                      onChange={(e) => setPlacement(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none cursor-pointer focus:border-blue-500/50"
                    >
                      <option value="pre-roll">Pre-roll (Before Start)</option>
                      <option value="mid-roll">Mid-roll (During Movie)</option>
                      <option value="post-roll">Post-roll (At End)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      Priority Rank
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10 (higher runs first)"
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>

                {/* Smart Skip Config */}
                <div className="p-4 bg-zinc-900/30 border border-white/5 rounded-xl space-y-3">
                  <span className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">Skip Settings</span>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-300 select-none">
                      <input
                        type="checkbox"
                        checked={smartSkip}
                        onChange={(e) => setSmartSkip(e.target.checked)}
                        className="w-4 h-4 accent-blue-600 rounded bg-slate-900 border-white/10"
                      />
                      <span>Auto: Enable Smart Skip (≤15s → No Skip, &gt;15s → Skip after 5s)</span>
                    </label>

                    {!smartSkip && (
                      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                        <span className="text-xs text-zinc-400">Optional Override (Custom Skip Time):</span>
                        <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-1 text-xs">
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 5"
                            value={skipAfter}
                            onChange={(e) => setSkipAfter(Number(e.target.value))}
                            className="bg-transparent text-gray-200 font-mono w-16 outline-none text-center"
                          />
                          <span className="text-[10px] text-zinc-500">sec</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mid-roll settings (Only show if Mid-roll is selected) */}
                {placement === "mid-roll" && (
                  <div className="p-4 bg-yellow-400/5 border border-yellow-400/10 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Mid-roll Timing Settings</h4>
                      <p className="text-[10px] text-zinc-400 mt-1">Specify when the mid-roll ad will insert into the playback stream.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={midRollMinutes}
                        onChange={(e) => setMidRollMinutes(Number(e.target.value))}
                        className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs text-gray-200 cursor-pointer outline-none focus:border-blue-500/50"
                      >
                        <option value={10}>10 min</option>
                        <option value={20}>20 min</option>
                        <option value={40}>40 min</option>
                        <option value={0}>Custom</option>
                      </select>
                      {midRollMinutes === 0 && (
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 rounded-xl px-3 py-1 text-xs">
                          <input
                            type="number"
                            min="1"
                            placeholder="seconds"
                            value={midRollTime}
                            onChange={(e) => setMidRollTime(Number(e.target.value))}
                            className="bg-transparent text-gray-200 font-mono w-16 outline-none text-right"
                          />
                          <span className="text-[10px] text-zinc-500">sec</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ad Video Source Selection */}
                <div className="border border-white/5 bg-zinc-900/30 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Ad Video File *</span>
                    <div className="flex bg-slate-900 border border-white/10 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setVideoSource("url")}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                          videoSource === "url"
                            ? "bg-zinc-800 text-yellow-400"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        URL Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setVideoSource("upload")}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                          videoSource === "upload"
                            ? "bg-zinc-800 text-yellow-400"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Upload Local
                      </button>
                    </div>
                  </div>

                  {videoSource === "url" ? (
                    <input
                      type="url"
                      placeholder="Paste direct MP4/WebM URL (e.g., https://example.com/ad.mp4)"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => videoFileInputRef.current.click()}
                          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition duration-150 cursor-pointer border border-white/10"
                        >
                          Choose Video File
                        </button>
                        <span className="text-xs text-zinc-400 truncate">
                          {videoFile ? videoFile.name : editingAd?.videoUrl ? "ad_video.mp4 (already uploaded)" : "No file chosen"}
                        </span>
                      </div>
                      <input
                        ref={videoFileInputRef}
                        type="file"
                        accept="video/mp4,video/webm"
                        onChange={(e) => setVideoFile(e.target.files[0])}
                        className="hidden"
                      />
                      <p className="text-[10px] text-zinc-500 leading-normal">
                        Max recommended file size: 15MB. Acceptable types: .mp4, .webm
                      </p>
                    </div>
                  )}
                </div>

                {/* Ad Thumbnail Source Selection */}
                <div className="border border-white/5 bg-zinc-900/30 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Thumbnail Image</span>
                    <div className="flex bg-slate-900 border border-white/10 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setThumbnailSource("url")}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                          thumbnailSource === "url"
                            ? "bg-zinc-800 text-yellow-400"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        URL Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setThumbnailSource("upload")}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                          thumbnailSource === "upload"
                            ? "bg-zinc-800 text-yellow-400"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Upload Local
                      </button>
                    </div>
                  </div>

                  {thumbnailSource === "url" ? (
                    <input
                      type="url"
                      placeholder="Paste image thumbnail URL (e.g. https://example.com/ad_cover.png)"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => thumbnailFileInputRef.current.click()}
                          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition duration-150 cursor-pointer border border-white/10"
                        >
                          Choose Image File
                        </button>
                        <span className="text-xs text-zinc-400 truncate">
                          {thumbnailFile ? thumbnailFile.name : editingAd?.thumbnail ? "ad_thumb.jpg (already uploaded)" : "No file chosen"}
                        </span>
                      </div>
                      <input
                        ref={thumbnailFileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif"
                        onChange={(e) => setThumbnailFile(e.target.files[0])}
                        className="hidden"
                      />
                      <p className="text-[10px] text-zinc-500 leading-normal">
                        Acceptable types: .jpg, .jpeg, .png, .gif
                      </p>
                    </div>
                  )}
                </div>

                {/* Dates Period */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Enabled Toggle Switch */}
                <div className="flex items-center justify-between p-4 bg-zinc-900/40 rounded-xl border border-white/5">
                  <div>
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Active Status</span>
                    <p className="text-[10px] text-zinc-500 mt-1">If disabled, the ad will bypass playback checks immediately.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative border cursor-pointer ${
                      isActive
                        ? "bg-blue-600 border-blue-500"
                        : "bg-zinc-800 border-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all duration-300 ${
                        isActive ? "left-6.5" : "left-0.5"
                      }`}
                    ></span>
                  </button>
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setIsModalOpen(false)}
                  className={`px-5 py-2.5 bg-zinc-900 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-semibold transition ${
                    loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/25 border border-blue-500/30 flex items-center gap-2 ${
                    loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  {loading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-sm"></i>
                      {editingAd ? "Saving..." : "Uploading..."}
                    </>
                  ) : (
                    editingAd ? "Save Changes" : "Create Campaign"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAds;
