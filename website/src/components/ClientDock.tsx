"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { Dock, DockIcon } from "./magicui/dock";
import { buttonVariants } from "./ui/button";
import { Separator } from "./ui/separator";
import { AnimatedThemeToggler } from "./magicui/animated-theme-toggler";
import { useNavigation } from "../contexts/NavigationContext";
import { useNavigate } from "react-router-dom";

import HomeIcon from "@mui/icons-material/Home";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import LogoutIcon from "@mui/icons-material/Logout";

interface ClientDockProps {
  onOpenChat?: () => void;
}

export const ClientDock = React.memo(function ClientDock({ onOpenChat }: ClientDockProps) {
  const navigate = useNavigate();
  const { startNavigation, isNavigating } = useNavigation();
  const { startSignOut, isSigningOut } = useNavigation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleNav = (target: string) => {
    startNavigation(target);
    setTimeout(() => navigate(target), 1100);
  };

  const handleLogout = () => startSignOut();

  if (isNavigating || isSigningOut) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={
        isVisible
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 20, scale: 0.95 }
      }
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-4 md:bottom-8 left-0 right-0 flex justify-center"
      style={{
        zIndex: 100,
        willChange: "auto",
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      <Dock
        direction="middle"
        iconSize={48}
        iconMagnification={60}
        className="md:h-[80px] h-[64px]"
      >
        {/* Home */}
        <DockIcon>
          <button
            onClick={() => handleNav("/")}
            aria-label="Home"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "w-full h-full hover:bg-white/20 dark:hover:bg-black/20"
            )}
          >
            <HomeIcon className="w-6 h-6 md:w-7 md:h-7 text-foreground" />
          </button>
        </DockIcon>

        {/* Ask CogniVest */}
        <DockIcon>
          <button
            onClick={() => onOpenChat?.()}
            aria-label="Ask CogniVest"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "w-full h-full hover:bg-white/20 dark:hover:bg-black/20"
            )}
          >
            <ChatBubbleOutlineIcon className="w-6 h-6 md:w-7 md:h-7 text-foreground" />
          </button>
        </DockIcon>

        {/* Logout */}
        <DockIcon>
          <button
            onClick={handleLogout}
            aria-label="Logout"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "w-full h-full hover:bg-red-500/10 dark:hover:bg-red-500/10"
            )}
            title="Sign out"
          >
            <LogoutIcon className="w-5 h-5 text-foreground" />
          </button>
        </DockIcon>

        <Separator orientation="vertical" className="h-full mx-2 opacity-30" />

        {/* Theme Toggle */}
        <DockIcon>
          <div
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "hover:bg-white/20 dark:hover:bg-black/20 flex items-center justify-center"
            )}
          >
            <AnimatedThemeToggler />
          </div>
        </DockIcon>
      </Dock>
    </motion.div>
  );
});

export default ClientDock;
