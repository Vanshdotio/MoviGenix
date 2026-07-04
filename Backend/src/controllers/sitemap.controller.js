const axios = require("axios");

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const SITE_URL = "https://movigenix.vercel.app";

// Helper to generate slug matching frontend
const generateSlug = (title, id) => {
  if (!title) return id ? String(id) : "";
  
  const cleanTitle = String(title)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
    
  return cleanTitle || (id ? String(id) : "");
};

// Sitemap cache
let sitemapCache = null;
let sitemapCacheTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const getSitemap = async (req, res) => {
  try {
    const now = Date.now();
    if (sitemapCache && now - sitemapCacheTime < CACHE_DURATION) {
      res.header("Content-Type", "application/xml");
      return res.status(200).send(sitemapCache);
    }

    const apiKey = process.env.TMDB_API_KEY;
    let popularMoviesRes = { status: "rejected" };
    let trendingMoviesRes = { status: "rejected" };
    let popularTvRes = { status: "rejected" };
    let trendingTvRes = { status: "rejected" };
    let popularPeopleRes = { status: "rejected" };
    let movieGenresRes = { status: "rejected" };
    let tvGenresRes = { status: "rejected" };

    if (apiKey) {
      const params = { api_key: apiKey, language: "en-US" };
      const fetched = await Promise.allSettled([
        axios.get(`${TMDB_BASE_URL}/movie/popular`, { params: { ...params, page: 1 } }),
        axios.get(`${TMDB_BASE_URL}/trending/movie/week`, { params }),
        axios.get(`${TMDB_BASE_URL}/tv/popular`, { params: { ...params, page: 1 } }),
        axios.get(`${TMDB_BASE_URL}/trending/tv/week`, { params }),
        axios.get(`${TMDB_BASE_URL}/person/popular`, { params: { ...params, page: 1 } }),
        axios.get(`${TMDB_BASE_URL}/genre/movie/list`, { params }),
        axios.get(`${TMDB_BASE_URL}/genre/tv/list`, { params })
      ]);
      popularMoviesRes = fetched[0];
      trendingMoviesRes = fetched[1];
      popularTvRes = fetched[2];
      trendingTvRes = fetched[3];
      popularPeopleRes = fetched[4];
      movieGenresRes = fetched[5];
      tvGenresRes = fetched[6];
    } else {
      console.warn("TMDB_API_KEY is not defined. Sitemap will only contain static pages.");
    }

    const urls = [];

    // 1. Add static landing pages
    const staticPages = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/movies", priority: "0.9", changefreq: "daily" },
      { path: "/tv", priority: "0.9", changefreq: "daily" },
      { path: "/anime", priority: "0.9", changefreq: "daily" },
      { path: "/cartoon", priority: "0.9", changefreq: "daily" },
      { path: "/web-series", priority: "0.9", changefreq: "daily" },
      { path: "/explore", priority: "0.7", changefreq: "weekly" }
    ];

    staticPages.forEach(p => {
      urls.push(`  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`);
    });

    // 2. Add movie details pages
    const movies = new Map();
    if (popularMoviesRes.status === "fulfilled") {
      popularMoviesRes.value.data.results.forEach(m => movies.set(m.id, m));
    }
    if (trendingMoviesRes.status === "fulfilled") {
      trendingMoviesRes.value.data.results.forEach(m => movies.set(m.id, m));
    }

    movies.forEach(movie => {
      const slug = generateSlug(movie.title, movie.id);
      urls.push(`  <url>
    <loc>${SITE_URL}/movie/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    });

    // 3. Add TV Show details pages
    const tvShows = new Map();
    if (popularTvRes.status === "fulfilled") {
      popularTvRes.value.data.results.forEach(t => tvShows.set(t.id, t));
    }
    if (trendingTvRes.status === "fulfilled") {
      trendingTvRes.value.data.results.forEach(t => tvShows.set(t.id, t));
    }

    tvShows.forEach(show => {
      const slug = generateSlug(show.name, show.id);
      urls.push(`  <url>
    <loc>${SITE_URL}/tv/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    });

    // 4. Add popular people pages
    if (popularPeopleRes.status === "fulfilled") {
      popularPeopleRes.value.data.results.forEach(person => {
        const slug = generateSlug(person.name, person.id);
        urls.push(`  <url>
    <loc>${SITE_URL}/person/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
      });
    }

    // 5. Add genre section pages
    if (movieGenresRes.status === "fulfilled") {
      movieGenresRes.value.data.genres.forEach(g => {
        urls.push(`  <url>
    <loc>${SITE_URL}/movies/popular?genre=${g.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
      });
    }
    if (tvGenresRes.status === "fulfilled") {
      tvGenresRes.value.data.genres.forEach(g => {
        urls.push(`  <url>
    <loc>${SITE_URL}/tv/popular?genre=${g.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
      });
    }

    // Build sitemap XML
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    // Save to cache
    sitemapCache = sitemapXml;
    sitemapCacheTime = now;

    res.header("Content-Type", "application/xml");
    res.status(200).send(sitemapXml);
  } catch (error) {
    console.error("Error generating sitemap:", error.message);
    res.status(500).send("Error generating sitemap");
  }
};

module.exports = {
  getSitemap
};
