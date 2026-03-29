"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChromaButton from "@/components/chromaButton";
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

interface SignInDynamicIslandProps {
  onComplete: () => void;
}

const SignInDynamicIslandContent = ({
  onComplete,
}: SignInDynamicIslandProps) => {
  const { state, setSize } = useDynamicIslandSize();
  const navigate = useNavigate();
  const [lastAction, setLastAction] = useState<"sign-in" | "cancel" | null>(
    null
  );

  // Schedule animations - show loading briefly, then sign in prompt
  useScheduledAnimations([
    { size: "default", delay: 0 },
    { size: "large", delay: 100 },
    { size: "medium", delay: 900 }, // Show loading for 800ms
  ]);

  const handleSignIn = () => {
    // Animate to compact, then navigate
    setLastAction("sign-in");
    setSize("compact");
    setTimeout(() => {
      setSize("empty");
      setTimeout(() => {
        onComplete();
        navigate("/login");
      }, 400);
    }, 600);
  };

  const handleClose = () => {
    setLastAction("cancel");
    setSize("compact");
    setTimeout(() => {
      setSize("empty");
      setTimeout(onComplete, 400);
    }, 1100); // 600ms transition + 500ms display time
  };

  // Loading state
  const renderLoadingState = () => (
    <DynamicContainer className="flex items-center justify-center h-full w-full">
      <div className="relative flex w-full items-center justify-center gap-4 px-4">
        <BlurFade delay={0.1} inView>
          <Loader className="animate-spin h-12 w-12 text-yellow-400" />
        </BlurFade>
        <BlurFade delay={0.2} inView>
          <DynamicTitle className="my-auto text-3xl font-black tracking-tighter text-white">
            Sign In
          </DynamicTitle>
        </BlurFade>
      </div>
    </DynamicContainer>
  );

  // Sign in state
  const renderSignInState = () => (
    <DynamicContainer className="flex flex-col justify-between px-3 pt-4 text-left text-white h-full">
      <div className="flex items-center justify-center pl-2 mb-3">
        <BlurFade delay={0.1}>
          <DynamicTitle className="text-2xl font-black tracking-tighter">
            Welcome to CogniVest
          </DynamicTitle>
        </BlurFade>
      </div>
      <BlurFade delay={0.15}>
        <DynamicDescription className="leading-6 text-neutral-300 text-center text-base mb-4 px-2">
          Sign in to access your AI-powered behavioral digital twin and personalized portfolio insights.
        </DynamicDescription>
      </BlurFade>

      <div className="flex flex-row gap-2 mb-2 px-2">
        <BlurFade delay={0.2} className="flex-1">
          <ChromaButton
            onClick={handleSignIn}
            className="w-full rounded-3xl"
            background="rgb(240, 40, 50)"
            color="#ffffff"
            size="md"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </span>
          </ChromaButton>
        </BlurFade>
        <BlurFade delay={0.25} className="flex-1">
          <Button
            onClick={handleClose}
            variant="outline"
            className="w-full border-neutral-600 bg-neutral-700/80 text-neutral-300 hover:bg-neutral-700 font-semibold rounded-3xl"
          >
            Cancel
          </Button>
        </BlurFade>
      </div>
    </DynamicContainer>
  );

  // Compact transition state
  const renderCompactState = () => (
    <DynamicContainer className="flex items-center justify-center h-full w-full">
      <div className="relative w-full flex items-center justify-center">
        <BlurFade delay={0.1} inView>
          <DynamicDescription className="text-sm font-sm tracking-tighter text-white">
            {lastAction === "sign-in"
              ? "can't wait to have you on board (:"
              : ":("}
          </DynamicDescription>
        </BlurFade>
      </div>
    </DynamicContainer>
  );

  // Render based on current size
  const renderState = () => {
    switch (state.size) {
      case "default":
      case "large":
        return renderLoadingState();
      case "medium":
        return renderSignInState();
      case "compact":
        return renderCompactState();
      default:
        return null;
    }
  };

  return <DynamicIsland id="sign-in-island">{renderState()}</DynamicIsland>;
};

export function SignInDynamicIsland({ onComplete }: SignInDynamicIslandProps) {
  return (
    <DynamicIslandProvider initialSize="default">
      <SignInDynamicIslandContent onComplete={onComplete} />
    </DynamicIslandProvider>
  );
}
