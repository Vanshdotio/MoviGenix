import React, { useEffect, useState } from "react";
import { 
  getContentInsightsApi, 
  getContentRatingsApi, 
  updateContentRatingApi, 
  addContentRatingApi 
} from "../../services/api";
import { isUpcomingContent } from "../../utils/releaseUtils";
import Loader from "../../components/Loader";
import "./Admin.scss";

const AdminContent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("movie"); // movie, tv, anime, cartoon, overall, ratings

  // Content Ratings Database States
  const [ratings, setRatings] = useState([]);
  const [ratingsSearch, setRatingsSearch] = useState("");
  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsPagination, setRatingsPagination] = useState({ totalRatings: 0, totalPages: 1, currentPage: 1 });
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsError, setRatingsError] = useState("");

  // Add Content Rating Form State
  const [addForm, setAddForm] = useState({ id: "", type: "movie", ageRating: "Family" });
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccessMsg, setAddSuccessMsg] = useState("");

  const fetchContentInsights = async () => {
    try {
      setLoading(true);
      const res = await getContentInsightsApi();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError("Failed to fetch content performance analytics.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRatings = async () => {
    try {
      setRatingsLoading(true);
      setRatingsError("");
      const res = await getContentRatingsApi({ search: ratingsSearch, page: ratingsPage, limit: 10 });
      if (res.success) {
        setRatings(res.ratings);
        setRatingsPagination(res.pagination);
      }
    } catch (err) {
      setRatingsError("Failed to fetch content ratings database.");
    } finally {
      setRatingsLoading(false);
    }
  };

  useEffect(() => {
    fetchContentInsights();
  }, []);

  useEffect(() => {
    if (activeTab === "ratings") {
      fetchRatings();
    }
  }, [activeTab, ratingsSearch, ratingsPage]);

  const handleRatingChange = async (ratingId, newRating) => {
    try {
      const res = await updateContentRatingApi(ratingId, newRating);
      if (res.success) {
        setRatings(prev => prev.map(r => r._id === ratingId ? { 
          ...r, 
          ageRating: res.content.ageRating, 
          isExplicitAdult: res.content.isExplicitAdult, 
          isAdult: res.content.isAdult 
        } : r));
      }
    } catch (err) {
      alert("Failed to update content rating classification.");
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddSuccessMsg("");
    setRatingsError("");
    if (!addForm.id.trim()) return;
    setAddLoading(true);
    try {
      const res = await addContentRatingApi(addForm);
      if (res.success) {
        setAddSuccessMsg("Content rating classification added successfully!");
        setAddForm({ id: "", type: "movie", ageRating: "Family" });
        setRatingsPage(1);
        fetchRatings();
      }
    } catch (err) {
      setRatingsError(err.response?.data?.error || "Failed to add content rating classification.");
    } finally {
      setAddLoading(false);
    }
  };

  if (loading && activeTab !== "ratings") return <Loader />;
  if (error && activeTab !== "ratings") {
    return <div className="text-center py-20 text-pink-500 font-semibold">{error}</div>;
  }

  const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";

  // Tab contents
  const tabs = [
    { id: "movie", label: "Top Movies", data: data?.topMovies || [] },
    { id: "tv", label: "Top TV Shows", data: data?.topTV || [] },
    { id: "anime", label: "Top Anime", data: data?.topAnime || [] },
    { id: "cartoon", label: "Top Cartoons", data: data?.topCartoon || [] },
    { id: "overall", label: "Overall Top 10", data: data?.overallInsights || [] },
    { id: "ratings", label: "Manage Age Ratings", data: [] }
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex flex-wrap border-b border-white/5 bg-slate-950/20 p-1 rounded-xl gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-center text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === tab.id
                ? "bg-blue-600/20 border border-blue-500/30 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "ratings" ? (
        /* MANAGE AGE RATINGS TAB CONTENT */
        <div className="space-y-6">
          {/* Add Content rating manual Form */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider pl-1 font-[ROSSTEN] mb-4">Add Content Rating Classification</h3>
            {addSuccessMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">{addSuccessMsg}</div>
            )}
            <form onSubmit={handleAddSubmit} className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full text-left">
                <label className="block text-xxs uppercase tracking-wider text-gray-400 font-bold mb-1 pl-1">TMDB Content ID</label>
                <input 
                  type="text"
                  placeholder="e.g. 157336"
                  value={addForm.id}
                  onChange={(e) => setAddForm(prev => ({ ...prev, id: e.target.value }))}
                  required
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="w-full md:w-48 text-left">
                <label className="block text-xxs uppercase tracking-wider text-gray-400 font-bold mb-1 pl-1">Content Type</label>
                <select 
                  value={addForm.type}
                  onChange={(e) => setAddForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 cursor-pointer"
                >
                  <option value="movie">Movie</option>
                  <option value="tv">TV Show</option>
                  <option value="anime">Anime</option>
                  <option value="cartoon">Cartoon</option>
                </select>
              </div>

              <div className="w-full md:w-48 text-left">
                <label className="block text-xxs uppercase tracking-wider text-gray-400 font-bold mb-1 pl-1">Age Rating Classification</label>
                <select 
                  value={addForm.ageRating}
                  onChange={(e) => setAddForm(prev => ({ ...prev, ageRating: e.target.value }))}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 cursor-pointer"
                >
                  <option value="Family">Family</option>
                  <option value="Teen">Teen</option>
                  <option value="Mature">Mature</option>
                  <option value="Explicit Adult">Explicit Adult</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={addLoading}
                className="w-full md:w-auto px-6 py-2.5 rounded-xl gradient-btn text-white font-semibold text-sm cursor-pointer shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {addLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : "Add Classification"}
              </button>
            </form>
          </div>

          {/* Search bar & list */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider pl-1 font-[ROSSTEN]">Classified Content List</h3>
              
              {/* Search input */}
              <div className="w-full sm:max-w-xs relative">
                <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Filter by title..."
                  value={ratingsSearch}
                  onChange={(e) => { setRatingsSearch(e.target.value); setRatingsPage(1); }}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            {ratingsError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{ratingsError}</div>
            )}

            {ratingsLoading ? (
              <div className="py-12 flex justify-center"><Loader /></div>
            ) : ratings.length === 0 ? (
              <div className="py-12 text-center text-gray-500">No cached content rating classifications found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title & Details</th>
                      <th>Type</th>
                      <th>Database ID</th>
                      <th>Age Rating Classification</th>
                      <th>Release Status</th>
                      <th>Access Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratings.map((rating) => (
                      <tr key={rating._id}>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-semibold text-white text-sm">{rating.title || `Content ID ${rating.id}`}</span>
                            <span className="text-[10px] text-gray-500 font-mono mt-0.5">TMDB ID: {rating.id}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-[10px] uppercase font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                            {rating.type}
                          </span>
                        </td>
                        <td className="text-xs font-mono text-gray-500">
                          {rating._id}
                        </td>
                        <td>
                          {/* Classification Radio Buttons Selector */}
                          <div className="flex items-center gap-4">
                            {["Family", "Teen", "Mature", "Explicit Adult"].map((cOption) => (
                              <label key={cOption} className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-gray-300 font-semibold select-none">
                                <input
                                  type="radio"
                                  name={`classification-${rating._id}`}
                                  checked={rating.ageRating === cOption}
                                  onChange={() => handleRatingChange(rating._id, cOption)}
                                  className="w-3.5 h-3.5 border-white/10 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                {cOption}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td>
                          {/* Release Status — date-driven, read-only */}
                          {rating.releaseDate ? (
                            isUpcomingContent({ release_date: rating.releaseDate, first_air_date: rating.releaseDate }) ? (
                              <span className="text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold w-fit flex items-center gap-1">
                                ⏳ Upcoming
                              </span>
                            ) : (
                              <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold w-fit flex items-center gap-1">
                                ✓ Released
                              </span>
                            )
                          ) : (
                            <span className="text-[9px] text-gray-600">—</span>
                          )}
                        </td>
                        <td>
                          {rating.isExplicitAdult ? (
                            <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold flex items-center gap-1 w-fit">
                              <i className="ri-lock-line"></i> 18+ Locked
                            </span>
                          ) : (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold flex items-center gap-1 w-fit">
                              <i className="ri-lock-unlock-line"></i> Open Access
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ratings Pagination */}
            {!ratingsLoading && ratingsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-slate-950/20 rounded-b-xl">
                <span className="text-xs text-gray-400">
                  Showing page <b>{ratingsPagination.currentPage}</b> of <b>{ratingsPagination.totalPages}</b> (Total: {ratingsPagination.totalRatings} ratings)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRatingsPage(prev => Math.max(prev - 1, 1))}
                    disabled={ratingsPage === 1}
                    className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setRatingsPage(prev => Math.min(prev + 1, ratingsPagination.totalPages))}
                    disabled={ratingsPage === ratingsPagination.totalPages}
                    className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* NORMAL PERFORMANCE ANALYTICS GRID */
        <div className="glass-panel overflow-hidden">
          {currentTab.data.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No watch history records compiled for this category.</div>
          ) : activeTab === "overall" ? (
            /* Top 10 Overall Content Details Table */
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Media Poster & Title</th>
                    <th>Type</th>
                    <th>Views</th>
                    <th>Watch Time</th>
                    <th>Completion %</th>
                    <th>Rewatches</th>
                    <th>Drop Rate %</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTab.data.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="font-extrabold text-blue-400 text-lg">#{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          {item.posterPath ? (
                            <img
                              src={item.posterPath.startsWith("http") ? item.posterPath : `${TMDB_IMAGE_BASE}${item.posterPath}`}
                              alt={item.title}
                              className="w-10 h-14 object-cover rounded-md border border-white/10"
                            />
                          ) : (
                            <div className="w-10 h-14 rounded-md bg-white/5 flex items-center justify-center text-[10px] text-gray-400 border border-white/10">No poster</div>
                          )}
                          <span className="font-semibold text-white text-sm block max-w-xs truncate">{item.title}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-[10px] uppercase font-semibold text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                          {item.type}
                        </span>
                      </td>
                      <td className="font-semibold text-white">{item.views}</td>
                      <td className="text-gray-300 font-medium">{item.watchTimeHours} Hours</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-200 text-sm font-semibold">{item.completionPercent}%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${item.completionPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-400">{item.rewatchCount} rewatches</td>
                      <td>
                        <span className="text-pink-400 font-semibold">{item.dropRatePercent}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Normal Category Top 5 Items Table */
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Poster & Title</th>
                    <th>Total Views</th>
                    <th>Watch Time</th>
                    <th>Avg Completion Rate</th>
                    <th>Total Completions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTab.data.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="font-extrabold text-blue-400 text-lg">#{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          {item.posterPath ? (
                            <img
                              src={item.posterPath.startsWith("http") ? item.posterPath : `${TMDB_IMAGE_BASE}${item.posterPath}`}
                              alt={item.title}
                              className="w-10 h-14 object-cover rounded-md border border-white/10"
                            />
                          ) : (
                            <div className="w-10 h-14 rounded-md bg-white/5 flex items-center justify-center text-[10px] text-gray-400 border border-white/10">No poster</div>
                          )}
                          <span className="font-semibold text-white text-sm block max-w-xs truncate">{item.title}</span>
                        </div>
                      </td>
                      <td className="font-bold text-white">{item.views} views</td>
                      <td className="text-gray-300 font-medium">{item.watchTimeHours} Hours</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-200 text-sm font-semibold">{item.completionPercent}%</span>
                          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${item.completionPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-400">{item.completions} users finished</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminContent;
