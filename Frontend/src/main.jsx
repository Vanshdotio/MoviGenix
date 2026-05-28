import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "remixicon/fonts/remixicon.css";
import { BrowserRouter } from "react-router-dom";
import Loader from "./components/Loader";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";

const App = React.lazy(() => import("./App.jsx"));
const GOOGLE_CLIENT_ID = "966319354665-nqevmcplc0tr3qd886183gf98trjdcuu.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loader />}>
          <App />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </GoogleOAuthProvider>
);
