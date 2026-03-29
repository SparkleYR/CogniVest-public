"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { Dock, DockIcon } from "./magicui/dock";
import { buttonVariants } from "./ui/button";
import { Separator } from "./ui/separator";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "../contexts/NavigationContext";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatedThemeToggler } from "./magicui/animated-theme-toggler";
import { smoothScrollToElement } from "../utils/smoothScroll";

// Material Icons
import HomeIcon from "@mui/icons-material/Home";
import RoadmapIcon from "@mui/icons-material/Map";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ArticleIcon from "@mui/icons-material/Article";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import LogoutIcon from "@mui/icons-material/Logout";

export type IconProps = React.HTMLAttributes<SVGElement>;

export const DockDemo = React.memo(function DockDemo() {
  const { user, isAuthenticated } = useAuth();
  const { startNavigation, isNavigating, startSignOut } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const dashboardPath = user?.role === "advisor" ? "/advisor/dashboard" : "/client/dashboard";

  const handleLogout = () => startSignOut();

  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      if (location.pathname === "/") {
        smoothScrollToElement(href, 800, "easeInOutCubic");
      } else {
        startNavigation("/");
        setTimeout(() => {
          navigate("/");
          setTimeout(() => smoothScrollToElement(href, 800, "easeInOutCubic"), 100);
        }, 1100);
      }
    } else if (href.startsWith("/")) {
      startNavigation(href);
      setTimeout(() => navigate(href), 1100);
    }
  };

  // Nav items — position 2 (Guide) becomes Dashboard when authenticated
  const navItems = [
    { href: "#home",          icon: HomeIcon,            label: "Home"      },
    isAuthenticated
      ? { href: dashboardPath,    icon: DashboardRoundedIcon, label: "Dashboard" }
      : { href: "/guide",         icon: ArticleIcon,          label: "Guide"     },
  ];

  const isHomePage      = location.pathname === "/";
  const isRoadmapPage   = location.pathname === "/roadmap";
  const isProfilePage   = location.pathname === "/profile";
  const isDownloadsPage = location.pathname === "/downloads";
  const isProblemsPage  = location.pathname === "/problems";
  const isGuidePage     = location.pathname === "/guide";
  const isBlogPage      = location.pathname === "/blog" || location.pathname.startsWith("/blog/");

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const LogoutButton = () => (
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
  );

  const renderRightSection = () => {
    if (isMobile) {
      return (
        <>
          <DockIcon>
            <button
              onClick={() => startNavigation("/")}
              aria-label="Home"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-full h-full hover:bg-white/20 dark:hover:bg-black/20")}
            >
              <HomeIcon className="w-6 h-6 md:w-7 md:h-7 text-foreground" />
            </button>
          </DockIcon>
          {isAuthenticated ? (
            <DockIcon>
              <button
                onClick={() => startNavigation(dashboardPath)}
                aria-label="Dashboard"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-full h-full hover:bg-white/20 dark:hover:bg-black/20")}
              >
                <DashboardRoundedIcon className="w-6 h-6 md:w-7 md:h-7 text-foreground" />
              </button>
            </DockIcon>
          ) : (
            <>
              <DockIcon>
                <button onClick={() => startNavigation("/guide")} aria-label="Guide" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-full h-full hover:bg-white/20 dark:hover:bg-black/20")}>
                  <ArticleIcon className="w-6 h-6 md:w-7 md:h-7 text-foreground" />
                </button>
              </DockIcon>
            </>
          )}
          {isAuthenticated && <LogoutButton />}
          <DockIcon>
            <div className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hover:bg-white/20 dark:hover:bg-black/20 flex items-center justify-center")}>
              <AnimatedThemeToggler />
            </div>
          </DockIcon>
        </>
      );
    }

    // Desktop: all pages share the same right-section pattern
    const showHome = !isHomePage;
    return (
      <>
        {showHome && (
          <DockIcon>
            <button onClick={() => startNavigation("/")} aria-label="Home" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-full h-full hover:bg-white/20 dark:hover:bg-black/20")}>
              <HomeIcon className="w-6 h-6 md:w-7 md:h-7 text-foreground" />
            </button>
          </DockIcon>
        )}
        {isAuthenticated && <LogoutButton />}
        {isAuthenticated && <Separator orientation="vertical" className="h-full mx-2 opacity-30" />}
        <DockIcon>
          <div className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hover:bg-white/20 dark:hover:bg-black/20 flex items-center justify-center")}>
            <AnimatedThemeToggler />
          </div>
        </DockIcon>
      </>
    );
  };

  const showNavigation = isHomePage && !isMobile;

  if (isNavigating) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-4 md:bottom-8 left-0 right-0 flex justify-center"
      style={{ zIndex: 100, willChange: "auto", transform: "translateZ(0)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
    >
      <Dock direction="middle" iconSize={48} iconMagnification={60} className="md:h-[80px] h-[64px]">
        {showNavigation &&
          navItems.map((item) => (
            <DockIcon key={item.label}>
              <button
                onClick={() => scrollToSection(item.href)}
                aria-label={item.label}
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-full h-full hover:bg-white/10 dark:hover:bg-black/10")}
              >
                <item.icon className="md:size-6 size-5 text-foreground" />
              </button>
            </DockIcon>
          ))}
        {showNavigation && <Separator orientation="vertical" className="h-full mx-2" />}
        {renderRightSection()}
      </Dock>
    </motion.div>
  );
});
