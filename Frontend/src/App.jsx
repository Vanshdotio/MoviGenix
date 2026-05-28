import React, { Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";
import Loader from "./components/Loader";
import ProfileCompletionModal from "./components/ProfileCompletionModal";
import { useAuth } from "./context/AuthContext";
import { trackHeartbeat } from "./services/telemetry";

const Nav = React.lazy(() => import("./components/Nav"));
const Approute = React.lazy(() => import("./routes/Approute"));

// Initialize Lenis
const lenis = new Lenis();

// Use requestAnimationFrame to continuously update the scroll
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

const getActivityFromPath = (pathname) => {
  if (pathname === "/") return "Browsing Home";
  if (pathname === "/tv") return "Browsing TV Shows";
  if (pathname === "/movies") return "Browsing Movies";
  if (pathname === "/anime") return "Browsing Anime";
  if (pathname === "/cartoon") return "Browsing Cartoons";
  if (pathname === "/search") return "Searching Content";
  if (pathname === "/profile") return "Viewing Profile";
  if (pathname.startsWith("/movie/")) return "Watching Movie";
  if (pathname.startsWith("/tv/")) return "Watching TV Show";
  if (pathname.startsWith("/anime/")) return "Watching Anime Series";
  if (pathname.startsWith("/cartoon/")) return "Watching Cartoon";
  if (pathname.startsWith("/admin")) return "Admin Dashboard";
  return "Browsing";
};

const App = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!isAuthenticated) return;

    const activity = getActivityFromPath(location.pathname);
    // Send heartbeat immediately on route change
    trackHeartbeat(location.pathname, activity);

    // Also send periodic heartbeat every 30 seconds
    const interval = setInterval(() => {
      trackHeartbeat(location.pathname, activity);
    }, 30000);

    return () => clearInterval(interval);
  }, [location.pathname, isAuthenticated, user?._id]);

  return (
    <Suspense fallback={<Loader />}>
      {!isAdminRoute && <Nav />}
      <Approute />
      <ProfileCompletionModal />
    </Suspense>
  );
};

export default App;
