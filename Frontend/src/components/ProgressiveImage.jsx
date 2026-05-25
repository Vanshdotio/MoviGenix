import React, { useState, useEffect } from "react";

const ProgressiveImage = ({ 
  lowResSrc, 
  highResSrc, 
  srcSet, 
  sizes, 
  alt, 
  className,
  loading = "lazy"
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
    <img
      src={currentSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={loading}
      className={`${className} transition-all duration-700 ease-out ${
        isBlurry ? "blur-md scale-105" : "blur-0 scale-100"
      }`}
      style={{ backfaceVisibility: "hidden" }} // Optimizes hardware acceleration
    />
  );
};

export default ProgressiveImage;
