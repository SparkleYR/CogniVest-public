import React from "react";
import { Link as RouterLink, LinkProps, useNavigate } from "react-router-dom";
import { useNavigation } from "../contexts/NavigationContext";

export const NavigatingLink: React.FC<LinkProps> = ({
  to,
  onClick,
  ...props
}) => {
  const { startNavigation } = useNavigation();
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Only intercept internal navigation
    if (typeof to === "string" && to.startsWith("/")) {
      e.preventDefault();

      // Preload the route if possible
      if (typeof to === "string") {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = to;
        document.head.appendChild(link);
      }

      startNavigation(to as string);
      setTimeout(() => navigate(to as string), 1100);
    }

    // Call original onClick if provided
    if (onClick) {
      onClick(e);
    }
  };

  return <RouterLink to={to} onClick={handleClick} {...props} />;
};
