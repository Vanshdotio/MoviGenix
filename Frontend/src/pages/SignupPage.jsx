import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { getPopularMovies } from "../services/api";

const SignupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, googleLogin } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const redirectUrl = queryParams.get("redirect") || "/";
  const hasRedirect = !!queryParams.get("redirect");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dob, setDob] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [errors, setErrors] = useState({});
  
  // Background posters state
  const [posters, setPosters] = useState([]);

  useEffect(() => {
    // Fetch popular movie poster paths for the background collage
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
    setErrors({});

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    const newErrors = {};
    if (!trimmedName) {
      newErrors.name = "Name is required.";
    }

    if (!trimmedEmail) {
      newErrors.email = "Email is required.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/i;
      if (!emailRegex.test(trimmedEmail)) {
        newErrors.email = "Please enter a valid email address.";
      }
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else {
      if (password.length < 6) {
        newErrors.password = "Password must be at least 6 characters long.";
      } else if (!/[A-Z]/.test(password)) {
        newErrors.password = "Password must contain at least one capital letter.";
      } else if (!/\d/.test(password)) {
        newErrors.password = "Password must contain at least one number.";
      } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        newErrors.password = "Password must contain at least one special character.";
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!dob) {
      newErrors.dob = "Date of birth is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      await signup(trimmedName, trimmedEmail, password, confirmPassword, dob);
      navigate(redirectUrl);
    } catch (err) {
      const errMsg = err.message || "Failed to create account.";
      setErrorMsg(errMsg);
      
      const lowerMsg = errMsg.toLowerCase();
      const newErrors = {};
      if (lowerMsg.includes("email") || lowerMsg.includes("already registered") || lowerMsg.includes("in use")) {
        newErrors.email = errMsg;
      }
      if (lowerMsg.includes("password")) {
        newErrors.password = errMsg;
        newErrors.confirmPassword = errMsg;
      }
      if (lowerMsg.includes("name")) {
        newErrors.name = errMsg;
      }
      if (lowerMsg.includes("dob") || lowerMsg.includes("date") || lowerMsg.includes("age") || lowerMsg.includes("minor")) {
        newErrors.dob = errMsg;
      }
      setErrors(newErrors);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setErrorMsg("");
    try {
      setLoading(true);
      await googleLogin(credentialResponse.credential);
      navigate(redirectUrl);
    } catch (err) {
      setErrorMsg(err.message || "Google authentication failed.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-black overflow-hidden font-[Inter]">
      {/* Background Poster Collage */}
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
        <div className="text-center mb-6">
          <Link to="/">
            <img
              src="/assets/movigenix-m-logo.png"
              alt="Logo"
              className="h-12 w-12 mx-auto mb-4 cursor-pointer object-contain"
            />
          </Link>
          {hasRedirect ? (
            <>
              <p className="text-sm text-zinc-300 font-medium mb-4 animate-fade-in">
                Please sign in to continue watching.
              </p>
              <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5 mb-6">
                <Link
                  to={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
                  className="flex-1 py-2 rounded-lg text-zinc-400 font-semibold text-xs hover:text-white transition duration-200 flex items-center justify-center"
                >
                  Sign In
                </Link>
                <button
                  type="button"
                  className="flex-1 py-2 rounded-lg bg-zinc-800 border border-white/5 text-white font-semibold text-xs shadow-md transition duration-200 cursor-default"
                >
                  Create Account
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold font-['ROSSTEN'] tracking-wider text-white">
                CREATE ACCOUNT
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Join now to get personalized recommendations.
              </p>
            </>
          )}
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center animate-fade-in">
            {errorMsg}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Name input */}
          <div className="relative">
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
              }}
              className={`w-full px-4 py-3 rounded-xl bg-zinc-900/60 border text-white text-sm placeholder-zinc-500 outline-none transition duration-200 ${
                errors.name ? "border-red-500 focus:border-red-500" : "border-white/5 focus:border-blue-500"
              }`}
              placeholder="Your Name"
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1 pl-1 text-left">{errors.name}</p>
            )}
          </div>

          {/* Email input */}
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
              }}
              className={`w-full px-4 py-3 rounded-xl bg-zinc-900/60 border text-white text-sm placeholder-zinc-500 outline-none transition duration-200 ${
                errors.email ? "border-red-500 focus:border-red-500" : "border-white/5 focus:border-blue-500"
              }`}
              placeholder="Email Address"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1 pl-1 text-left">{errors.email}</p>
            )}
          </div>

          {/* Password input */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors(prev => ({ ...prev, password: "" }));
              }}
              className={`w-full px-4 py-3 pr-12 rounded-xl bg-zinc-900/60 border text-white text-sm placeholder-zinc-500 outline-none transition duration-200 ${
                errors.password ? "border-red-500 focus:border-red-500" : "border-white/5 focus:border-blue-500"
              }`}
              placeholder="Password (min 6 characters)"
            />
            {/* Show/Hide password toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer transition-colors"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 6.5c2.76 0 5 2.24 5 5 0 .51-.1 1-.24 1.46l3.27 3.27c1.75-2.02 2.8-4.57 2.97-7.23-1.73-4.39-6-7.5-11-7.5-2.08 0-4.06.54-5.8 1.49l2.34 2.34c1.07-.36 2.2-.56 3.46-.56zm-8.13-2.6L2.39 5.38l3.41 3.41C4.19 10.15 3.12 12.33 3 14.5c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l2.84 2.84 1.41-1.41L3.87 3.9zm5.33 5.33l2.83 2.83c-.02.15-.03.31-.03.47 0 1.66-1.34 3-3 3-.16 0-.32-.01-.47-.03L8.7 12.7c-.36-1.07-.16-2.2.5-2.83zm2.8 1.41L12 12c0-.03.01-.06.01-.09l-.01.09z"/>
                </svg>
              )}
            </button>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1 pl-1 text-left">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password input */}
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: "" }));
              }}
              className={`w-full px-4 py-3 pr-12 rounded-xl bg-zinc-900/60 border text-white text-sm placeholder-zinc-500 outline-none transition duration-200 ${
                errors.confirmPassword ? "border-red-500 focus:border-red-500" : "border-white/5 focus:border-blue-500"
              }`}
              placeholder="Confirm Password"
            />
            {/* Show/Hide password toggle */}
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer transition-colors"
            >
              {showConfirmPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 6.5c2.76 0 5 2.24 5 5 0 .51-.1 1-.24 1.46l3.27 3.27c1.75-2.02 2.8-4.57 2.97-7.23-1.73-4.39-6-7.5-11-7.5-2.08 0-4.06.54-5.8 1.49l2.34 2.34c1.07-.36 2.2-.56 3.46-.56zm-8.13-2.6L2.39 5.38l3.41 3.41C4.19 10.15 3.12 12.33 3 14.5c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l2.84 2.84 1.41-1.41L3.87 3.9zm5.33 5.33l2.83 2.83c-.02.15-.03.31-.03.47 0 1.66-1.34 3-3 3-.16 0-.32-.01-.47-.03L8.7 12.7c-.36-1.07-.16-2.2.5-2.83zm2.8 1.41L12 12c0-.03.01-.06.01-.09l-.01.09z"/>
                </svg>
              )}
            </button>
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1 pl-1 text-left">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Date of Birth input */}
          <div className="relative">
            <label htmlFor="dob" className="block text-xxs text-zinc-400 mb-1 uppercase tracking-wider pl-1 font-semibold">
              Date of Birth
            </label>
            <input
              type="date"
              id="dob"
              value={dob}
              onChange={(e) => {
                setDob(e.target.value);
                if (errors.dob) setErrors(prev => ({ ...prev, dob: "" }));
              }}
              className={`w-full px-4 py-3 rounded-xl bg-zinc-900/60 border text-white text-sm outline-none transition duration-200 cursor-pointer [color-scheme:dark] ${
                errors.dob ? "border-red-500 focus:border-red-500" : "border-white/5 focus:border-blue-500"
              }`}
            />
            {errors.dob && (
              <p className="text-red-400 text-xs mt-1 pl-1 text-left">{errors.dob}</p>
            )}
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
              "Sign Up"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 w-full border-t border-white/5"></div>
          <span className="relative z-10 px-3 bg-zinc-950/80 text-xxs text-zinc-500 uppercase tracking-widest">
            OR SIGN UP WITH
          </span>
        </div>

        {/* Google Authentication Component */}
        <div className="flex justify-center w-full">
          <div className="w-full max-w-[360px] h-10 rounded-xl overflow-hidden flex justify-center items-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErrorMsg("Google Sign-Up failed. Please try again.")}
              theme="dark"
              shape="rectangular"
              size="large"
              width="360"
              text="signup_with"
              logo_alignment="left"
              locale="en"
            />
          </div>
        </div>

        {/* Login Redirect */}
        <p className="text-center text-xs text-zinc-500 mt-6">
          Already have an account?{" "}
          <Link
            to={hasRedirect ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"}
            className="text-white hover:text-yellow-400 font-semibold transition duration-200"
          >
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
};

export default SignupPage;
