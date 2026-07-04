import React from "react";
import { Helmet } from "react-helmet-async";
import { SEO_CONFIG } from "./seo.config";
import { getCanonicalUrl } from "./seo.utils";

/**
 * Reusable Helmet-based SEO Head component.
 */
const SEOHead = ({
  title,
  description,
  keywords,
  canonicalPath,
  ogType = "website",
  ogImage,
  jsonLd,
  noIndex = false
}) => {
  const metaTitle = title 
    ? `${title} | ${SEO_CONFIG.SITE_NAME}` 
    : SEO_CONFIG.DEFAULT_META.title;
    
  const metaDesc = description || SEO_CONFIG.DEFAULT_META.description;
  const metaKeywords = keywords || SEO_CONFIG.DEFAULT_META.keywords;
  const canonicalUrl = getCanonicalUrl(canonicalPath);
  const metaOgImage = ogImage || SEO_CONFIG.DEFAULT_OG_IMAGE;
  
  return (
    <Helmet>
      {/* Basic Title & Meta */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDesc} />
      <meta name="keywords" content={metaKeywords} />
      
      {/* Robots Directive */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph Tags */}
      <meta property="og:site_name" content={SEO_CONFIG.SITE_NAME} />
      <meta property="og:title" content={title || SEO_CONFIG.SITE_NAME} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:image" content={metaOgImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      
      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || SEO_CONFIG.SITE_NAME} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={metaOgImage} />
      {SEO_CONFIG.TWITTER_HANDLE && (
        <meta name="twitter:site" content={SEO_CONFIG.TWITTER_HANDLE} />
      )}
      
      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
