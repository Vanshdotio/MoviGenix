import React, { Suspense } from "react";
import Lenis from "lenis";
import Loader from "./components/Loader";
import ProfileCompletionModal from "./components/ProfileCompletionModal";

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

const App = () => {
  return (
    <Suspense fallback={<Loader />}>
      <Nav />
      <Approute />
      <ProfileCompletionModal />
    </Suspense>
  );
};

export default App;
