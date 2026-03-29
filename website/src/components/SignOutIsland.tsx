"use client";

import { useEffect } from "react";
import { BlurFade } from "@/components/magicui/blur-fade";
import LogoutIcon from "@mui/icons-material/Logout";
import {
  DynamicContainer,
  DynamicDescription,
  DynamicIsland,
  DynamicIslandProvider,
  DynamicTitle,
  useDynamicIslandSize,
  useScheduledAnimations,
} from "@/components/ui/dynamic-island";

interface SignOutIslandProps {
  onComplete: () => void;
}

const SignOutIslandContent = ({ onComplete }: SignOutIslandProps) => {
  const { state, setSize } = useDynamicIslandSize();

  useScheduledAnimations([
    { size: "default", delay: 0 },
    { size: "long", delay: 100 },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSize("compact");
      setTimeout(() => {
        setSize("empty");
        setTimeout(onComplete, 300);
      }, 400);
    }, 700);
    return () => clearTimeout(timer);
  }, [setSize, onComplete]);

  const renderSignOutState = () => (
    <DynamicContainer className="flex items-center justify-center h-full w-full">
      <div className="relative flex w-full items-center justify-center gap-3 px-4">
        <BlurFade delay={0.1} inView>
          <LogoutIcon sx={{ fontSize: 28, color: "#f87171" }} />
        </BlurFade>
        <BlurFade delay={0.15} inView>
          <DynamicTitle className="my-auto text-lg font-bold tracking-tight text-white">
            Signing out...
          </DynamicTitle>
        </BlurFade>
      </div>
    </DynamicContainer>
  );

  const renderCompactState = () => (
    <DynamicContainer className="flex items-center justify-center h-full w-full">
      <div className="relative w-full flex items-center justify-center">
        <DynamicDescription className="text-xl font-medium tracking-tight text-white">
          👋
        </DynamicDescription>
      </div>
    </DynamicContainer>
  );

  const renderState = () => {
    switch (state.size) {
      case "default":
      case "long":
        return renderSignOutState();
      case "compact":
        return renderCompactState();
      default:
        return null;
    }
  };

  return <DynamicIsland id="sign-out-island">{renderState()}</DynamicIsland>;
};

export function SignOutIsland({ onComplete }: SignOutIslandProps) {
  return (
    <DynamicIslandProvider initialSize="default">
      <SignOutIslandContent onComplete={onComplete} />
    </DynamicIslandProvider>
  );
}
