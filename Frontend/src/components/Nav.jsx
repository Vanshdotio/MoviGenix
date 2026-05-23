import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StaggeredMenu from "./StaggeredMenu";

const Nav = () => {
  const navRef = useRef(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    let lastScrollTop = 0;
    const handleScroll = () => {
      let navbar = navRef.current;
      if (!navbar) return;
      let currentScroll = window.pageYOffset;

      if (currentScroll > lastScrollTop && currentScroll > 100) {
        navbar.style.top = "-90px"; // Hide navbar
      } else {
        navbar.style.top = "0"; // Show navbar
      }
      lastScrollTop = currentScroll;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Build menu items for mobile Staggered Menu
  const menuItems = [
    { label: "Home", link: "/" },
    { label: "Cartoon", link: "/cartoon" },
    { label: "TV Shows", link: "/tv" },
    { label: "Anime", link: "/anime" },
  ];

  if (user) {
    menuItems.push({
      label: "My Profile",
      link: "/profile"
    });
    menuItems.push({
      isAccount: true,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      onLogout: () => {
        logout();
        navigate("/");
      }
    });
  } else {
    menuItems.push({
      isAccount: false,
      label: "Sign In",
      link: "/login"
    });
  }

  const socialItems = [
    { label: "Twitter", link: "https://twitter.com" },
    { label: "Instagram", link: "https://instagram.com" },
    { label: "Discord", link: "https://discord.com" }
  ];

  return (
    <>
      <div
        ref={navRef}
        className="fixed top-0 font-[Inter] left-0 w-full text-white bg-transparent justify-between flex items-center px-6 pr-7 py-2 transition-all duration-300 z-50"
      >
        <Link to="/">
          <img
            src="/assets/Pi7_Tool_movie recommendation logo.png"
            alt="Logo"
            className="h-10 md:h-13 cursor-pointer select-none"
          />
        </Link>
        
        <div className="flex items-center gap-4 sm:gap-6 md:gap-8 text-sm md:text-base select-none">
          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 md:gap-8">
            <Link to="/" className="hover:text-yellow-400 transition-colors duration-200">Home</Link>
            <Link to="/cartoon" className="hover:text-yellow-400 transition-colors duration-200">Cartoon</Link>
            <Link to="/tv" className="hover:text-yellow-400 transition-colors duration-200">TV Shows</Link>
            <Link to="/anime" className="hover:text-yellow-400 transition-colors duration-200">Anime</Link>
          </div>
          
          {/* Search Icon */}
          <Link to="/search" className="hover:text-yellow-400 transition-colors duration-200 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="search h-5 w-5 md:h-6 md:w-6 cursor-pointer"
            >
              <path d="M18.031 16.6168L22.3137 20.8995L20.8995 22.3137L16.6168 18.031C15.0769 19.263 13.124 20 11 20C6.032 20 2 15.968 2 11C2 6.032 6.032 2 11 2C15.968 2 20 6.032 20 11C20 13.124 19.263 15.0769 18.031 16.6168ZM16.0247 15.8748C17.2475 14.6146 18 12.8956 18 11C18 7.1325 14.8675 4 11 4C7.1325 4 4 7.1325 4 11C4 14.8675 7.1325 18 11 18C12.8956 18 14.6146 17.2475 15.8748 16.0247L16.0247 15.8748Z"></path>
            </svg>
          </Link>

          {/* Desktop User Section */}
          <div className="hidden lg:block">
            {user ? (
              <div className="relative flex items-center" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 focus:outline-none cursor-pointer group"
                >
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                    alt={user.name}
                    className="w-7 h-7 md:w-8 h-8 rounded-lg object-cover border border-white/20 group-hover:border-yellow-400 transition"
                  />
                  <span className="hidden md:block text-xs font-semibold max-w-[80px] truncate text-gray-200 group-hover:text-white">{user.name}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M11.9997 13.1714L16.9495 8.22168L18.3637 9.63589L11.9997 15.9999L5.63574 9.63589L7.04996 8.22168L11.9997 13.1714Z"></path>
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2.5 w-48 rounded-xl bg-zinc-950/95 border border-white/10 shadow-2xl backdrop-blur-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-white/5 mb-1.5">
                      <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-400">
                        <path d="M12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2ZM12 20C16.42 20 20 16.42 20 12C20 7.58 16.42 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20ZM12.5 7V12.25L17 14.92L16.25 16.15L11 13V7H12.5Z" />
                      </svg>
                      My Profile
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                        navigate("/profile");
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 transition text-left cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400/80">
                        <path d="M5 11H13V13H5V16L1 12L5 8V11ZM19 3H9C7.89543 3 7 3.89543 7 5V9H9V5H19V19H9V15H7V19C7 20.1046 7.89543 21 9 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" />
                      </svg>
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="gradient-btn text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition transform active:scale-95 hover:scale-102 hover:shadow-blue-500/10 text-white"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Staggered Hamburger Menu (Visible under 1024px / lg) */}
          <div className="lg:hidden flex items-center">
            <StaggeredMenu
              items={menuItems}
              socialItems={socialItems}
              displaySocials={true}
              displayItemNumbering={true}
              accentColor="#e52e71"
              colors={["rgba(229, 46, 113, 0.2)", "rgba(33, 125, 245, 0.2)", "rgba(10, 10, 10, 0.98)"]}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Nav;
