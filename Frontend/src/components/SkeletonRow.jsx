import React from "react";

const SkeletonCard = () => {
  return (
    <div className="w-[180px] shrink-0 rounded-xl overflow-hidden bg-zinc-900 border border-white/5 shadow-md flex flex-col gap-2">
      {/* Aspect Ratio 2/3 Image area */}
      <div className="w-full aspect-[2/3] bg-zinc-800 animate-pulse relative overflow-hidden">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
      </div>
    </div>
  );
};

const SkeletonRow = ({ title }) => {
  // Render 6 cards as placeholders
  const placeholders = Array.from({ length: 6 });

  return (
    <div className="flex bg-black p-6 md:p-10 px-8 md:px-12 text-white flex-col font-[Inter] w-full select-none">
      {/* Header Placeholder */}
      <div className="flex items-center justify-between mb-4">
        {title ? (
          <h2 className="text-xl md:text-2xl font-semibold tracking-wide border-l-4 border-zinc-800 pl-3 text-zinc-500 animate-pulse">
            {title}
          </h2>
        ) : (
          <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse"></div>
        )}
      </div>

      {/* Cards Scrollable Row */}
      <div className="flex gap-4 overflow-hidden py-2 no-scrollbar">
        {placeholders.map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
};

export default SkeletonRow;
export { SkeletonCard };
