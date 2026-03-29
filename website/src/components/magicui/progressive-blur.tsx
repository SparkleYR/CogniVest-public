"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ProgressiveBlurProps {
  className?: string;
  position?: "top" | "bottom";
}

const blurLayers = [
  { blur: 1, opacity: "0 25%" },
  { blur: 1.5, opacity: "25% 50%" },
  { blur: 2, opacity: "50% 75%" },
  { blur: 2.5, opacity: "75% 100%" },
];

export const ProgressiveBlur = React.memo(function ProgressiveBlur({
  className,
  position = "bottom",
}: ProgressiveBlurProps) {
  const direction = position === "top" ? "to top" : "to bottom";
  const gradientDirClass =
    position === "top" ? "bg-gradient-to-t" : "bg-gradient-to-b";

  return (
    <div
      className={cn(
        "pointer-events-none z-20 relative",
        position === "top" ? "top-0" : "bottom-0",
        className
      )}
      style={{
        height: "100px",
        willChange: "auto",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
      }}
    >
      {blurLayers.map((layer, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${layer.blur}px)`,
            WebkitBackdropFilter: `blur(${layer.blur}px)`,
            maskImage: `linear-gradient(${direction}, transparent ${
              layer.opacity.split(" ")[0]
            }, black ${layer.opacity.split(" ")[1]})`,
            WebkitMaskImage: `linear-gradient(${direction}, transparent ${
              layer.opacity.split(" ")[0]
            }, black ${layer.opacity.split(" ")[1]})`,
          }}
        />
      ))}

      {/* Safari fallback: solid gradient overlay when backdrop-filter not supported */}
      <div
        className="absolute inset-0 hidden supports-[not-(backdrop-filter:blur(1px))]:block"
        style={{
          background:
            position === "top"
              ? "linear-gradient(to top, transparent 0%, var(--background) 100%)"
              : "linear-gradient(to bottom, transparent 0%, var(--background) 100%)",
        }}
      />

      {/* Opacity overlay: matches blur height and direction. Exists only in dark mode with a black mask. */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 pointer-events-none",
          gradientDirClass,
          // transparent in light mode, black mask in dark mode
          "from-transparent dark:to-black/95 GitHub Integration"
        )}
      />
    </div>
  );
});

export default ProgressiveBlur;
