import React, { useEffect, useState } from "react";
import { getPlayerWatchApi } from "../../services/api";
import Loader from "../../components/Loader";
import "./Admin.scss";

const AdminWatch = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWatchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getPlayerWatchApi();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError("Failed to load player and search logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchAnalytics();
  }, []);

  if (loading) return <Loader />;
  if (error) {
    return <div className="text-center py-20 text-pink-500 font-semibold">{error}</div>;
  }

  const player = data?.player || {};
  const searches = data?.searches || {};
  const devices = data?.devices || { Desktop: 0, Mobile: 0, Tablet: 0 };
  const os = data?.os || {};
  const continueWatching = data?.continueWatching || {};

  // Device calculations
  const totalDevices = Object.values(devices).reduce((a, b) => a + b, 0) || 1;
  const desktopPercent = Math.round((devices.Desktop / totalDevices) * 100);
  const mobilePercent = Math.round((devices.Mobile / totalDevices) * 100);
  const tabletPercent = 100 - desktopPercent - mobilePercent;

  // OS Calculations - Top list
  const osList = Object.entries(os).map(([name, count]) => ({
    name,
    count,
    percent: Math.round((count / totalDevices) * 100)
  })).sort((a,b) => b.count - a.count);

  return (
    <div className="space-y-8">
      {/* Player Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 flex flex-col justify-between h-32">
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Avg Video Playback</p>
            <h2 className="text-3xl font-extrabold text-white mt-2">{player.avgWatchTimeMinutes} Mins</h2>
          </div>
          <span className="text-[10px] text-gray-500 font-semibold">Average session watch time</span>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between h-32">
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Player Play/Pause Ratio</p>
            <h2 className="text-3xl font-extrabold text-white mt-2">{player.playCount} : {player.pauseCount}</h2>
          </div>
          <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-1">
            <i className="ri-play-line"></i> Play interactions vs Pauses
          </span>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between h-32 bg-amber-500/5 border-amber-500/10">
          <div>
            <p className="text-xs font-semibold tracking-wider text-amber-400 uppercase">Buffer Occurrences</p>
            <h2 className="text-3xl font-extrabold text-white mt-2 text-glow-pink">{player.bufferCount} times</h2>
          </div>
          <span className="text-[10px] text-amber-400/80 font-semibold">User player buffering events</span>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between h-32">
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Resolution Quality Changes</p>
            <h2 className="text-3xl font-extrabold text-white mt-2">{player.qualityCount} toggles</h2>
          </div>
          <span className="text-[10px] text-gray-500 font-semibold">Adaptive bit-rate triggers</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel 1: Search Analytics */}
        <div className="glass-panel p-6 lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="ri-search-eye-line text-blue-500"></i>
              Search Keywords & History
            </h3>
            <span className="text-xs bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-3 py-1 rounded-full font-bold">
              {searches.successPercent}% Success Rate
            </span>
          </div>

          {/* Top Searched Queries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-3">Top Searched Queries</h4>
              <div className="space-y-2">
                {searches.top?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-white/5 border border-white/5 rounded-xl">
                    <span className="text-sm font-semibold text-gray-200">
                      <b className="text-blue-400 mr-2">#{idx + 1}</b> {item.query}
                    </span>
                    <span className="text-xs text-gray-400 font-mono bg-slate-900 border border-white/5 px-2 py-0.5 rounded">
                      {item.count} searches
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-3">Recent Search Queries</h4>
              <div className="space-y-2">
                {searches.recent?.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-white/5 border border-white/5 rounded-xl">
                    <span className="text-sm text-gray-300 truncate max-w-xs">{item.query}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      item.success
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-pink-500/10 text-pink-400 border-pink-500/20"
                    }`}>
                      {item.success ? "FOUND" : "404"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Hardware Device & OS Breakdown */}
        <div className="glass-panel p-6 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="ri-macbook-line text-pink-500"></i>
            Hardware Device & OS Split
          </h3>

          {/* Device Type split bars */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Device Platform Type</h4>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-300 font-medium mb-1">
                  <span>Desktop</span>
                  <span>{desktopPercent}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${desktopPercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-300 font-medium mb-1">
                  <span>Mobile</span>
                  <span>{mobilePercent}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: `${mobilePercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-300 font-medium mb-1">
                  <span>Tablet</span>
                  <span>{tabletPercent}%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${tabletPercent}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-white/5" />

          {/* OS Breakdown list */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Operating System Split</h4>
            <div className="space-y-2">
              {osList.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                    <i className="ri-settings-line text-gray-500"></i> {item.name}
                  </span>
                  <span className="text-gray-400 font-mono">{item.count} users ({item.percent}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Continue Watching Resumes */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <i className="ri-history-line text-purple-500"></i>
          Continue Watching Analytics
        </h3>
        <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
          Currently, there are <b className="text-purple-400">{continueWatching.resumedUsers}</b> unique users who have active, unfinished titles stored in their continue-watching queue. On average, users resume watching within <b className="text-white">{continueWatching.avgResumeTimeMinutes} minutes</b> of dropping a title.
        </p>
      </div>

    </div>
  );
};

export default AdminWatch;
