import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  isThemeSwitching: boolean;
  targetTheme: boolean;
  startThemeSwitch: () => void;
  completeThemeSwitch: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true; // Default to dark theme
  });
  const [isThemeSwitching, setIsThemeSwitching] = useState(false);
  const [targetTheme, setTargetTheme] = useState(isDark);

  useEffect(() => {
    localStorage.setItem("theme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const startThemeSwitch = () => {
    setTargetTheme(!isDark);
    setIsThemeSwitching(true);
  };

  const completeThemeSwitch = () => {
    setIsThemeSwitching(false);
  };

  const value = useMemo(
    () => ({
      isDark,
      toggleTheme,
      isThemeSwitching,
      targetTheme,
      startThemeSwitch,
      completeThemeSwitch,
    }),
    [isDark, isThemeSwitching, targetTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
