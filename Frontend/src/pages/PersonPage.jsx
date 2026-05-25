import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getPersonDetails } from "../services/api";
import Loader from "../components/Loader";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode } from "swiper/modules";

const PersonPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  useEffect(() => {
    const fetchPerson = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPersonDetails(id);
        setPerson(data);
      } catch (err) {
        console.error("Error fetching person details:", err);
        setError("Failed to load actor details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPerson();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-4">
        <p className="text-xl text-red-500 mb-4">{error || "Actor not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-yellow-400 hover:bg-yellow-300 text-black px-6 py-2 rounded-lg font-bold transition duration-200 cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Biography logic
  const bio = person.biography || "No biography available for this person.";
  const shouldTruncateBio = bio.length > 500;
  const displayedBio = isBioExpanded || !shouldTruncateBio ? bio : `${bio.slice(0, 500)}...`;

  // Profile image URL
  const profileUrl = person.profile_path
    ? `https://image.tmdb.org/t/p/h632${person.profile_path}`
    : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=500&q=80";

  // Gallery images
  const gallery = person.images?.profiles || [];

  // Combined credits
  const castCredits = person.combined_credits?.cast || [];

  // Sort credits by popularity for the "Known For" section
  const popularCredits = [...castCredits]
    .filter((c) => c.poster_path)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 8);

  // Group filmography credits by year for timeline/complete list
  const filmography = [...castCredits]
    .map((c) => {
      const dateStr = c.release_date || c.first_air_date || "";
      const year = dateStr ? parseInt(dateStr.slice(0, 4)) : null;
      return {
        ...c,
        year,
        displayDate: dateStr ? new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "TBA",
      };
    })
    // Sort by year descending, and then by popularity descending
    .sort((a, b) => {
      if (a.year === null) return -1;
      if (b.year === null) return 1;
      if (b.year !== a.year) return b.year - a.year;
      return (b.popularity || 0) - (a.popularity || 0);
    });

  return (
    <div className="min-h-screen bg-black text-white pb-20 font-[Inter] pt-24">
      {/* Back Button */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M7.82843 10.9999H20V12.9999H7.82843L13.1924 18.3638L11.7782 19.778L4 11.9999L11.7782 4.22168L13.1924 5.63589L7.82843 10.9999Z"></path>
          </svg>
          <span>Back</span>
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left Column: Image & Stats */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-gray-950">
            <img
              src={profileUrl}
              alt={person.name}
              width={280}
              height={420}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Actor Info Checklist */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 space-y-4 text-sm">
            <h3 className="text-gray-400 uppercase font-bold text-xs tracking-wider mb-2 border-b border-gray-800 pb-2">
              Personal Info
            </h3>

            <div>
              <p className="text-gray-400 text-xs">Known For</p>
              <p className="font-semibold text-gray-200 mt-0.5">
                {person.known_for_department || "Acting"}
              </p>
            </div>

            {person.birthday && (
              <div>
                <p className="text-gray-400 text-xs">Birthday</p>
                <p className="font-semibold text-gray-200 mt-0.5">
                  {new Date(person.birthday).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}

            {person.place_of_birth && (
              <div>
                <p className="text-gray-400 text-xs">Place of Birth</p>
                <p className="font-semibold text-gray-200 mt-0.5">
                  {person.place_of_birth}
                </p>
              </div>
            )}

            {person.deathday && (
              <div>
                <p className="text-gray-400 text-xs">Passed Away</p>
                <p className="font-semibold text-gray-200 mt-0.5">
                  {new Date(person.deathday).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bio & Credits */}
        <div className="col-span-1 md:col-span-3 flex flex-col gap-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
              {person.name}
            </h1>

            <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-sm md:text-base">
              <h3 className="text-gray-400 uppercase font-bold text-xs tracking-wider mb-2">
                Biography
              </h3>
              <p className="whitespace-pre-line">{displayedBio}</p>
              {shouldTruncateBio && (
                <button
                  onClick={() => setIsBioExpanded(!isBioExpanded)}
                  className="text-yellow-400 hover:text-yellow-300 font-semibold mt-2 focus:outline-none transition cursor-pointer"
                >
                  {isBioExpanded ? "Read Less ▲" : "Read More ▼"}
                </button>
              )}
            </div>
          </div>

          {/* Additional Photos / Gallery */}
          {gallery.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 border-l-4 border-yellow-400 pl-3">
                Photos Gallery
              </h2>
              <div className="select-none py-2">
                <Swiper
                  modules={[FreeMode]}
                  freeMode={true}
                  grabCursor={true}
                  spaceBetween={16}
                  slidesPerView={"auto"}
                  className="mySwiper"
                >
                  {gallery.map((img, i) => (
                    <SwiperSlide key={i} style={{ width: "117px" }}>
                      <div className="h-44 aspect-[2/3] rounded-lg overflow-hidden border border-white/5 bg-gray-950 shadow-md hover:border-yellow-400/40 transition duration-300">
                        <img
                          src={`https://image.tmdb.org/t/p/w300${img.file_path}`}
                          alt={`${person.name} photo ${i}`}
                          width={117}
                          height={176}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>
          )}

          {/* Known For Section */}
          {popularCredits.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 border-l-4 border-yellow-400 pl-3">
                Popular Works
              </h2>
              <div className="select-none py-2">
                <Swiper
                  modules={[FreeMode]}
                  freeMode={true}
                  grabCursor={true}
                  spaceBetween={24}
                  slidesPerView={"auto"}
                  className="mySwiper"
                >
                  {popularCredits.map((item) => {
                    const mediaType = item.media_type || "movie";
                    const title = item.title || item.name || "Untitled";
                    const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
                    const poster = `https://image.tmdb.org/t/p/w300${item.poster_path}`;

                    return (
                      <SwiperSlide key={`${item.id}-${mediaType}`} style={{ width: "144px" }}>
                        <Link
                          to={`/${mediaType}/${item.id}`}
                          className="group flex flex-col gap-2 cursor-pointer"
                        >
                          <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/15 bg-gray-950 shadow-md relative">
                            <img
                              src={poster}
                              alt={title}
                              width={144}
                              height={216}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              loading="lazy"
                            />
                            <span className="absolute top-1.5 right-1.5 bg-black/80 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded font-bold backdrop-blur-sm">
                              ★ {rating}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-gray-200 truncate group-hover:text-yellow-400 transition">
                            {title}
                          </p>
                        </Link>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>
            </div>
          )}

          {/* Filmography timeline */}
          {filmography.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 border-l-4 border-yellow-400 pl-3">
                Full Filmography
              </h2>
              <div className="border border-gray-800/80 rounded-xl overflow-hidden bg-gray-900/30 backdrop-blur-md">
                <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                  {filmography.map((item, index) => {
                    const mediaType = item.media_type || "movie";
                    const title = item.title || item.name || "Untitled";
                    const character = item.character ? `as ${item.character}` : "";
                    const yearLabel = item.year || "—";

                    return (
                      <div
                        key={`${item.credit_id || item.id}-${index}`}
                        className="flex items-center gap-4 px-5 py-4 border-b border-gray-800/50 hover:bg-white/5 transition duration-200"
                      >
                        {/* Year */}
                        <div className="w-14 shrink-0 text-yellow-400 font-mono font-bold text-sm">
                          {yearLabel}
                        </div>

                        {/* Dot */}
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-700 shrink-0 relative">
                          <div className="absolute inset-0 bg-yellow-400 rounded-full scale-0 group-hover:scale-100 transition duration-200"></div>
                        </div>

                        {/* Title & Character Link */}
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/${mediaType}/${item.id}`}
                            className="font-semibold text-gray-200 hover:text-yellow-400 transition text-sm md:text-base block truncate"
                          >
                            {title}
                          </Link>
                          {character && (
                            <p className="text-xs text-gray-400 truncate mt-0.5 italic">
                              {character}
                            </p>
                          )}
                        </div>

                        {/* Media Type Badge */}
                        <div className="shrink-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-gray-800 text-gray-400 rounded border border-gray-700">
                            {mediaType}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonPage;
