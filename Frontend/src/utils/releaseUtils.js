/**
 * releaseUtils.js
 * Shared utility for release-date-aware content gating in MoviGenix.
 * Used by MovieCard, HeroSlider, DetailsPage, player guard, and UpcomingPage.
 */

/**
 * Returns true if the content has not been released yet.
 * Compares release_date or first_air_date against today (midnight local time).
 * Content with no date is treated as released.
 * @param {object} item - TMDB media item or any object with release_date / first_air_date
 * @returns {boolean}
 */
export function isUpcomingContent(item) {
  if (!item) return false;
  const dateStr = item.release_date || item.first_air_date;
  if (!dateStr) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const releaseDate = new Date(dateStr);
  releaseDate.setHours(0, 0, 0, 0);

  return releaseDate > today;
}

/**
 * Returns the number of days until release (positive integer).
 * Returns 0 if already released or no date.
 * @param {object} item
 * @returns {number}
 */
export function getCountdownDays(item) {
  if (!item) return 0;
  const dateStr = item.release_date || item.first_air_date;
  if (!dateStr) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const releaseDate = new Date(dateStr);
  releaseDate.setHours(0, 0, 0, 0);

  const diffMs = releaseDate - today;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formats a date string to a human-readable form.
 * e.g. "2027-06-15" → "June 15, 2027"
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string}
 */
export function formatReleaseDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Returns a short countdown label string.
 * e.g. "Releases in 24 days" / "Releases in 1 day" / "Releasing today"
 * @param {object} item
 * @returns {string}
 */
export function getCountdownLabel(item) {
  const days = getCountdownDays(item);
  if (days === 0) return "Releasing today";
  if (days === 1) return "Releases in 1 day";
  return `Releases in ${days} days`;
}
