import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from "react";

interface NavigationContextType {
  isNavigating: boolean;
  navigationTarget: string | null;
  startNavigation: (target: string) => void;
  completeNavigation: () => void;
  isSignInIslandOpen: boolean;
  openSignInIsland: () => void;
  closeSignInIsland: () => void;
  isSigningOut: boolean;
  startSignOut: () => void;
  completeSignOut: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

export const NavigationProvider = ({ children }: { children: ReactNode }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null);
  const [isSignInIslandOpen, setIsSignInIslandOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const startNavigation = (target: string) => {
    setIsNavigating(true);
    setNavigationTarget(target);
  };

  const completeNavigation = () => {
    setIsNavigating(false);
    setNavigationTarget(null);
  };

  const openSignInIsland = () => {
    setIsSignInIslandOpen(true);
  };

  const closeSignInIsland = () => {
    setIsSignInIslandOpen(false);
  };

  const startSignOut = () => setIsSigningOut(true);
  const completeSignOut = () => setIsSigningOut(false);

  const value = useMemo(
    () => ({
      isNavigating,
      navigationTarget,
      startNavigation,
      completeNavigation,
      isSignInIslandOpen,
      openSignInIsland,
      closeSignInIsland,
      isSigningOut,
      startSignOut,
      completeSignOut,
    }),
    [isNavigating, navigationTarget, isSignInIslandOpen, isSigningOut]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
};
