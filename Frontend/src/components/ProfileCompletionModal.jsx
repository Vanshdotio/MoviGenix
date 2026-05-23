import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const ProfileCompletionModal = () => {
  const { user, updateProfile, logout } = useAuth();
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Only render if user is authenticated but doesn't have a DOB
  if (!user || user.dob) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!dob) {
      setErrorMsg("Please select your date of birth.");
      return;
    }

    // Basic date validation
    const selectedDate = new Date(dob);
    const today = new Date();
    if (selectedDate > today) {
      setErrorMsg("Date of Birth cannot be in the future.");
      return;
    }

    try {
      setLoading(true);
      await updateProfile({ dob });
    } catch (err) {
      setErrorMsg(err.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md font-[Inter] overflow-y-auto">
      {/* Cinematic Blur Background Accent */}
      <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/3 w-64 h-64 rounded-full bg-pink-600/10 blur-[120px] pointer-events-none"></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-md mx-4 p-8 sm:p-10 rounded-2xl bg-zinc-950/70 border border-white/10 backdrop-blur-xl shadow-2xl text-center">
        
        {/* Logo or Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
        </div>

        {/* Header */}
        <h2 className="text-2xl font-bold font-['ROSSTEN'] tracking-wider text-white mb-2">
          COMPLETE PROFILE
        </h2>
        <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-6 leading-relaxed">
          Please enter your date of birth to finish setting up your account. This secures content filtering for younger users.
        </p>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative text-left">
            <label htmlFor="modal-dob" className="block text-xxs text-zinc-400 mb-1 uppercase tracking-wider pl-1 font-semibold">
              Date of Birth
            </label>
            <input
              type="date"
              id="modal-dob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/5 focus:border-blue-500 text-white text-sm outline-none transition duration-200 cursor-pointer [color-scheme:dark]"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="gradient-btn w-full py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                "Save and Continue"
              )}
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 font-semibold text-sm cursor-pointer border border-transparent hover:border-white/5 transition-all duration-200"
            >
              Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileCompletionModal;
