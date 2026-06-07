import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  getUsersListApi, 
  getUserDetailsApi, 
  updateUserDetailsApi, 
  toggleUserSuspensionApi, 
  deleteUserApi 
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/Loader";
import "./Admin.scss";

const AdminUsers = () => {
  const { exportToCSV, exportToJSON } = useOutletContext();
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loginMethod, setLoginMethod] = useState("");
  const [device, setDevice] = useState("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalUsers: 0, totalPages: 1, currentPage: 1 });
  const [error, setError] = useState(null);

  // Modal States
  const [viewedUser, setViewedUser] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [editedUser, setEditedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    country: "",
    dob: "",
    role: "",
    isPremium: false
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  // Actions
  const handleViewUser = async (user) => {
    setViewedUser(user);
    setViewDetails(null);
    setViewLoading(true);
    try {
      const res = await getUserDetailsApi(user._id);
      if (res.success) {
        setViewDetails(res);
      }
    } catch (err) {
      console.error("Error fetching user details:", err);
    } finally {
      setViewLoading(false);
    }
  };

  const handleOpenEdit = (user) => {
    setEditedUser(user);
    setEditError("");
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      country: user.country || "India",
      dob: user.dob || "",
      role: user.role || "user",
      isPremium: user.isPremium || false
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditLoading(true);
    try {
      const res = await updateUserDetailsApi(editedUser._id, editForm);
      if (res.success) {
        setUsers(prev => prev.map(u => u._id === editedUser._id ? { 
          ...u, 
          name: res.user.name, 
          email: res.user.email,
          country: res.user.country,
          dob: res.user.dob,
          role: res.user.role,
          isPremium: res.user.isPremium
        } : u));
        setEditedUser(null);
      }
    } catch (err) {
      setEditError(err.response?.data?.error || "Failed to update user profile.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleSuspension = async (userId) => {
    try {
      const res = await toggleUserSuspensionApi(userId);
      if (res.success) {
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, suspended: res.suspended } : u));
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to change user status.");
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteError("");
    setDeleteLoading(true);
    try {
      const res = await deleteUserApi(deletingUser._id);
      if (res.success) {
        setUsers(prev => prev.filter(u => u._id !== deletingUser._id));
        setDeletingUser(null);
      }
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Failed to permanently delete user.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportCSV = () => {
    const exportData = users.map(u => ({
      ID: u._id,
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Status: u.suspended ? "Suspended" : "Active",
      LoginMethod: u.loginMethod,
      Country: u.country,
      DOB: u.dob || "Not Set",
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

  const isSuperAdmin = currentUser?.role === "superadmin";

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
            <option value="France">France</option>
            <option value="Australia">Australia</option>
            <option value="Japan">Japan</option>
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
                  <th>Region</th>
                  <th>DOB Status</th>
                  <th>Login Method</th>
                  <th>Created Date</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className={u.suspended ? "opacity-60" : ""}>
                    {/* User Profile */}
                    <td>
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img src={u.avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 font-bold text-sm">
                            {u.name ? u.name[0].toUpperCase() : "U"}
                          </div>
                        )}
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
                            {u.role === "superadmin" && (
                              <span className="text-[8px] bg-purple-500/25 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                                Super Admin
                              </span>
                            )}
                            {u.suspended && (
                              <span className="text-[8px] bg-red-500/25 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                                Suspended
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Region */}
                    <td>
                      <div className="flex items-center gap-1.5">
                        <i className="ri-map-pin-2-line text-gray-500"></i>
                        <span className="text-gray-300 text-sm font-semibold">{u.country}</span>
                      </div>
                    </td>
                    {/* DOB Status */}
                    <td className="text-gray-300 text-sm">
                      {u.dob ? (
                        <div className="flex flex-col">
                          <span className="font-semibold">{u.dob}</span>
                          <span className="text-[10px] text-gray-500">Age: {new Date().getFullYear() - new Date(u.dob).getFullYear()}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic text-xs">Not Set</span>
                      )}
                    </td>
                    {/* Login Method */}
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        u.loginMethod === "Google"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      }`}>
                        {u.loginMethod}
                      </span>
                    </td>
                    {/* Created Date */}
                    <td className="text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    {/* Last Active */}
                    <td className="text-gray-300 text-xs font-mono">
                      {new Date(u.lastActive).toLocaleString()}
                    </td>
                    {/* Actions */}
                    <td>
                      <div className="flex items-center gap-2">
                        {/* View Button */}
                        <button
                          onClick={() => handleViewUser(u)}
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all flex items-center justify-center cursor-pointer"
                          title="View Details"
                        >
                          <i className="ri-eye-line text-sm"></i>
                        </button>
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/20 transition-all flex items-center justify-center cursor-pointer"
                          title="Edit User"
                        >
                          <i className="ri-edit-line text-sm"></i>
                        </button>
                        {/* Suspend Button */}
                        <button
                          onClick={() => handleToggleSuspension(u._id)}
                          className={`w-8 h-8 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                            u.suspended
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                          }`}
                          title={u.suspended ? "Unsuspend User" : "Suspend User"}
                        >
                          <i className={u.suspended ? "ri-user-follow-line text-sm" : "ri-user-forbid-line text-sm"}></i>
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={() => setDeletingUser(u)}
                          disabled={!isSuperAdmin}
                          className={`w-8 h-8 rounded-lg border transition-all flex items-center justify-center ${
                            isSuperAdmin
                              ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer"
                              : "bg-white/5 border-transparent text-gray-600 cursor-not-allowed opacity-50"
                          }`}
                          title={isSuperAdmin ? "Delete User" : "Delete User (Super Admin Only)"}
                        >
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
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

      {/* VIEW MODAL */}
      {viewedUser && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 md:p-8 flex flex-col gap-6 relative">
            <button 
              onClick={() => setViewedUser(null)} 
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <i className="ri-close-line"></i>
            </button>

            <h3 className="text-lg font-bold text-white uppercase tracking-wider pl-1 font-['ROSSTEN']">User Details</h3>
            
            {viewLoading ? (
              <div className="py-12 flex justify-center"><Loader /></div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Header Profile Summary */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  {viewedUser.avatar ? (
                    <img src={viewedUser.avatar} alt="avatar" className="w-14 h-14 rounded-full border border-blue-500/20" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 font-bold text-xl">
                      {viewedUser.name ? viewedUser.name[0].toUpperCase() : "U"}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-white text-lg flex items-center gap-2">
                      {viewedUser.name}
                      {viewedUser.isPremium && <span className="text-[8px] bg-amber-500/25 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full uppercase">Premium</span>}
                    </h4>
                    <p className="text-sm text-gray-400">{viewedUser.email}</p>
                    <div className="flex gap-2 mt-1.5">
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase font-bold">{viewedUser.role}</span>
                      <span className={`text-[10px] border px-2 py-0.5 rounded-full uppercase font-bold ${viewedUser.suspended ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                        {viewedUser.suspended ? "Suspended" : "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex flex-col gap-2">
                    <h5 className="text-xs uppercase text-gray-400 font-bold tracking-wider">Account Metadata</h5>
                    <div className="text-sm space-y-1.5">
                      <div className="flex justify-between"><span className="text-gray-500">Region:</span> <span className="text-white font-medium">{viewedUser.country}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Date of Birth:</span> <span className="text-white font-medium">{viewedUser.dob || "Not Set"}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Joined:</span> <span className="text-white font-medium">{new Date(viewedUser.createdAt).toLocaleDateString()}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Last Active:</span> <span className="text-white font-mono font-medium">{new Date(viewedUser.lastActive).toLocaleString()}</span></div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex flex-col gap-2">
                    <h5 className="text-xs uppercase text-gray-400 font-bold tracking-wider">Telemetry Stats</h5>
                    <div className="text-sm space-y-1.5">
                      <div className="flex justify-between"><span className="text-gray-500">Login Method:</span> <span className="text-white font-medium">{viewedUser.loginMethod}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Device/OS:</span> <span className="text-white font-medium">{viewedUser.device} ({viewedUser.os})</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Watch History:</span> <span className="text-white font-bold">{viewDetails?.stats?.watchHistoryCount || 0} plays</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Search Queries:</span> <span className="text-white font-bold">{viewDetails?.stats?.searchHistoryCount || 0} searches</span></div>
                    </div>
                  </div>
                </div>

                {/* Preferences Details */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex flex-col gap-3">
                  <h5 className="text-xs uppercase text-gray-400 font-bold tracking-wider">User Preferences</h5>
                  {viewDetails?.user?.preferences ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div><p className="text-gray-500">Theme</p><p className="text-white font-semibold capitalize">{viewDetails.user.preferences.theme || "dark"}</p></div>
                      <div><p className="text-gray-500">Language</p><p className="text-white font-semibold uppercase">{viewDetails.user.preferences.language || "en"}</p></div>
                      <div><p className="text-gray-500">Audio Language</p><p className="text-white font-semibold capitalize">{viewDetails.user.preferences.audioLanguage || "original"}</p></div>
                      <div><p className="text-gray-500">Subtitle Language</p><p className="text-white font-semibold uppercase">{viewDetails.user.preferences.subtitleLanguage || "en"}</p></div>
                      <div><p className="text-gray-500">Volume Level</p><p className="text-white font-semibold">{Math.round((viewDetails.user.preferences.volume || 0.9) * 100)}%</p></div>
                      <div><p className="text-gray-500">Audio Mode</p><p className="text-white font-semibold">{viewDetails.user.preferences.audioMode || "Voice Boost"}</p></div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No preferences set.</p>
                  )}
                </div>

                {/* Active Sessions */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex flex-col gap-3">
                  <h5 className="text-xs uppercase text-gray-400 font-bold tracking-wider">Recent Sessions</h5>
                  {viewDetails?.stats?.activeSessions && viewDetails.stats.activeSessions.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {viewDetails.stats.activeSessions.map((sess, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2 rounded bg-black/35 border border-white/5">
                          <div>
                            <p className="text-white font-semibold">{sess.device} ({sess.os})</p>
                            <p className="text-[10px] text-gray-400">IP: {sess.ip || "Unknown"} | {sess.country}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-blue-400 font-bold">{sess.activity}</p>
                            <p className="text-[9px] text-gray-500">Active: {new Date(sess.lastActive).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No active session records found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editedUser && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 md:p-8 flex flex-col gap-6 relative">
            <button 
              onClick={() => setEditedUser(null)} 
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <i className="ri-close-line"></i>
            </button>

            <h3 className="text-lg font-bold text-white uppercase tracking-wider pl-1 font-['ROSSTEN']">Edit Profile</h3>

            {editError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{editError}</div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xxs uppercase tracking-wider text-gray-400 font-bold mb-1 pl-1">Full Name</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xxs uppercase tracking-wider text-gray-400 font-bold mb-1 pl-1">Email Address</label>
                <input 
                  type="email" 
                  value={editForm.email} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xxs uppercase tracking-wider text-gray-400 font-bold mb-1 pl-1">Region / Country</label>
                  <select 
                    value={editForm.country} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Australia">Australia</option>
                    <option value="Japan">Japan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xxs uppercase tracking-wider text-gray-400 font-bold mb-1 pl-1">Role</label>
                  <select 
                    value={editForm.role} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xxs uppercase tracking-wider text-gray-400 font-bold mb-1 pl-1">Date of Birth</label>
                <input 
                  type="date" 
                  value={editForm.dob} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 cursor-pointer [color-scheme:dark]"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  id="edit-premium"
                  checked={editForm.isPremium} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, isPremium: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/10 bg-slate-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="edit-premium" className="text-sm text-gray-300 font-semibold cursor-pointer">Premium Account Subscription</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setEditedUser(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-sm cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={editLoading}
                  className="flex-1 py-3 rounded-xl gradient-btn text-white font-semibold text-sm cursor-pointer hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {editLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 md:p-8 flex flex-col gap-6 relative text-center">
            
            {/* Danger Warning Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
              <i className="ri-error-warning-line text-3xl"></i>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wider pl-1 font-['ROSSTEN']">Delete User?</h3>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed max-w-sm mx-auto pl-1">
                This action will permanently remove the user's account and all associated data. If the user logs in again, they will be treated as a completely new user.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/5 text-left text-xs font-mono max-w-xs mx-auto">
                <p className="text-gray-400 truncate">User ID: <span className="text-white">{deletingUser._id}</span></p>
                <p className="text-gray-400 truncate">Email: <span className="text-white">{deletingUser.email}</span></p>
                <p className="text-gray-400">Method: <span className="text-white">{deletingUser.loginMethod}</span></p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{deleteError}</div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-sm cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {deleteLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
