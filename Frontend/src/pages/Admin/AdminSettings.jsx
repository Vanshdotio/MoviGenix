import React, { useEffect, useState } from "react";
import { getLiveActivityApi, toggleTrafficSimulatorApi, resetAnalyticsDataApi, promoteUserToAdminApi } from "../../services/api";
import Loader from "../../components/Loader";
import "./Admin.scss";

const AdminSettings = () => {
  const [simulationActive, setSimulationActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteMessage, setPromoteMessage] = useState("");
  const [promoteError, setPromoteError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const fetchSimulationState = async () => {
    try {
      setLoading(true);
      const res = await getLiveActivityApi();
      if (res.success) {
        setSimulationActive(res.simulationActive);
      }
    } catch (err) {
      console.log("Failed to load simulator state.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulationState();
  }, []);

  const handleToggleSimulator = async () => {
    try {
      setSimLoading(true);
      const newState = !simulationActive;
      const res = await toggleTrafficSimulatorApi(newState);
      if (res.success) {
        setSimulationActive(res.simulationActive);
      }
    } catch (err) {
      console.log("Failed to toggle simulator.");
    } finally {
      setSimLoading(false);
    }
  };

  const handleResetData = async () => {
    const confirm = window.confirm("Are you sure you want to clear the analytics database? This will wipe all recorded telemetry histories (sessions, watch histories, searches, player events) to start a clean live analysis environment.");
    if (!confirm) return;

    try {
      setResetLoading(true);
      setResetMessage("");
      const res = await resetAnalyticsDataApi();
      if (res.success) {
        setResetMessage("Database cleared successfully! Starting fresh live telemetry analysis.");
      }
    } catch (err) {
      setResetMessage("Failed to clear database.");
    } finally {
      setResetLoading(false);
    }
  };

  const handlePromoteAdmin = async (e) => {
    e.preventDefault();
    setPromoteMessage("");
    setPromoteError("");

    if (!promoteEmail) return;

    try {
      const res = await promoteUserToAdminApi(promoteEmail);
      if (res.success) {
        setPromoteMessage(res.message);
        setPromoteEmail("");
      }
    } catch (err) {
      setPromoteError(err.response?.data?.error || "Failed to promote user.");
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Telemetry Mode Card */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="ri-broadcast-line text-emerald-500"></i>
              Telemetry Tracking Mode
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Live Analysis Mode is active. The dashboard strictly processes real, actual traffic from authenticated user sessions.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-emerald-400 text-sm font-semibold">
            <span className="live-pulse"></span>
            <span>Live Analysis Active</span>
          </div>
        </div>

        <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-gray-400 flex items-center gap-2">
          <i className="ri-information-line text-blue-400"></i>
          <span>Background traffic simulation is fully disabled to guarantee that metrics represent 100% genuine user actions.</span>
        </div>
      </div>

      {/* Role Promotion Card */}
      <div className="glass-panel p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="ri-shield-user-line text-pink-500"></i>
            Promote User to Administrator
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Grant administrative access keys (access to /admin dashboard) to any registered email.
          </p>
        </div>

        <form onSubmit={handlePromoteAdmin} className="flex gap-3 max-w-lg">
          <input
            type="email"
            placeholder="enter.user.email@example.com"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500/50"
            required
          />
          <button
            type="submit"
            className="glow-btn px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow"
          >
            Promote to Admin
          </button>
        </form>

        {promoteMessage && (
          <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-2">
            <i className="ri-checkbox-circle-line"></i> {promoteMessage}
          </p>
        )}
        {promoteError && (
          <p className="text-sm text-pink-500 bg-pink-500/10 border border-pink-500/20 p-3 rounded-xl flex items-center gap-2">
            <i className="ri-close-circle-line"></i> {promoteError}
          </p>
        )}
      </div>

      {/* Wipe Analytics Card */}
      <div className="glass-panel p-6 space-y-6 border-pink-500/10">
        <div>
          <h3 className="text-lg font-bold text-pink-400 flex items-center gap-2">
            <i className="ri-refresh-line text-pink-500"></i>
            Wipe Analytics Database
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Clear all current analytics history collections (Sessions, Searches, Watch History, Player Events) to start a completely fresh live tracking environment.
          </p>
        </div>

        <div>
          <button
            onClick={handleResetData}
            disabled={resetLoading}
            className="px-6 py-2.5 rounded-xl text-sm font-bold border border-pink-500/30 text-pink-400 hover:bg-pink-500/10 transition-all disabled:opacity-50"
          >
            {resetLoading ? "Wiping Data..." : "Clear Telemetry Data"}
          </button>
        </div>

        {resetMessage && (
          <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
            {resetMessage}
          </p>
        )}
      </div>

      {/* Security warning */}
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400 text-xs leading-relaxed space-y-1">
        <p className="font-bold flex items-center gap-1.5">
          <i className="ri-alert-line"></i> SECURITY NOTICE
        </p>
        <p>
          This dashboard displays user names, email IDs, metadata, and platform actions. High security measures are enforced. User passwords are encrypted, never selected from database queries, and never exposed to the client-side dashboard interfaces. Only authenticated accounts possessing the `admin` role parameter can fetch telemetry metrics.
        </p>
      </div>
    </div>
  );
};

export default AdminSettings;
