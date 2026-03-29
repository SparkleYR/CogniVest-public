"use client";

import { useEffect } from "react";
import { BlurFade } from "@/components/magicui/blur-fade";
import {
  DynamicContainer,
  DynamicIsland,
  DynamicIslandProvider,
  DynamicTitle,
  useDynamicIslandSize,
  useScheduledAnimations,
} from "@/components/ui/dynamic-island";

interface ThemeSwitchIslandProps {
  isTogglingToDark: boolean;
  onComplete: () => void;
}

const ThemeSwitchIslandContent = ({
  isTogglingToDark,
  onComplete,
}: ThemeSwitchIslandProps) => {
  const { state, setSize } = useDynamicIslandSize();

  // Schedule animations: default -> long (show message)
  useScheduledAnimations([
    { size: "default", delay: 0 },
    { size: "long", delay: 100 },
  ]);

  useEffect(() => {
    // Consistent timing: island shows for 1400ms total (matching the theme transition)
    const timer = setTimeout(() => {
      setSize("empty");
      setTimeout(onComplete, 300);
    }, 1400);

    return () => clearTimeout(timer);
  }, [setSize, onComplete]);

  // Theme switching state
  const renderThemeSwitchState = () => (
    <DynamicContainer className="flex items-center justify-center h-full w-full">
      <div className="relative flex w-full items-center justify-center gap-3 px-4">
        {/* Animated Sun/Moon Transformation */}
        <BlurFade delay={0.1} inView>
          <div className="relative w-[44px] h-[44px] flex items-center justify-center flex-shrink-0">
            {/* Sun/Moon Circle */}
            <div
              className="relative rounded-full transition-all duration-500 ease-in-out"
              style={{
                width: "44px",
                height: "44px",
                backgroundColor: isTogglingToDark ? "#ffe5b5" : "#ffcf96",
                transform: isTogglingToDark ? "rotate(0deg)" : "rotate(-45deg)",
              }}
            >
              {/* Craters (visible in dark mode - moon) */}
              <span
                className="absolute rounded-full transition-all duration-300"
                style={{
                  top: "12px",
                  left: "8px",
                  width: "4px",
                  height: "4px",
                  backgroundColor: "#e8cda5",
                  opacity: isTogglingToDark ? 1 : 0,
                  transform: isTogglingToDark ? "scale(1)" : "scale(0)",
                }}
              />
              <span
                className="absolute rounded-full transition-all duration-300"
                style={{
                  top: "22px",
                  left: "20px",
                  width: "6px",
                  height: "6px",
                  backgroundColor: "#e8cda5",
                  opacity: isTogglingToDark ? 1 : 0,
                  transform: isTogglingToDark ? "scale(1)" : "scale(0)",
                  transitionDelay: "50ms",
                }}
              />
              <span
                className="absolute rounded-full transition-all duration-300"
                style={{
                  top: "8px",
                  left: "26px",
                  width: "5px",
                  height: "5px",
                  backgroundColor: "#e8cda5",
                  opacity: isTogglingToDark ? 1 : 0,
                  transform: isTogglingToDark ? "scale(1)" : "scale(0)",
                  transitionDelay: "100ms",
                }}
              />
            </div>

            {/* Sun Rays (visible in light mode) */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => (
              <div
                key={angle}
                className="absolute transition-all duration-500"
                style={{
                  width: "3px",
                  height: "8px",
                  backgroundColor: "#ffcf96",
                  borderRadius: "2px",
                  opacity: isTogglingToDark ? 0 : 1,
                  transform: `rotate(${angle}deg) translateY(-26px) scale(${
                    isTogglingToDark ? 0.5 : 1
                  })`,
                  transformOrigin: "center",
                  transitionDelay: `${index * 30}ms`,
                }}
              />
            ))}
          </div>
        </BlurFade>

        {/* Text */}
        <BlurFade delay={0.15} inView>
          <DynamicTitle className="my-auto text-lg font-bold tracking-tight text-white">
            Switching theme
          </DynamicTitle>
        </BlurFade>
      </div>
    </DynamicContainer>
  );

  // Render based on current size
  const renderState = () => {
    switch (state.size) {
      case "default":
      case "long":
        return renderThemeSwitchState();
      default:
        return null;
    }
  };

  return (
    <DynamicIsland id="theme-switch-island">{renderState()}</DynamicIsland>
  );
};

export function ThemeSwitchIsland({
  isTogglingToDark,
  onComplete,
}: ThemeSwitchIslandProps) {
  return (
    <DynamicIslandProvider initialSize="default">
      <ThemeSwitchIslandContent
        isTogglingToDark={isTogglingToDark}
        onComplete={onComplete}
      />
    </DynamicIslandProvider>
  );
}
