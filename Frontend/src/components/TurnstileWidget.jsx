import React, { useEffect, useRef, useState } from "react";

const TurnstileWidget = ({ onVerify, onExpire, onError, resetRef }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the script is already added to the document
    let script = document.querySelector(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]'
    );

    const handleLoad = () => {
      setScriptLoaded(true);
    };

    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = handleLoad;
      document.body.appendChild(script);
    } else {
      if (window.turnstile) {
        setScriptLoaded(true);
      } else {
        script.addEventListener("load", handleLoad);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener("load", handleLoad);
      }
    };
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;

    try {
      setLoading(true);
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAADffBuFUXB912jTC",
        theme: "dark",
        callback: (token) => {
          setLoading(false);
          if (onVerify) onVerify(token);
        },
        "expired-callback": () => {
          setLoading(false);
          if (onExpire) onExpire();
        },
        "error-callback": (err) => {
          setLoading(false);
          console.error("Turnstile widget error:", err);
          if (onError) onError();
        },
      });
    } catch (err) {
      console.error("Failed to render Turnstile widget:", err);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          console.warn("Error removing Turnstile widget:", e);
        }
      }
    };
  }, [scriptLoaded, onVerify, onExpire, onError]);

  // Expose the reset widget functionality to the parent component via the resetRef
  useEffect(() => {
    if (resetRef) {
      resetRef.current = () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current);
            setLoading(true);
          } catch (e) {
            console.warn("Failed to reset Turnstile widget:", e);
          }
        }
      };
    }
  }, [resetRef]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[65px] py-1.5 w-full rounded-xl bg-zinc-900/40 border border-white/5 backdrop-blur-md overflow-hidden transition-all duration-300">
      {loading && (
        <div className="flex items-center gap-3 text-xs text-zinc-400 animate-pulse py-2.5">
          <span className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin"></span>
          <span>Securing session...</span>
        </div>
      )}
      <div
        ref={containerRef}
        className={`transition-opacity duration-300 ${
          loading ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
        }`}
      ></div>
    </div>
  );
};

export default TurnstileWidget;
