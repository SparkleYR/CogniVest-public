"use client";

import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavExpandableContent,
  MobileNavToggle,
} from "@/components/ui/resizable-navbar";
import ChromaButton from "@/components/chromaButton";
import { MotionValue } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigation } from "../../contexts/NavigationContext";
import SimpleUserMenu from "./SimpleUserMenu";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { ChromaText } from "./textRenderAppear";

// Animated Logo Component - text at top, icon when scrolled
const CogniVestLogo = ({ visible }: { visible?: boolean }) => {
  // Default to showing text (visible=false means at top)
  const showIcon = visible === true;

  return (
    <div className="relative pl-4 h-7 flex items-center min-w-[120px]">
      {/* Text - visible when not scrolled */}
      <div
        className="absolute inset-0 flex items-center"
        style={{
          opacity: showIcon ? 0 : 1,
          pointerEvents: showIcon ? "none" : "auto",
          transition: "opacity 300ms ease-out",
        }}
      >
        <ChromaText
          id="traverse-logo"
          className="text-xl"
        >
          <span style={{ fontFamily: "'Roboto', sans-serif" }}>CogniVest</span>
        </ChromaText>
      </div>
      {/* Icon - visible when scrolled */}
      <div
        className="absolute inset-0 flex items-center"
        style={{
          opacity: showIcon ? 1 : 0,
          pointerEvents: showIcon ? "auto" : "none",
          transition: "opacity 300ms ease-out",
        }}
      >
        <img
          src="/cognivest-logo-monochrome.svg"
          alt="CogniVest"
          className="h-8 w-auto object-contain dark:invert"
        />
      </div>
    </div>
  );
};

// Flush Sign-In Button wrapper - becomes flush with navbar edge when scrolled
interface FlushSignInButtonProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  onClick: () => void;
  visible?: boolean;
  scrollProgress?: MotionValue<number>;
}

const FlushSignInButton = ({ isAuthenticated, isLoading, onClick, visible }: FlushSignInButtonProps) => {
  // When scrolled (visible), button becomes flush with navbar edge
  const isFlush = visible === true;

  if (isAuthenticated) {
    return <SimpleUserMenu />;
  }

  return (
    <div
      className="flex items-center self-stretch"
      style={{
        marginRight: isFlush ? "-0.5rem" : "0",
        marginTop: isFlush ? "-0.25rem" : "0",
        marginBottom: isFlush ? "-0.25rem" : "0",
        transition: "margin 300ms ease-out",
      }}
    >
      <button
        onClick={onClick}
        disabled={isLoading}
        className={`bg-white text-black font-normal transition-all duration-300 ${
          isFlush 
            ? "px-6 h-full rounded-l-none rounded-r-[2rem]" 
            : "px-6 py-2.5 rounded-full shadow-[0_4px_14px_0_rgb(255,255,255,15%)] hover:shadow-[0_6px_20px_0_rgb(255,255,255,25%)]"
        }`}
      >
        {isLoading ? "Loading..." : "Start CogniVest"}
      </button>
    </div>
  );
};

export function ResizableNavbarDemo() {
  const navItems = [
    { name: "Reviews", link: "#testimonials" },
    { name: "Pricing", link: "#pricing" },
    { name: "Blog", link: "https://github.com/SparkleYR" },
  ];
  const { isAuthenticated, isLoading } = useAuth();
  const { isSignInIslandOpen, openSignInIsland } = useNavigation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignInClick = () => {
    openSignInIsland();
  };

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Simple overflow lock - position:fixed breaks sticky navbar
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="relative w-full">
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <CogniVestLogo />
          <NavItems items={navItems} />
          <FlushSignInButton
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            onClick={handleSignInClick}
          />
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <CogniVestLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavExpandableContent 
            isExpanded={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {/* Menu Items - Craft Style */}
            <div className="flex flex-col w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              {navItems.map((item, idx) => (
                <a
                  key={`mobile-link-${idx}`}
                  href={item.link}
                  target={item.link.startsWith('http') ? '_blank' : undefined}
                  rel={item.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between py-4 px-2 text-lg font-medium text-neutral-800 dark:text-neutral-200 hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
                >
                  <span>{item.name}</span>
                  <ChevronRightIcon className="w-5 h-5 text-neutral-400" />
                </a>
              ))}
            </div>

            {/* Sign In / User Section */}
            <div className="flex w-full flex-col gap-3 pt-4">
              {isAuthenticated ? (
                <SimpleUserMenu />
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignInClick();
                    }}
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl items-center justify-center text-base font-semibold bg-white text-black shadow-md hover:bg-neutral-100 transition-colors"
                  >
                    {isLoading ? "Loading..." : "Start CogniVest"}
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignInClick();
                    }}
                    className="w-full text-center py-3 text-base font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
                  >
                    Log in
                  </button>
                </>
              )}
            </div>
          </MobileNavExpandableContent>
        </MobileNav>
      </Navbar>
    </div>
  );
}
