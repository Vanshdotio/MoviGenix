import { SEO_CONFIG } from "./seo.config";
import { getImageUrl } from "./seo.utils";

/**
 * Generates Movie JSON-LD structured data.
 */
export const generateMovieJsonLd = (movie, credits) => {
  if (!movie) return null;

  const title = movie.title || movie.name;
  const description = movie.overview || movie.tagline || "";
  const releaseDate = movie.release_date || "";
  const imageUrl = movie.poster_path ? getImageUrl(movie.poster_path, "w500") : SEO_CONFIG.DEFAULT_OG_IMAGE;
  const genres = movie.genres ? movie.genres.map(g => g.name) : [];
  const duration = movie.runtime ? `PT${movie.runtime}M` : null;

  // Find directors
  const directors = credits?.crew 
    ? credits.crew.filter(c => c.job === "Director").map(d => ({
        "@type": "Person",
        "name": d.name
      }))
    : [];

  // Find actors
  const actors = credits?.cast
    ? credits.cast.slice(0, 10).map(a => ({
        "@type": "Person",
        "name": a.name
      }))
    : [];

  const schema = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": title,
    "description": description,
    "image": imageUrl,
    "dateCreated": releaseDate,
    "genre": genres,
    "actor": actors
  };

  if (releaseDate) {
    schema.datePublished = releaseDate;
  }

  if (directors.length > 0) {
    schema.director = directors;
  }

  if (duration) {
    schema.duration = duration;
  }

  if (movie.vote_average && movie.vote_count) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "bestRating": "10",
      "worstRating": "1",
      "ratingValue": movie.vote_average.toFixed(1),
      "ratingCount": String(movie.vote_count)
    };
  }

  return schema;
};

/**
 * Generates TVSeries JSON-LD structured data (for TV Shows, Anime, Cartoons, Web Series).
 */
export const generateTVSeriesJsonLd = (show, credits) => {
  if (!show) return null;

  const name = show.name || show.title;
  const description = show.overview || show.tagline || "";
  const releaseDate = show.first_air_date || "";
  const imageUrl = show.poster_path ? getImageUrl(show.poster_path, "w500") : SEO_CONFIG.DEFAULT_OG_IMAGE;
  const genres = show.genres ? show.genres.map(g => g.name) : [];

  const actors = credits?.cast
    ? credits.cast.slice(0, 10).map(a => ({
        "@type": "Person",
        "name": a.name
      }))
    : [];

  const schema = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    "name": name,
    "description": description,
    "image": imageUrl,
    "genre": genres,
    "actor": actors
  };

  if (releaseDate) {
    schema.startDate = releaseDate;
  }

  if (show.number_of_seasons) {
    schema.numberOfSeasons = String(show.number_of_seasons);
  }

  if (show.number_of_episodes) {
    schema.numberOfEpisodes = String(show.number_of_episodes);
  }

  if (show.vote_average && show.vote_count) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "bestRating": "10",
      "worstRating": "1",
      "ratingValue": show.vote_average.toFixed(1),
      "ratingCount": String(show.vote_count)
    };
  }

  return schema;
};

/**
 * Generates Person JSON-LD structured data.
 */
export const generatePersonJsonLd = (person, credits) => {
  if (!person) return null;

  const name = person.name;
  const biography = person.biography || "";
  const imageUrl = person.profile_path ? getImageUrl(person.profile_path, "h632") : SEO_CONFIG.DEFAULT_OG_IMAGE;
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": name,
    "image": imageUrl,
    "description": biography,
    "url": `${SEO_CONFIG.SITE_URL}/person/${person.id}`
  };

  if (person.birthday) {
    schema.birthDate = person.birthday;
  }
  
  if (person.place_of_birth) {
    schema.birthPlace = {
      "@type": "Place",
      "name": person.place_of_birth
    };
  }

  if (person.known_for_department) {
    schema.jobTitle = person.known_for_department;
  }

  return schema;
};

/**
 * Generates BreadcrumbList JSON-LD structured data.
 * items is an array of objects: { name: 'Item name', path: '/relative-path' }
 */
export const generateBreadcrumbJsonLd = (items) => {
  if (!items || items.length === 0) return null;

  const itemListElement = items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": `${SEO_CONFIG.SITE_URL}${item.path}`
  }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": itemListElement
  };
};

/**
 * Generates WebSite JSON-LD (with Sitelinks Search Box capability).
 */
export const generateWebsiteJsonLd = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SEO_CONFIG.SITE_NAME,
    "url": SEO_CONFIG.SITE_URL,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SEO_CONFIG.SITE_URL}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
};

/**
 * Generates Organization JSON-LD.
 */
export const generateOrganizationJsonLd = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": SEO_CONFIG.SITE_NAME,
    "url": SEO_CONFIG.SITE_URL,
    "logo": `${SEO_CONFIG.SITE_URL}/assets/movigenix-m-logo.png`,
    "sameAs": [
      `https://twitter.com/${SEO_CONFIG.TWITTER_HANDLE.replace("@", "")}`
    ]
  };
};
