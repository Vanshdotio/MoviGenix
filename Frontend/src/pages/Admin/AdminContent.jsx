import React, { useEffect, useState } from "react";
import { getContentInsightsApi } from "../../services/api";
import Loader from "../../components/Loader";
import "./Admin.scss";

const AdminContent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("movie"); // movie, tv, anime, cartoon, overall

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

  useEffect(() => {
    fetchContentInsights();
  }, []);

  if (loading) return <Loader />;
  if (error) {
    return <div className="text-center py-20 text-pink-500 font-semibold">{error}</div>;
  }

  const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";

  // Tab contents
  const tabs = [
    { id: "movie", label: "Top Movies", data: data?.topMovies || [] },
    { id: "tv", label: "Top TV Shows", data: data?.topTV || [] },
    { id: "anime", label: "Top Anime", data: data?.topAnime || [] },
    { id: "cartoon", label: "Top Cartoons", data: data?.topCartoon || [] },
    { id: "overall", label: "Overall Top 10", data: data?.overallInsights || [] }
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="flex border-b border-white/5 bg-slate-950/20 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-center text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-blue-600/20 border border-blue-500/30 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Table / List */}
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
    </div>
  );
};

export default AdminContent;
