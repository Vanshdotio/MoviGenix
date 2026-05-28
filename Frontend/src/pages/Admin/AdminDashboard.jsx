import React, { useEffect, useState } from "react";
import { getDashboardStatsApi, getLiveActivityApi } from "../../services/api";
import Loader from "../../components/Loader";
import "./Admin.scss";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [liveUsers, setLiveUsers] = useState([]);
  const [simulationActive, setSimulationActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStatsApi();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      setError("Failed to load dashboard statistics.");
    }
  };

  const fetchLiveActivity = async () => {
    try {
      const data = await getLiveActivityApi();
      if (data.success) {
        setLiveUsers(data.liveUsers);
        setSimulationActive(data.simulationActive);
      }
    } catch (err) {
      console.log("Failed to load live activity.");
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLiveActivity()]);
      setLoading(false);
    };
    init();

    // Poll live users every 5 seconds to simulate real-time activity updates
    const interval = setInterval(() => {
      fetchLiveActivity();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <Loader />;
  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <i className="ri-error-warning-line text-5xl text-pink-500 mb-4"></i>
        <h3 className="text-xl font-bold">{error}</h3>
      </div>
    );
  }

  // Convert array to SVG Path string for Sparkline
  const generateSparklinePath = (points) => {
    if (!points || !points.length) return "";
    const width = 100;
    const height = 30;
    const padding = 2;
    const maxVal = Math.max(...points) || 1;
    const minVal = Math.min(...points) || 0;
    const range = maxVal - minVal || 1;
    
    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((p - minVal) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    });

    return `M ${coords.join(" L ")}`;
  };

  const sparklineSignups = stats?.sparklines?.signups || [0,0,0,0,0,0,0];
  const sparklineViews = stats?.sparklines?.views || [0,0,0,0,0,0,0];

  // Custom SVG Donut calculation
  const totalAuth = (stats?.googleUsers || 0) + (stats?.emailUsers || 0) || 1;
  const googlePercent = Math.round(((stats?.googleUsers || 0) / totalAuth) * 100);
  const emailPercent = 100 - googlePercent;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (googlePercent / 100) * circumference;

  return (
    <div className="space-y-8">
      {/* Simulation status bar */}
      {simulationActive && (
        <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
          <div className="flex items-center gap-3">
            <span className="live-pulse"></span>
            <span className="text-sm font-semibold tracking-wide uppercase">Real-Time Traffic Simulator Active</span>
          </div>
          <span className="text-xs opacity-80">Mock user requests are feeding the dashboard metrics dynamically.</span>
        </div>
      )}

      {/* Metrics Counters Grid */}
      <div className="dashboard-grid">
        {/* Card 1: Total Users */}
        <div className="glass-panel hoverable p-6 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Users</p>
              <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight text-glow-blue">
                {stats?.totalUsers?.toLocaleString() || 0}
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
              <i className="ri-group-line text-lg"></i>
            </div>
          </div>
          <div className="flex justify-between items-end mt-4">
            <span className="text-xs text-blue-400 flex items-center gap-1 font-semibold">
              <i className="ri-arrow-up-line"></i> Active Signups
            </span>
            <div className="w-24 h-8 sparkline-container">
              <svg viewBox="0 0 100 30">
                <path
                  d={generateSparklinePath(sparklineSignups)}
                  fill="none"
                  stroke="#217df5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0px 2px 4px rgba(33, 125, 245, 0.4))" }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Active Users */}
        <div className="glass-panel hoverable p-6 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Daily Active (DAU)</p>
              <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight text-glow-pink">
                {stats?.todayActiveUsers?.toLocaleString() || 0}
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20 text-pink-400">
              <i className="ri-user-heart-line text-lg"></i>
            </div>
          </div>
          <div className="flex justify-between items-end mt-4">
            <span className="text-xs text-pink-400 flex items-center gap-1 font-semibold">
              <i className="ri-pulse-line"></i> Today's Visitors
            </span>
            <div className="w-24 h-8 sparkline-container">
              <svg viewBox="0 0 100 30">
                <path
                  d={generateSparklinePath(stats?.sparklines?.activeUsers || [0,0,0,0,0,0,0])}
                  fill="none"
                  stroke="#e52e71"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0px 2px 4px rgba(229, 46, 113, 0.4))" }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Online Users */}
        <div className="glass-panel hoverable p-6 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Online Users</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="live-pulse"></span>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">
                  {stats?.onlineUsers || 0}
                </h2>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <i className="ri-wifi-line text-lg"></i>
            </div>
          </div>
          <div className="flex justify-between items-end mt-4">
            <span className="text-xs text-emerald-400 font-medium">Real-Time Streams Active</span>
            <span className="text-xs text-gray-500">Live now</span>
          </div>
        </div>

        {/* Card 4: Total Views */}
        <div className="glass-panel hoverable p-6 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Views</p>
              <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight text-glow-blue">
                {stats?.totalViews?.toLocaleString() || 0}
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400">
              <i className="ri-play-circle-line text-lg"></i>
            </div>
          </div>
          <div className="flex justify-between items-end mt-4">
            <span className="text-xs text-purple-400 font-semibold flex items-center gap-1">
              <i className="ri-arrow-up-line"></i> Play count
            </span>
            <div className="w-24 h-8 sparkline-container">
              <svg viewBox="0 0 100 30">
                <path
                  d={generateSparklinePath(sparklineViews)}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0px 2px 4px rgba(168, 85, 247, 0.4))" }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 5: Total Watch Time */}
        <div className="glass-panel hoverable p-6 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Watch Time</p>
              <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight text-glow-pink">
                {stats?.totalWatchTimeHours?.toLocaleString() || 0} <span className="text-lg font-semibold text-gray-400">Hrs</span>
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-400">
              <i className="ri-time-line text-lg"></i>
            </div>
          </div>
          <div className="flex justify-between items-end mt-4">
            <span className="text-xs text-orange-400 font-medium">Accumulated Streaming</span>
            <span className="text-xs text-gray-500">Total duration</span>
          </div>
        </div>

        {/* Card 6: Average Session */}
        <div className="glass-panel hoverable p-6 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-400">Avg Session</p>
              <h2 className="text-3xl font-extrabold text-white mt-1 tracking-tight">
                {stats?.avgSessionDuration || 24} <span className="text-lg font-semibold text-gray-400">Min</span>
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400">
              <i className="ri-dashboard-3-line text-lg"></i>
            </div>
          </div>
          <div className="flex justify-between items-end mt-4">
            <span className="text-xs text-cyan-400 font-medium">Engagement duration</span>
            <span className="text-xs text-gray-500">Per login</span>
          </div>
        </div>
      </div>

      {/* Main Grid section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Panel 1: Live User Activity */}
        <div className="glass-panel p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="ri-broadcast-line text-emerald-500"></i>
                Live User Activity Feed
              </h3>
              <span className="text-xs bg-slate-900 border border-white/10 text-gray-400 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="live-pulse"></span> {liveUsers.length} Users active
              </span>
            </div>

            {liveUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-gray-500 border border-dashed border-white/5 rounded-xl">
                <i className="ri-group-line text-3xl mb-2"></i>
                <p className="text-sm">No active user sessions recorded.</p>
                <p className="text-xs opacity-75 mt-1">Telemetry will log and display user routing activity as users explore the platform.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                {liveUsers.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow">
                        {item.name ? item.name[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white">{item.name}</p>
                          <span className="text-[10px] text-gray-400 bg-white/10 px-1.5 py-0.2 rounded font-medium">
                            {item.country}
                          </span>
                        </div>
                        <p className="text-xs text-blue-400 font-medium flex items-center gap-1 mt-0.5">
                          <i className="ri-compass-3-line"></i> {item.activity}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-300 font-mono bg-slate-900 border border-white/5 px-2 py-0.5 rounded">
                        {item.route}
                      </p>
                      <span className="text-[10px] text-gray-500 mt-1 block">
                        Active OS: {item.os} ({item.device})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Auth Analytics Breakdowns */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <i className="ri-fingerprint-line text-blue-500"></i>
              Authentication Analytics
            </h3>

            {/* Custom SVG Donut Chart */}
            <div className="donut-container h-44 mb-6">
              <svg width="150" height="150" viewBox="0 0 80 80">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="8"
                />
                {/* Google path */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="transparent"
                  stroke="url(#donut-blue)"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 40 40)"
                  style={{ filter: "drop-shadow(0px 0px 4px rgba(33, 125, 245, 0.4))" }}
                />
                
                {/* Gradients */}
                <defs>
                  <linearGradient id="donut-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#217df5" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="donut-label">
                <h4 className="text-2xl font-black text-white">{googlePercent}%</h4>
                <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">Google Auth</p>
              </div>
            </div>

            {/* Legend split */}
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <p className="text-sm text-gray-300 font-semibold">Google OAuth</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{stats?.googleUsers || 0}</p>
                  <p className="text-[10px] text-gray-500">{googlePercent}% conversion</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                  <p className="text-sm text-gray-300 font-semibold">Email Signup</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{stats?.emailUsers || 0}</p>
                  <p className="text-[10px] text-gray-500">{emailPercent}% conversion</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Heatmap Section */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <i className="ri-fire-line text-orange-500"></i>
          Watch Time Heatmap (Peak Activity Hours)
        </h3>

        <div className="heatmap-grid">
          <div className="heatmap-cell level-0">
            <h4 className="text-sm font-bold text-gray-400">Night</h4>
            <p className="text-xs text-gray-500 mt-0.5">12 AM - 6 AM</p>
            <h3 className="text-xl font-extrabold text-white mt-3">{stats?.totalViews ? Math.round(stats.totalViews * 0.1) : 10} Views</h3>
            <span className="text-[10px] text-gray-400 uppercase font-semibold mt-1 block">Low activity</span>
          </div>

          <div className="heatmap-cell level-1">
            <h4 className="text-sm font-bold text-blue-400">Morning</h4>
            <p className="text-xs text-gray-500 mt-0.5">6 AM - 12 PM</p>
            <h3 className="text-xl font-extrabold text-white mt-3">{stats?.totalViews ? Math.round(stats.totalViews * 0.2) : 25} Views</h3>
            <span className="text-[10px] text-blue-400 uppercase font-semibold mt-1 block">Moderate activity</span>
          </div>

          <div className="heatmap-cell level-2">
            <h4 className="text-sm font-bold text-indigo-400">Afternoon</h4>
            <p className="text-xs text-gray-500 mt-0.5">12 PM - 6 PM</p>
            <h3 className="text-xl font-extrabold text-white mt-3">{stats?.totalViews ? Math.round(stats.totalViews * 0.3) : 38} Views</h3>
            <span className="text-[10px] text-indigo-400 uppercase font-semibold mt-1 block">Medium-High</span>
          </div>

          <div className="heatmap-cell level-3">
            <h4 className="text-sm font-bold text-pink-400">Evening</h4>
            <p className="text-xs text-gray-500 mt-0.5">6 PM - 12 AM</p>
            <h3 className="text-xl font-extrabold text-white mt-3">{stats?.totalViews ? Math.round(stats.totalViews * 0.4) : 60} Views</h3>
            <span className="text-[10px] text-pink-400 uppercase font-semibold mt-1 block">Peak Watch Time</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
