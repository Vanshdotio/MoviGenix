import React, { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Admin.scss";

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [timeFilter, setTimeFilter] = useState("month"); // today, week, month, year

  const menuItems = [
    { name: "Overview", path: "/admin", icon: "ri-dashboard-line" },
    { name: "User Analytics", path: "/admin/users", icon: "ri-group-line" },
    { name: "Growth Trends", path: "/admin/analytics", icon: "ri-bar-chart-line" },
    { name: "Content Performance", path: "/admin/content", icon: "ri-film-line" },
    { name: "Player & Search", path: "/admin/watch", icon: "ri-play-circle-line" },
    { name: "Ads Management", path: "/admin/ads", icon: "ri-advertisement-line" },
    { name: "Settings & Tools", path: "/admin/settings", icon: "ri-settings-4-line" },
  ];

  // CSV Export helper
  const exportToCSV = (data, filename = "export.csv") => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export helper
  const exportToJSON = (data, filename = "export.json") => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-container flex min-h-screen">
      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r border-white/5 bg-zinc-950/95 p-6 flex flex-col justify-between hidden md:flex backdrop-blur-xl fixed top-0 left-0 h-screen z-30">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img
              src="/assets/Pi7_Tool_movie recommendation logo.png"
              alt="Logo"
              className="h-10 cursor-pointer select-none"
              onClick={() => navigate("/")}
            />
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-semibold border border-blue-500/30">
              Admin
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active text-white bg-blue-600/10" : ""}`
                }
              >
                <i className={`${item.icon} text-lg`}></i>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer actions inside Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-blue-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">
                {user?.name ? user.name[0].toUpperCase() : "A"}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name || "Administrator"}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email || "admin@movigenix.com"}</p>
            </div>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5 transition-all text-sm"
          >
            <i className="ri-arrow-left-line"></i>
            <span>Main Site</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen md:ml-64">
        {/* Top Header navbar */}
        <header className="h-20 border-b border-white/5 bg-black/80 px-6 md:px-10 flex items-center justify-between backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">
              {menuItems.find((item) => item.path === location.pathname)?.name || "Dashboard"}
            </h1>
          </div>

          {/* Filters & Export Options */}
          <div className="flex items-center gap-3">
            {/* Timeframe Filter Dropdown */}
            <div className="relative">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 outline-none cursor-pointer focus:border-blue-500/50"
              >
                <option value="today">Today</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
          </div>
        </header>

        {/* Content Box */}
        <div className="flex-1 p-6 md:p-10">
          <Outlet context={{ timeFilter, setTimeFilter, exportToCSV, exportToJSON }} />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
