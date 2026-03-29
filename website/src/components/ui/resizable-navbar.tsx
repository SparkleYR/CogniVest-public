"use client";
import { cn } from "@/lib/utils";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValueEvent,
  MotionValue,
} from "framer-motion";

import React, { useRef, useState } from "react";

interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
  scrollProgress?: MotionValue<number>;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
  visible?: boolean;
  scrollProgress?: MotionValue<number>;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
  scrollProgress?: MotionValue<number>;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavExpandableContentProps {
  children: React.ReactNode;
  className?: string;
  isExpanded: boolean;
  onClose?: () => void;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const [visible, setVisible] = useState<boolean>(false);

  // Create a scroll progress value that goes from 0 to 1 over 0-200px scroll
  const scrollProgress = useTransform(scrollY, [0, 500], [0, 1], { clamp: true });

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 100) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  });

  return (
    <motion.div
      ref={ref}
      // IMPORTANT: Using fixed positioning for proper mobile menu behavior
      className={cn("fixed inset-x-0 top-4 z-40 w-full", className)}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
            child as React.ReactElement<{ visible?: boolean; scrollProgress?: MotionValue<number> }>,
            { visible, scrollProgress }
          )
          : child
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible, scrollProgress }: NavBodyProps) => {
  // Create reactive motion values based on scroll progress
  const width = useTransform(scrollProgress ?? new MotionValue(0), [0, 1], ["100%", "40%"]);
  const y = useTransform(scrollProgress ?? new MotionValue(0), [0, 1], [0, 20]);
  const scale = useTransform(scrollProgress ?? new MotionValue(0), [0, 0.5, 0.75, 1], [1, 0.97, 1.01, 1]);
  const rotateX = useTransform(scrollProgress ?? new MotionValue(0), [0, 0.3, 0.7, 1], [0, -2, 1, 0]);

  return (
    <motion.div
      style={{
        width,
        y,
        scale,
        rotateX,
        minWidth: "800px",
        transformOrigin: "center center",
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start lg:flex",
        visible
          ? "liquidGlass-wrapper liquidGlass-nav"
          : "bg-gradient-to-t from-white/60 via-gray-50/40 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent rounded-b-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none",
        "max-lg:!hidden", // Force hide desktop navbar on mobile
        className
      )}
    >
      {visible && (
        <>
          <div className="liquidGlass-effect"></div>
          <div className="liquidGlass-tint"></div>
          <div className="liquidGlass-shine"></div>
        </>
      )}
      <motion.div
        className={cn(
          "liquidGlass-content flex flex-row items-center w-full",
          !visible && "px-6 py-3"
        )}
      >
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean; scrollProgress?: MotionValue<number> }>,
              { visible, scrollProgress }
            )
            : child
        )}
      </motion.div>
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick, visible, scrollProgress }: NavItemsProps) => {
  // Create reactive motion values for text styling
  const fontSize = useTransform(scrollProgress ?? new MotionValue(0), [0, 1], ["1.1rem", "0.85rem"]);
  const fontWeight = useTransform(scrollProgress ?? new MotionValue(0), [0, 1], [500, 400]);
  const opacity = useTransform(scrollProgress ?? new MotionValue(0), [0, 1], [1, 0.7]);
  const gap = useTransform(scrollProgress ?? new MotionValue(0), [0, 1], ["2rem", "1.2rem"]);

  return (
    <motion.div
      style={{ gap }}
      className={cn(
        "flex-1 flex flex-row items-center justify-center lg:flex",
        className
      )}
    >
      {items.map((item, idx) => (
        <motion.a
          key={`link-${idx}`}
          onClick={onItemClick}
          href={item.link}
          target={item.link.startsWith('http') ? '_blank' : undefined}
          rel={item.link.startsWith('http') ? 'noopener noreferrer' : undefined}
          className="relative px-2 py-1 whitespace-nowrap"
          style={{
            fontSize,
            fontWeight,
            opacity,
          }}
        >
          {item.name}
        </motion.a>
      ))}
    </motion.div>
  );
};


