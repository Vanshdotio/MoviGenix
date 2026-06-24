import React from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CategoryGuard = ({ children, category = "anime" }) => {
  const { contentPreferences, updateContentPreferences } = useAuth();
  const navigate = useNavigate();
  const { type } = useParams();
  const { pathname } = useLocation();

  // Detect if this is an anime route dynamically
  const isAnime =
    category === "anime" ||
    type === "anime" ||
    pathname.startsWith("/anime") ||
    pathname.includes("/details/anime");

  const isEnabled = isAnime ? contentPreferences.showAnime : true;

  if (isEnabled) {
    return <>{children}</>;
  }

  const handleEnable = async () => {
    try {
      if (category === "anime") {
        await updateContentPreferences({ showAnime: true });
      }
    } catch (err) {
      console.error("Failed to enable category:", err);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 py-12 select-none font-[Inter]">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-red-950/10 blur-[120px]" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-blue-950/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md bg-zinc-950/60 border border-white/5 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl animate-fade-in">
        {/* Slashed Eye/Lock icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-center mb-6 text-zinc-500 shadow-[inset_0_0_15px_rgba(255,255,255,0.02)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-10 h-10 text-yellow-500/80 animate-pulse"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8V10H9V8C9 6.34 10.34 5 12 5ZM17 18H7V12H17V18Z" />
          </svg>
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white mb-3">
          Category Disabled
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          This category is currently disabled in your content visibility preferences.
        </p>

        <div className="flex flex-col gap-3">
          {/* Enable Category */}
          <button
            onClick={handleEnable}
            className="gradient-btn w-full py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer shadow-lg hover:shadow-yellow-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-none"
          >
            Enable Category
          </button>

          {/* Go To Settings */}
          <button
            onClick={() => navigate("/profile?tab=preferences")}
            className="w-full py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-white/5 hover:border-white/10 text-zinc-300 hover:text-white font-semibold text-sm cursor-pointer transition-all duration-200"
          >
            Go To Settings
          </button>

          {/* Go Home */}
          <button
            onClick={() => navigate("/")}
            className="w-full py-3.5 rounded-xl bg-transparent hover:bg-white/5 border border-transparent text-zinc-500 hover:text-zinc-300 font-semibold text-sm cursor-pointer transition-all duration-200"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryGuard;
