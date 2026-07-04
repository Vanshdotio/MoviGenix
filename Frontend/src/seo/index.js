export { SEO_CONFIG } from "./seo.config";
export {
  generateSlug,
  extractIdFromSlug,
  getCanonicalUrl,
  getImageUrl,
  truncateDescription,
  generateMovieKeywords,
  generateTVKeywords,
  generatePersonKeywords,
  formatReleaseYear
} from "./seo.utils";
export {
  generateMovieJsonLd,
  generateTVSeriesJsonLd,
  generatePersonJsonLd,
  generateBreadcrumbJsonLd,
  generateWebsiteJsonLd,
  generateOrganizationJsonLd
} from "./jsonld.utils";
export { default as SEOHead } from "./SEOHead";
