import React, { createContext, useContext, useState, useEffect } from "react";
import {
  signupUser,
  loginUser,
  googleLoginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  toggleFavoriteApi,
  toggleWatchlistApi,
  addContinueWatchingApi,
  removeContinueWatchingApi,
  toggleNotifyMeApi,
  getNotifyMeListApi,
  authClient,
  default as apiClient
} from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifyMeList, setNotifyMeList] = useState([]); // [{contentId, contentType, ...}]

  const [guestPreferences, setGuestPreferences] = useState(() => {
    const saved = localStorage.getItem("guestPreferences");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing guestPreferences from localStorage:", e);
      }
    }
    return {
      showAnime: true,
    };
  });

  const contentPreferences = user
    ? {
        showAnime: user.preferences?.showAnime ?? true,
      }
    : guestPreferences;

  const updateContentPreferences = async (newPrefs) => {
    if (user) {
      const updatedPreferences = {
        ...user.preferences,
        ...newPrefs,
      };
      await updateProfile({
        preferences: updatedPreferences,
      });
    } else {
      const updated = {
        ...guestPreferences,
        ...newPrefs,
      };
      setGuestPreferences(updated);
      localStorage.setItem("guestPreferences", JSON.stringify(updated));
    }
  };

  // Check user session on initial render
  const checkSession = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getUserProfile();
      if (data && data.user) {
        setUser(data.user);
        // Load notify-me list after login
        try {
          const notifData = await getNotifyMeListApi();
          setNotifyMeList(notifData.notifications || []);
        } catch (_) {
          // ignore — user may not be logged in yet
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    // Register a response interceptor to handle 401s across the app
    const authInterceptor = authClient.interceptors.response.use(
      (response) => response,
      (err) => {
        if (err.response && err.response.status === 401) {
          setUser(null);
        }
        return Promise.reject(err);
      }
    );

    const apiInterceptor = apiClient.interceptors.response.use(
      (response) => response,
      (err) => {
        if (err.response && err.response.status === 401) {
          setUser(null);
        }
        return Promise.reject(err);
      }
    );

    return () => {
      authClient.interceptors.response.eject(authInterceptor);
      apiClient.interceptors.response.eject(apiInterceptor);
    };
  }, []);

  const login = async (email, password, rememberMe) => {
    try {
      setLoading(true);
      setError(null);
      const data = await loginUser({ email, password, rememberMe });
      if (data.token) localStorage.setItem("authToken", data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const errMsg = err.response?.data?.error || "Invalid credentials. Please try again.";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password, confirmPassword, dob) => {
    try {
      setLoading(true);
      setError(null);
      const data = await signupUser({ name, email, password, confirmPassword, dob });
      if (data.token) localStorage.setItem("authToken", data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const errMsg = err.response?.data?.error || "Registration failed. Please try again.";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (credential) => {
    try {
      setLoading(true);
      setError(null);
      const data = await googleLoginUser(credential);
      if (data.token) localStorage.setItem("authToken", data.token);
      setUser(data.user);
      return data.user;
    } catch (err) {
      const errMsg = err.response?.data?.error || "Google sign in failed.";
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err.message);
    } finally {
      localStorage.removeItem("authToken");
      setUser(null);
      setLoading(false);
    }
  };

  const updateProfile = async (data) => {
    try {
      setError(null);
      const res = await updateUserProfile(data);
      setUser(res.user);
      return res.user;
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to update profile.";
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const toggleFavorite = async (media) => {
    if (!user) return false;
    try {
      const res = await toggleFavoriteApi(media);
      setUser((prev) => ({
        ...prev,
        favorites: res.favorites,
      }));
      return true;
    } catch (err) {
      console.error("Failed to toggle favorite:", err.message);
      return false;
    }
  };

  const toggleWatchlist = async (media) => {
    if (!user) return false;
    try {
      const res = await toggleWatchlistApi(media);
      setUser((prev) => ({
        ...prev,
        watchlist: res.watchlist,
      }));
      return true;
    } catch (err) {
      console.error("Failed to toggle watchlist:", err.message);
      return false;
    }
  };

  const addContinueWatching = async (media) => {
    if (!user) return false;
    try {
      const res = await addContinueWatchingApi(media);
      setUser((prev) => ({
        ...prev,
        continueWatching: res.continueWatching,
      }));
      return true;
    } catch (err) {
      console.error("Failed to update continue watching:", err.message);
      return false;
    }
  };

  const removeContinueWatching = async (media) => {
    if (!user) return false;
    try {
      const res = await removeContinueWatchingApi(media);
      setUser((prev) => ({
        ...prev,
        continueWatching: res.continueWatching,
      }));
      return true;
    } catch (err) {
      console.error("Failed to remove continue watching:", err.message);
      return false;
    }
  };

  const toggleNotifyMe = async ({ contentId, contentType, title, releaseDate }) => {
    if (!user) return false;
    try {
      const res = await toggleNotifyMeApi({ contentId, contentType, title, releaseDate });
      if (res.subscribed) {
        setNotifyMeList((prev) => [...prev, { contentId, contentType, title, releaseDate }]);
      } else {
        setNotifyMeList((prev) => prev.filter((n) => n.contentId !== contentId));
      }
      return res.subscribed;
    } catch (err) {
      console.error("Failed to toggle notify me:", err.message);
      return false;
    }
  };

  const isNotifiedFor = (contentId) => {
    return notifyMeList.some((n) => String(n.contentId) === String(contentId));
  };

  const getWatchlist = (type) => {
    if (!user || !user.watchlist) return [];
    const key = type === "web-series" ? "webSeries" : type;
    return user.watchlist[key] || [];
  };

  const getContinueWatching = (type) => {
    if (!user || !user.continueWatching) return [];
    const key = type === "web-series" ? "webSeries" : type;
    return user.continueWatching[key] || [];
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    googleLogin,
    logout,
    updateProfile,
    toggleFavorite,
    toggleWatchlist,
    addContinueWatching,
    removeContinueWatching,
    getWatchlist,
    getContinueWatching,
    toggleNotifyMe,
    isNotifiedFor,
    notifyMeList,
    isAuthenticated: !!user,
    contentPreferences,
    updateContentPreferences,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
