import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getAnalyticsGrowthApi } from "../../services/api";
import Loader from "../../components/Loader";
import "./Admin.scss";

const AdminAnalytics = () => {
  const { timeFilter } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getAnalyticsGrowthApi({ filter: timeFilter });
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError("Failed to fetch growth trends.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeFilter]);

  if (loading) return <Loader />;
  if (error) {
    return <div className="text-center py-20 text-pink-500 font-semibold">{error}</div>;
  }

  const growth = data?.growth || [];
  const googleTrends = data?.authSplitTrends?.google || [];
  const emailTrends = data?.authSplitTrends?.email || [];

  // SVG Chart Dimensions
  const chartWidth = 600;
  const chartHeight = 200;
  const paddingX = 40;
  const paddingY = 20;

  // Render Line Chart path
  const getLineCoordinates = (points) => {
    if (!points || !points.length) return { path: "", area: "", coords: [] };
    const maxVal = Math.max(...points.map((p) => p.count)) || 1;
    const minVal = 0;
    const range = maxVal - minVal;

    const coords = points.map((p, idx) => {
      const x = paddingX + (idx / (points.length - 1)) * (chartWidth - paddingX * 2);
      const y = chartHeight - paddingY - ((p.count - minVal) / range) * (chartHeight - paddingY * 2);
      return { x, y, count: p.count, label: p.label };
    });

    const path = `M ${coords.map((c) => `${c.x},${c.y}`).join(" L ")}`;
    
    // Closed path for filled area under the line
    const area = `${path} L ${coords[coords.length - 1].x},${chartHeight - paddingY} L ${coords[0].x},${chartHeight - paddingY} Z`;

    return { path, area, coords };
  };

  const signupChart = getLineCoordinates(growth);
  const googleChart = getLineCoordinates(googleTrends);
  const emailChart = getLineCoordinates(emailTrends);

  const maxValSignups = Math.max(...growth.map((p) => p.count)) || 10;

  return (
    <div className="space-y-8">
      {/* Daily Activity KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex flex-col justify-between h-32">
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Daily Active Sessions</p>
            <h2 className="text-4xl font-extrabold text-white mt-2 text-glow-blue">{data?.conversion?.activeSessionsToday || 0}</h2>
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
            <i className="ri-shield-user-line"></i> Unique active user sessions logged today
          </span>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between h-32">
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Daily Video Plays</p>
            <h2 className="text-4xl font-extrabold text-white mt-2 text-glow-pink">{data?.conversion?.videoPlaysToday || 0}</h2>
          </div>
          <span className="text-[10px] text-pink-400 flex items-center gap-1 font-semibold">
            <i className="ri-play-circle-line"></i> Total video streams played today
          </span>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between h-32">
          <div>
            <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Daily Searches</p>
            <h2 className="text-4xl font-extrabold text-white mt-2 text-glow-blue">{data?.conversion?.searchesToday || 0}</h2>
          </div>
          <span className="text-[10px] text-gray-400 flex items-center gap-1 font-semibold">
            <i className="ri-search-2-line"></i> Search queries processed today
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1: Signup growth */}
        <div className="glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Daily Registered Signups</h3>
            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
              Max: {maxValSignups} users/day
            </span>
          </div>

          <div className="chart-container relative">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
              <defs>
                <linearGradient id="chart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#217df5" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#217df5" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#217df5" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} className="chart-grid" />
              <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} className="chart-grid" />
              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} className="chart-grid" />

              {/* Axis labels */}
              <text x={paddingX - 10} y={paddingY + 4} fill="#6b7280" fontSize="10" textAnchor="end">{maxValSignups}</text>
              <text x={paddingX - 10} y={chartHeight / 2 + 4} fill="#6b7280" fontSize="10" textAnchor="end">{Math.round(maxValSignups / 2)}</text>
              <text x={paddingX - 10} y={chartHeight - paddingY + 4} fill="#6b7280" fontSize="10" textAnchor="end">0</text>

              {/* Chart Line & Fill Area */}
              {signupChart.path && (
                <>
                  <path d={signupChart.area} className="chart-area" />
                  <path d={signupChart.path} className="chart-line svg-animate" />
                </>
              )}

              {/* Data points */}
              {signupChart.coords.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIndex === idx ? 6 : 4}
                  fill={hoveredIndex === idx ? "#e52e71" : "#217df5"}
                  stroke="#07090e"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              ))}

              {/* X Axis Labels */}
              {signupChart.coords.length > 0 && [0, Math.floor(signupChart.coords.length / 2), signupChart.coords.length - 1].map((idx) => {
                const pt = signupChart.coords[idx];
                if (!pt) return null;
                return (
                  <text key={idx} x={pt.x} y={chartHeight - 4} fill="#6b7280" fontSize="10" textAnchor="middle">
                    {pt.label}
                  </text>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoveredIndex !== null && signupChart.coords[hoveredIndex] && (
              <div
                className="absolute z-20 bg-slate-950/90 border border-white/10 rounded-xl px-3 py-1.5 shadow-xl text-xs backdrop-blur-md pointer-events-none"
                style={{
                  left: `${(signupChart.coords[hoveredIndex].x / chartWidth) * 100}%`,
                  top: `${(signupChart.coords[hoveredIndex].y / chartHeight) * 100 - 20}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <p className="text-gray-400 font-medium">{signupChart.coords[hoveredIndex].label}</p>
                <p className="text-white font-bold mt-0.5">{signupChart.coords[hoveredIndex].count} Signups</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Auth Trends Split */}
        <div className="glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">OAuth vs Email Split</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Google
              </span>
              <span className="flex items-center gap-1.5 text-pink-400">
                <span className="w-2 h-2 rounded-full bg-pink-500"></span> Email
              </span>
            </div>
          </div>

          <div className="chart-container">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
              <defs>
                <linearGradient id="google-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#217df5" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
                <linearGradient id="email-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e52e71" />
                  <stop offset="100%" stopColor="#f472b6" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} className="chart-grid" />
              <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} className="chart-grid" />
              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} className="chart-grid" />

              {/* Draw Google Trend */}
              {googleChart.path && (
                <path d={googleChart.path} fill="none" stroke="url(#google-gradient)" strokeWidth="2.5" strokeLinecap="round" />
              )}

              {/* Draw Email Trend */}
              {emailChart.path && (
                <path d={emailChart.path} fill="none" stroke="url(#email-gradient)" strokeWidth="2.5" strokeLinecap="round" />
              )}

              {/* X Axis Labels */}
              {googleChart.coords.length > 0 && [0, Math.floor(googleChart.coords.length / 2), googleChart.coords.length - 1].map((idx) => {
                const pt = googleChart.coords[idx];
                if (!pt) return null;
                return (
                  <text key={idx} x={pt.x} y={chartHeight - 4} fill="#6b7280" fontSize="10" textAnchor="middle">
                    {pt.label}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminAnalytics;
