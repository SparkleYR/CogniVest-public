("use client");

import { Moon, SunDim } from "lucide-react";
import { useRef, useCallback } from "react";
import { cn } from "../../lib/utils";
import { useTheme } from "../../contexts/ThemeContext";

type props = {
  className?: string;
};

const styleId = "theme-transition-styles";

const updateStyles = (css: string) => {
  if (typeof window === "undefined") return;

  let styleElement = document.getElementById(styleId) as HTMLStyleElement;

  if (!styleElement) {
    styleElement = document.createElement("style");
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }

  styleElement.textContent = css;
};

const createCircleBlurAnimation = () => {
  const css = `
    ::view-transition-group(root) {
      animation-duration: 1.1s;
      animation-timing-function: ease-out;
    }
          
    ::view-transition-new(root) {
      animation-name: reveal-blur;
      z-index: 1;
    }

    ::view-transition-old(root) {
      animation: none;
      z-index: -1;
    }

    @keyframes reveal-blur {
      0% {
        clip-path: circle(0% at 50% 100%);
        filter: blur(12px);
      }
      45% {
        clip-path: circle(60% at 50% 100%);
        filter: blur(5px);
      }
      55% {
        clip-path: circle(65% at 50% 100%);
        filter: blur(4px);
      }
      100% {
        clip-path: circle(150% at 50% 100%);
        filter: blur(0px);
      }
    }
  `;

  return css;
};
export const AnimatedThemeToggler = ({ className }: props) => {
  const { isDark, toggleTheme, startThemeSwitch } = useTheme();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const stylesInitialized = useRef(false);

  const changeTheme = useCallback(() => {
    if (!buttonRef.current) return;

    // Check if startViewTransition is available (works in modern browsers)
    const supportsViewTransition =
      "startViewTransition" in document &&
      typeof (document as any).startViewTransition === "function";

    if (supportsViewTransition) {
      // Initialize styles once
      if (!stylesInitialized.current) {
        const animation = createCircleBlurAnimation();
        updateStyles(animation);
        stylesInitialized.current = true;
      }

      // Start the theme switch island animation
      startThemeSwitch();

      // Use view transition API for smooth theme change
      (document as any).startViewTransition(() => {
        toggleTheme();
      });
    } else {
      // Fallback for browsers without startViewTransition
      startThemeSwitch();
      toggleTheme();
    }
  }, [toggleTheme, startThemeSwitch]);
  return (
    <button
      ref={buttonRef}
      onClick={changeTheme}
      className={cn("flex items-center justify-center", className)}
    >
      {isDark ? (
        <SunDim className="w-7 h-7 md:w-8 md:h-8" />
      ) : (
        <Moon className="w-7 h-7 md:w-8 md:h-8" />
      )}
    </button>
  );
};
