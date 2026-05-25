import React, { useState, useEffect, useRef } from "react";
import SkeletonRow from "./SkeletonRow";
import MediaSlider from "./MediaSlider";
import { useAuth } from "../context/AuthContext";

const LazyMediaRow = ({ 
  title, 
  fetchFn, 
  type = "movie", 
  viewMoreLink, 
  isAuthRequired = false,
  isDynamic = false // for dynamic titles like "Because You Watched: X"
}) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [dynamicTitle, setDynamicTitle] = useState(title);
  const [loading, setLoading] = useState(true);
  const [hasIntersected, setHasIntersected] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);
  
  const containerRef = useRef(null);

  // If authentication is required and user is not logged in, do not render personalized row
  useEffect(() => {
    if (isAuthRequired && !user) {
      setShouldRender(false);
    } else {
      setShouldRender(true);
    }
  }, [user, isAuthRequired]);

  useEffect(() => {
    if (!shouldRender || hasIntersected) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setHasIntersected(true);
          observer.disconnect(); // Only trigger once
        }
      },
      {
        root: null, // viewport
        rootMargin: "200px", // prefetch 200px before scrolling into view
        threshold: 0.05
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasIntersected, shouldRender]);

  // Fetch data once row has intersected
  useEffect(() => {
    if (!hasIntersected || !shouldRender) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchFn();
        
        // Handle normal array lists and custom response objects (e.g. Because You Watched has sourceTitle/results)
        if (isDynamic && data && data.results) {
          setDynamicTitle(`${title}: ${data.sourceTitle}`);
          setItems(data.results || []);
        } else if (data && data.results) {
          setItems(data.results || []);
        } else if (Array.isArray(data)) {
          setItems(data);
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error(`Error loading data for row "${title}":`, err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [hasIntersected, fetchFn, shouldRender, title, isDynamic]);

  if (!shouldRender) return null;

  // Render a skeleton placeholder of exact height to prevent CLS (Cumulative Layout Shift)
  if (!hasIntersected) {
    return (
      <div ref={containerRef} className="w-full min-h-[290px] md:min-h-[350px] bg-black">
        <SkeletonRow title={title} />
      </div>
    );
  }

  if (loading) {
    return <SkeletonRow title={dynamicTitle} />;
  }

  // If no items returned, don't display empty row
  if (!items || items.length === 0) return null;

  return (
    <div className="w-full">
      <MediaSlider 
        title={dynamicTitle} 
        items={items} 
        type={type} 
        viewMoreLink={viewMoreLink} 
      />
    </div>
  );
};

export default React.memo(LazyMediaRow);
