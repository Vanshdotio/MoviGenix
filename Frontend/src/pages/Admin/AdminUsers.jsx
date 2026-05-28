import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getUsersListApi, toggleUserPremiumApi } from "../../services/api";
import Loader from "../../components/Loader";
import "./Admin.scss";

const AdminUsers = () => {
  const { exportToCSV, exportToJSON } = useOutletContext();
  const [users, setUsers] = useState([]);
  
  const handleTogglePremium = async (userId) => {
    try {
      const res = await toggleUserPremiumApi(userId);
      if (res.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, isPremium: !u.isPremium } : u));
      }
    } catch (err) {
      console.error("Failed to toggle premium:", err);
    }
  };
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loginMethod, setLoginMethod] = useState("");
  const [device, setDevice] = useState("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalUsers: 0, totalPages: 1, currentPage: 1 });
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        loginMethod,
        device,
        country,
        page,
        limit: 10
      };
      const data = await getUsersListApi(params);
      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (err) {
      setError("Failed to load user records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, loginMethod, device, country, page]);

  const handleExportCSV = () => {
    // Sanitize user data for CSV export
    const exportData = users.map(u => ({
      ID: u._id,
      Name: u.name,
      Email: u.email,
      Role: u.role,
      LoginMethod: u.loginMethod,
      Country: u.country,
      Device: u.device,
      OS: u.os,
      CreatedDate: new Date(u.createdAt).toLocaleDateString(),
      LastActive: new Date(u.lastActive).toLocaleString()
    }));
    exportToCSV(exportData, "users_report.csv");
  };

  const handleExportJSON = () => {
    exportToJSON(users, "users_report.json");
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={loginMethod}
            onChange={(e) => { setLoginMethod(e.target.value); setPage(1); }}
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 cursor-pointer outline-none focus:border-blue-500/50"
          >
            <option value="">All Logins</option>
            <option value="google">Google Auth</option>
            <option value="email">Email Signups</option>
          </select>

          <select
            value={device}
            onChange={(e) => { setDevice(e.target.value); setPage(1); }}
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 cursor-pointer outline-none focus:border-blue-500/50"
          >
            <option value="">All Devices</option>
            <option value="Desktop">Desktop</option>
            <option value="Mobile">Mobile</option>
            <option value="Tablet">Tablet</option>
          </select>

          <select
            value={country}
            onChange={(e) => { setCountry(e.target.value); setPage(1); }}
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 cursor-pointer outline-none focus:border-blue-500/50"
          >
            <option value="">All Countries</option>
            <option value="India">India</option>
            <option value="United States">United States</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Canada">Canada</option>
            <option value="Germany">Germany</option>
          </select>

          {/* Export Buttons */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm transition-all"
            title="Export CSV"
          >
            <i className="ri-file-excel-line text-green-400"></i>
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm transition-all"
            title="Export JSON"
          >
            <i className="ri-file-code-line text-blue-400"></i>
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* Users List Panel */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="py-20"><Loader /></div>
        ) : error ? (
          <div className="py-20 text-center text-pink-500">{error}</div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-gray-500">No matching user records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Login Method</th>
                  <th>Last Active</th>
                  <th>Created Date</th>
                  <th>Geographic Split</th>
                  <th>Device / OS</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 font-bold text-sm">
                          {u.name ? u.name[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                            {u.name}
                            {u.isPremium && (
                              <span className="text-[8px] bg-amber-500/25 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                                Premium
                              </span>
                            )}
                            {u.role === "admin" && (
                              <span className="text-[8px] bg-blue-500/25 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                                Admin
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        u.loginMethod === "Google"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      }`}>
                        {u.loginMethod}
                      </span>
                    </td>
                    <td className="text-gray-300 font-medium">
                      {new Date(u.lastActive).toLocaleString()}
                    </td>
                    <td className="text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <i className="ri-map-pin-2-line text-gray-500"></i>
                        <span className="text-gray-300 text-sm font-semibold">{u.country}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="text-gray-300 text-xs font-semibold flex items-center gap-1">
                          <i className={
                            u.device === "Mobile" ? "ri-phone-line" :
                            u.device === "Tablet" ? "ri-tablet-line" : "ri-computer-line"
                          }></i> {u.device}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono mt-0.5">{u.os}</span>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleTogglePremium(u._id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                          u.isPremium
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                            : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {u.isPremium ? "Remove Premium" : "Make Premium"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-slate-950/20">
            <span className="text-xs text-gray-400">
              Showing page <b>{pagination.currentPage}</b> of <b>{pagination.totalPages}</b> (Total: {pagination.totalUsers} users)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
                disabled={page === pagination.totalPages}
                className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