export const MobileNav = ({ children, className, visible, scrollProgress }: MobileNavProps) => {
  // Create reactive motion values based on scroll progress
  const width = useTransform(scrollProgress ?? new MotionValue(0), [0, 1], ["100%", "90%"]);
  const paddingX = useTransform(scrollProgress ?? new MotionValue(0), [0, 1], ["0px", "16px"]);
  const y = useTransform(scrollProgress ?? new MotionValue(0), [0, 1], [0, 20]);
  const scale = useTransform(scrollProgress ?? new MotionValue(0), [0, 1], [1, 0.95]);

  return (
    <motion.div
      style={{
        width,
        paddingRight: paddingX,
        paddingLeft: paddingX,
        y,
        scale,
        transformOrigin: "center center",
        borderRadius: "2rem",
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center px-0 py-1 lg:hidden",
        visible
          ? "liquidGlass-wrapper liquidGlass-nav"
          : "bg-gradient-to-t from-white/60 via-gray-50/40 to-transparent dark:from-transparent dark:via-transparent dark:to-transparent rounded-b-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-none",
        "lg:!hidden", // Ensure mobile navbar never shows on desktop
        className
      )}
    >
      {visible && (
        <>
          <div className="liquidGlass-effect"></div>
          <div className="liquidGlass-tint"></div>
          <div className="liquidGlass-shine"></div>
        </>
      )}
      <motion.div
        className={cn(
          "liquidGlass-content flex flex-col items-center w-full",
          !visible && "px-4 py-4"
        )}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavExpandableContent = ({
  children,
  className,
  isExpanded,
  onClose,
}: MobileNavExpandableContentProps) => {
  return (
    <AnimatePresence>
      {isExpanded && (
        <>
          {/* Full-screen backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-20 bg-black/20 backdrop-blur-md supports-[backdrop-filter]:bg-black/10"
            style={{ top: '80px' }} // Start below the navbar
            onClick={onClose}
          />
          
          {/* Expandable content */}
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{
              height: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              },
              opacity: {
                duration: 0.2,
                ease: "easeOut",
              },
            }}
            className={cn(
              "flex w-full flex-col items-center gap-4 pb-4 overflow-hidden relative z-30",
              className
            )}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      className="p-2 -mr-2 touch-manipulation"
      style={{ touchAction: 'manipulation' }}
    >
      {isOpen ? (
        <CloseIcon className="text-black dark:text-white" />
      ) : (
        <MenuIcon className="text-black dark:text-white" />
      )}
    </button>
  );
};

export const NavbarLogo = () => {
  return (
    <motion.a
      href="#"
      className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-black"
      whileHover={{
        scale: 1.05,
        y: -1,
        transition: { type: "spring", stiffness: 400, damping: 15 },
      }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.img
        src="https://assets.aceternity.com/logo-dark.png"
        alt="logo"
        width={30}
        height={30}
        whileHover={{
          rotate: [0, -5, 5, 0],
          transition: { duration: 0.5, ease: "easeInOut" },
        }}
      />
      <motion.span
        className="font-medium text-black dark:text-white"
        whileHover={{
          x: 2,
          transition: { type: "spring", stiffness: 300, damping: 20 },
        }}
      >
        Startup
      </motion.span>
    </motion.a>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "dark" | "gradient";
  [key: string]: any;
}) => {
  const baseStyles =
    "px-4 py-2 rounded-3xl text-sm font-bold relative cursor-pointer transition duration-200 inline-block text-center";

  const variantStyles = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    dark: "bg-black text-white shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]",
    gradient:
      "bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[0px_2px_0px_0px_rgba(255,255,255,0.3)_inset]",
  };

  return (
    <motion.div
      whileHover={{
        scale: 1.05,
        transition: { type: "spring", stiffness: 400, damping: 15 },
      }}
      whileTap={{ scale: 0.95 }}
    >
      {React.createElement(
        Tag as any,
        {
          href: href || undefined,
          className: cn(baseStyles, variantStyles[variant], className),
          ...props,
        },
        <motion.span
          initial={{ opacity: 1 }}
          whileHover={{
            opacity: [1, 0.8, 1],
            transition: { duration: 0.3 },
          }}
        >
          {children}
        </motion.span>
      )}
    </motion.div>
  );
};
