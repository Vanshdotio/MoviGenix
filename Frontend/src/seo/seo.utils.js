import { SEO_CONFIG } from "./seo.config";

/**
 * Generates a clean URL slug from a title.
 * Example: "Interstellar" -> "interstellar"
 * Example: "K.G.F: Chapter 2" -> "kgf-chapter-2"
 */
export const generateSlug = (title, id) => {
  if (!title) return id ? String(id) : "";
  
  const cleanTitle = String(title)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove non-word chars except spaces/hyphens
    .replace(/[\s_]+/g, "-") // replace spaces/underscores with hyphens
    .replace(/-+/g, "-")    // collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
    
  return cleanTitle || (id ? String(id) : "");
};

/**
 * Returns the slug directly (backend resolves slugs to IDs).
 */
export const extractIdFromSlug = (slug) => {
  return slug || "";
};

/**
 * Generates a full canonical URL.
 */
export const getCanonicalUrl = (pathname) => {
  return `${SEO_CONFIG.SITE_URL}${pathname || ""}`;
};

/**
 * Generates a TMDB image URL.
 */
export const getImageUrl = (path, size = "w500") => {
  if (!path) return SEO_CONFIG.DEFAULT_OG_IMAGE;
  return `${SEO_CONFIG.TMDB_IMAGE_BASE}/${size}${path}`;
};

/**
 * Helper to truncate meta descriptions to 160 characters.
 */
export const truncateDescription = (text, maxLength = 160) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

/**
 * Auto-generates SEO keywords for a movie.
 */
export const generateMovieKeywords = (movie, credits) => {
  const keywords = [];
  
  if (movie) {
    if (movie.title) {
      keywords.push(movie.title);
      keywords.push(`${movie.title} Movie`);
      keywords.push(`watch ${movie.title}`);
    }
    if (movie.genres && Array.isArray(movie.genres)) {
      movie.genres.forEach(g => keywords.push(g.name));
    }
  }
  
  if (credits && credits.crew) {
    const directors = credits.crew.filter(c => c.job === "Director");
    directors.forEach(d => keywords.push(d.name));
  }
  
  if (credits && credits.cast) {
    credits.cast.slice(0, 3).forEach(actor => keywords.push(actor.name));
  }
  
  // Add defaults
  keywords.push("Movie Recommendation", "Watch Movies");
  
  // Return unique comma-separated string
  return [...new Set(keywords)].join(", ");
};

/**
 * Auto-generates SEO keywords for a TV Show / Anime / Cartoon.
 */
export const generateTVKeywords = (show, credits, categoryLabel = "TV Show") => {
  const keywords = [];
  
  if (show) {
    const title = show.name || show.title;
    if (title) {
      keywords.push(title);
      keywords.push(`${title} ${categoryLabel}`);
      keywords.push(`watch ${title}`);
    }
    if (show.genres && Array.isArray(show.genres)) {
      show.genres.forEach(g => keywords.push(g.name));
    }
  }
  
  if (credits && credits.cast) {
    credits.cast.slice(0, 3).forEach(actor => keywords.push(actor.name));
  }
  
  keywords.push(`${categoryLabel} Recommendation`, `Watch ${categoryLabel}s`);
  
  return [...new Set(keywords)].join(", ");
};

/**
 * Auto-generates SEO keywords for a person.
 */
export const generatePersonKeywords = (person, credits) => {
  const keywords = [];
  if (person && person.name) {
    keywords.push(person.name);
    keywords.push(`${person.name} Movies`);
    keywords.push(`${person.name} Biography`);
    keywords.push(`${person.name} Filmography`);
  }
  keywords.push("Actor Biography", "Celebrity Filmography");
  return [...new Set(keywords)].join(", ");
};

/**
 * Formats release year from date string.
 */
export const formatReleaseYear = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getFullYear())) {
      return `(${date.getFullYear()})`;
    }
  } catch (e) {
    // Ignore error
  }
  return "";
};
