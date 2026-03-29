"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { BlurFade } from "@/components/magicui/blur-fade";
import {
  DynamicContainer,
  DynamicDescription,
  DynamicIsland,
  DynamicIslandProvider,
  DynamicTitle,
  useDynamicIslandSize,
  useScheduledAnimations,
} from "@/components/ui/dynamic-island";

interface NavigationIslandProps {
  target: string;
  onComplete: () => void;
}

const NavigationIslandContent = ({
  target,
  onComplete,
}: NavigationIslandProps) => {
  const { state, setSize } = useDynamicIslandSize();

  // Schedule animations: default -> long (show message)
  useScheduledAnimations([
    { size: "default", delay: 0 },
    { size: "long", delay: 100 },
  ]);

  useEffect(() => {
    // After 500ms, start closing animation
    const timer = setTimeout(() => {
      setSize("compact");
      setTimeout(() => {
        setSize("empty");
        setTimeout(onComplete, 300);
      }, 400);
    }, 500);

    return () => clearTimeout(timer);
  }, [setSize, onComplete]);

  // Navigation message state
  const renderNavigationState = () => (
    <DynamicContainer className="flex items-center justify-center h-full w-full">
      <div className="relative flex w-full items-center justify-center gap-3 px-4">
        <BlurFade delay={0.1} inView>
          <ArrowRight className="h-8 w-8 text-yellow-400" />
        </BlurFade>
        <BlurFade delay={0.15} inView>
          <DynamicTitle className="my-auto text-lg font-bold tracking-tight text-white">
            Taking you there...
          </DynamicTitle>
        </BlurFade>
      </div>
    </DynamicContainer>
  );

  // Compact transition state
  const renderCompactState = () => (
    <DynamicContainer className="flex items-center justify-center h-full w-full">
      <div className="relative w-full flex items-center justify-center">
        <DynamicDescription className="text-xl font-medium tracking-tight text-white">
          →
        </DynamicDescription>
      </div>
    </DynamicContainer>
  );

  // Render based on current size
  const renderState = () => {
    switch (state.size) {
      case "default":
      case "long":
        return renderNavigationState();
      case "compact":
        return renderCompactState();
      default:
        return null;
    }
  };

  return <DynamicIsland id="navigation-island">{renderState()}</DynamicIsland>;
};

export function NavigationIsland({
  target,
  onComplete,
}: NavigationIslandProps) {
  return (
    <DynamicIslandProvider initialSize="default">
      <NavigationIslandContent target={target} onComplete={onComplete} />
    </DynamicIslandProvider>
  );
}
