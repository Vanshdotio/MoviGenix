import React, { useState, useEffect } from "react";

const ProgressiveImage = ({ 
  lowResSrc, 
  highResSrc, 
  srcSet, 
  sizes, 
  alt, 
  className,
  loading = "lazy",
  width,
  height
}) => {
  const [currentSrc, setCurrentSrc] = useState(lowResSrc);
  const [isBlurry, setIsBlurry] = useState(true);

  useEffect(() => {
    // Reset state when sources change
    setCurrentSrc(lowResSrc);
    setIsBlurry(true);

    const img = new Image();
    img.src = highResSrc;
    if (srcSet) img.srcset = srcSet;
    if (sizes) img.sizes = sizes;

    img.onload = () => {
      setCurrentSrc(highResSrc);
      setIsBlurry(false);
    };
  }, [lowResSrc, highResSrc, srcSet, sizes]);

  return (
    <div className={`relative overflow-hidden ${className || ""}`}>
      {/* Low-res static thumbnail (only shown while loading) */}
      {isBlurry && (
        <img
          src={lowResSrc}
          alt={alt}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-105"
          style={{ backfaceVisibility: "hidden" }}
        />
      )}
      {/* High-res image */}
      <img
        src={currentSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={loading}
        width={width}
        height={height}
        className={`w-full h-full object-cover transition-opacity duration-500 ease-out ${
          isBlurry ? "opacity-0" : "opacity-100"
        }`}
        style={{ backfaceVisibility: "hidden" }} // Optimizes hardware acceleration
      />
    </div>
  );
};

export default ProgressiveImage;
