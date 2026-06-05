import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getPopularMovies } from "../services/api";
import { authClient } from "../services/api";
import TurnstileWidget from "../components/TurnstileWidget";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [posters, setPosters] = useState([]);
  const resetTurnstileRef = useRef(null);

  useEffect(() => {
    // Fetch popular movie poster paths for the dynamic background collage
    const fetchBackgroundPosters = async () => {
      try {
        const movies = await getPopularMovies();
        if (movies && movies.length > 0) {
          const posterPaths = movies
            .slice(0, 18)
            .map((m) => m.poster_path)
            .filter(Boolean);
          setPosters(posterPaths);
        }
      } catch (err) {
        console.error("Failed to fetch backdrop posters:", err);
      }
    };
    fetchBackgroundPosters();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (!captchaToken) {
      setErrorMsg("Please complete the security check.");
      return;
    }

    try {
      setLoading(true);
      const response = await authClient.post("/forgot-password", {
        email,
        captchaToken,
      });

      setSuccessMsg(
        response.data.message ||
          "A password reset link has been sent to your email (Mock Flow)."
      );
      setEmail("");
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error ||
          "Something went wrong. Please try again."
      );
      // Reset CAPTCHA widget on error to get a fresh token
      if (resetTurnstileRef.current) {
        resetTurnstileRef.current();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden font-[Inter]">
      {/* Dynamic Background Poster Collage */}
      <div className="absolute inset-0 grid grid-cols-3 sm:grid-cols-6 gap-2 p-2 opacity-15 scale-105 pointer-events-none select-none blur-[2px]">
        {posters.map((path, index) => (
          <div key={index} className="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900/40">
            <img
              src={`https://image.tmdb.org/t/p/w300${path}`}
              alt=""
              width={150}
              height={225}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Cinematic Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60 pointer-events-none"></div>
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-black pointer-events-none"></div>

      {/* Floating Blobs (Aesthetic Accent) */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-pink-600/10 blur-[100px] pointer-events-none"></div>

      {/* Glassmorphism Auth Card */}
      <div className="relative z-10 w-full max-w-md mx-4 p-8 sm:p-10 rounded-2xl bg-zinc-950/60 border border-white/10 backdrop-blur-xl shadow-2xl transition-all duration-300">
        {/* Logo and Headings */}
        <div className="text-center mb-8">
          <Link to="/">
            <img
              src="/assets/movigenix-m-logo.png"
              alt="Logo"
              className="h-12 w-12 mx-auto mb-4 cursor-pointer object-contain"
            />
          </Link>
          <h2 className="text-2xl font-bold font-['ROSSTEN'] tracking-wider text-white">
            RESET PASSWORD
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Enter your email address to receive a password reset link.
          </p>
        </div>

        {/* Message banners */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center animate-fade-in">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center animate-fade-in">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email input */}
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-white/5 focus:border-blue-500 text-white text-sm placeholder-zinc-500 outline-none transition duration-200"
              placeholder="Email Address"
              required
              disabled={loading}
            />
          </div>

          {/* Cloudflare Turnstile CAPTCHA Widget */}
          <div className="py-1">
            <TurnstileWidget
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken("")}
              onError={() => {
                setCaptchaToken("");
                setErrorMsg("Security check failed. Please refresh the page.");
              }}
              resetRef={resetTurnstileRef}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="gradient-btn w-full max-w-[360px] h-10 mx-auto rounded-xl text-white font-semibold text-sm cursor-pointer shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        {/* Redirect back to Login */}
        <p className="text-center text-xs text-zinc-500 mt-8">
          Remember your password?{" "}
          <Link
            to="/login"
            className="text-white hover:text-yellow-400 font-semibold transition duration-200"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
