"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { Dock, DockIcon } from "./magicui/dock";
import { buttonVariants } from "./ui/button";
import { Separator } from "./ui/separator";
import { AnimatedThemeToggler } from "./magicui/animated-theme-toggler";
import { useNavigation } from "../contexts/NavigationContext";
import { useNavigate, useLocation } from "react-router-dom";

// Material Icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PeopleIcon from "@mui/icons-material/People";
import PsychologyIcon from "@mui/icons-material/Psychology";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";

export type DockView = "dashboard" | "clients" | "simulation" | "calendar";

interface AdvisorDashboardDockProps {
  currentView?: DockView;
  onViewChange?: (view: DockView) => void;
}

export const AdvisorDashboardDock = React.memo(function AdvisorDashboardDock({
  currentView = "dashboard",
  onViewChange,
}: AdvisorDashboardDockProps) {
  const navigate = useNavigate();
  const location = useLocation();
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

  const isSubPage = location.pathname !== "/advisor/dashboard";

  // Hide dock while navigation island is playing (setTimeout fires independently of mount state)
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
        {/* Back to dashboard — only on sub-pages */}
        {isSubPage && (
          <>
            <DockIcon>
              <button
                onClick={() => handleNav("/advisor/dashboard")}
                aria-label="Back to Dashboard"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "w-full h-full hover:bg-white/20 dark:hover:bg-black/20"
                )}
              >
                <ArrowBackIcon className="w-6 h-6 md:w-7 md:h-7 text-foreground" />
              </button>
            </DockIcon>
            <Separator orientation="vertical" className="h-full mx-2 opacity-30" />
          </>
        )}

        {/* Home — only on main dashboard */}
        {!isSubPage && (
          <>
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
            <Separator orientation="vertical" className="h-full mx-2 opacity-30" />
          </>
        )}

        {/* All Clients */}
        <DockIcon>
          <button
            onClick={() => handleNav("/advisor/clients")}
            aria-label="All Clients"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "w-full h-full hover:bg-white/20 dark:hover:bg-black/20"
            )}
          >
            <PeopleIcon className="w-6 h-6 md:w-7 md:h-7 text-foreground" />
          </button>
        </DockIcon>

        {/* Behavioural Analysis */}
        <DockIcon>
          <button
            onClick={() => handleNav("/advisor/behaviour")}
            aria-label="Behavioural Analysis"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "w-full h-full hover:bg-white/20 dark:hover:bg-black/20"
            )}
          >
            <PsychologyIcon className="w-6 h-6 md:w-7 md:h-7 text-foreground" />
          </button>
        </DockIcon>

        {/* Calendar */}
        <DockIcon>
          <button
            onClick={() => {
              if (onViewChange) onViewChange("calendar");
            }}
            aria-label="Calendar"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "w-full h-full hover:bg-white/20 dark:hover:bg-black/20"
            )}
          >
            <CalendarMonthIcon className="w-6 h-6 md:w-7 md:h-7 text-foreground" />
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

export default AdvisorDashboardDock;
