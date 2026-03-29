"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { Search, LogOut, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "../utils/cognivest-api";
import { ChromaText } from "./ui/textRenderAppear";

interface AdvisorDashboardTopBarProps {
  advisorName?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  criticalFlagsCount?: number;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const AdvisorDashboardTopBar: React.FC<AdvisorDashboardTopBarProps> = ({
  advisorName = "Advisor",
  searchQuery,
  onSearchChange,
  criticalFlagsCount = 0,
}) => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 w-full h-14 md:h-16 backdrop-blur-xl bg-background/80 border-b border-border/50"
    >
      <div className="flex items-center justify-between h-full px-4 md:px-6 max-w-[1800px] mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <img
            src="/cognivest-logo-monochrome.svg"
            alt="CogniVest"
            className="h-7 md:h-8 w-auto object-contain dark:invert hidden md:block"
          />
          <ChromaText id="advisor-logo" className="text-lg md:text-xl">
            <span style={{ fontFamily: "'Fascinate', cursive" }}>CogniVest</span>
          </ChromaText>
        </div>

        {/* Search Bar - Center */}
        <div className="flex-1 max-w-md mx-4 md:mx-8">
          <div className="relative group">
            <Search 
              size={16} 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search clients..."
              className={cn(
                "w-full h-9 md:h-10 pl-10 pr-4 rounded-xl",
                "bg-muted/50 border border-border/50",
                "text-sm text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50",
                "transition-all duration-200"
              )}
            />
          </div>
        </div>

        {/* Right Section - Profile & Actions */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* Notifications */}
          <button
            className={cn(
              "relative p-2 rounded-lg",
              "hover:bg-muted/50 transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {criticalFlagsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={cn(
                "flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full",
                "bg-muted/50 border border-border/50",
                "hover:bg-muted transition-colors"
              )}
            >
              <div 
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center",
                  "bg-[#1a3a6b]",
                  "text-white text-xs font-bold"
                )}
              >
                {getInitials(advisorName)}
              </div>
              <span className="hidden md:block text-sm font-medium text-foreground max-w-[100px] truncate">
                {advisorName}
              </span>
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsProfileOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "absolute right-0 top-full mt-2 z-50",
                    "w-48 py-2 rounded-xl",
                    "bg-popover border border-border shadow-xl",
                    "backdrop-blur-xl"
                  )}
                >
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">
                      {advisorName}
                    </p>
                    <p className="text-xs text-muted-foreground">Advisor</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 mt-1",
                      "text-sm text-red-500 hover:bg-red-500/10",
                      "transition-colors"
                    )}
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default AdvisorDashboardTopBar;
