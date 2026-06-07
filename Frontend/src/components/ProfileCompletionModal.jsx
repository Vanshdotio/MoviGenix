import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const ProfileCompletionModal = () => {
  const { user, updateProfile, logout } = useAuth();
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("India");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Update local state when user shifts/logs in
  useEffect(() => {
    if (user) {
      if (user.dob) setDob(user.dob);
      if (user.country && user.country !== "Unknown") setCountry(user.country);
      if (user.preferences?.language) setLanguage(user.preferences.language);
    }
  }, [user]);

  // Check if profile is complete (DOB is set, country is set and not "Unknown", language is set)
  const isProfileComplete = user && user.dob && user.country && user.country !== "Unknown" && user.preferences?.language;
  if (!user || isProfileComplete) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!dob) {
      setErrorMsg("Please select your date of birth.");
      return;
    }

    if (!country || country === "Unknown") {
      setErrorMsg("Please select your region.");
      return;
    }

    if (!language) {
      setErrorMsg("Please select your language preference.");
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
      await updateProfile({
        dob,
        country,
        preferences: {
          ...user.preferences,
          language
        }
      });
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
          Please complete onboarding details to set up your fresh account.
        </p>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* DOB */}
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

          {/* Region */}
          <div className="relative text-left">
            <label htmlFor="modal-region" className="block text-xxs text-zinc-400 mb-1 uppercase tracking-wider pl-1 font-semibold">
              Region / Country
            </label>
            <select
              id="modal-region"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/5 focus:border-blue-500 text-white text-sm outline-none transition duration-200 cursor-pointer"
              required
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

          {/* Language Preference */}
          <div className="relative text-left">
            <label htmlFor="modal-lang" className="block text-xxs text-zinc-400 mb-1 uppercase tracking-wider pl-1 font-semibold">
              Preferred Language
            </label>
            <select
              id="modal-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/5 focus:border-blue-500 text-white text-sm outline-none transition duration-200 cursor-pointer"
              required
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
            </select>
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
