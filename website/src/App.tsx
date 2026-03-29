import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { NavigationProvider, useNavigation } from "./contexts/NavigationContext";
import { motion, AnimatePresence } from "motion/react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import HeroSection from "./components/HeroSection";
import HowItWorks from "./components/HowItWorks";
import Testimonials from "./components/Testimonials";
import Pricing from "./components/Pricing";
import ChatFullscreenOverlay from "./components/ChatFullscreenOverlay";
import { DockDemo } from "./components/DockDemo";
import ScrollToTop from "./components/ScrollToTop";
import { ProgressiveBlur } from "./components/magicui/progressive-blur";
import { NavigationIsland } from "./components/NavigationIsland";
import { ThemeSwitchIsland } from "./components/ThemeSwitchIsland";
import { SignInDynamicIsland } from "./components/SignInDynamicIsland";
import { SignOutIsland } from "./components/SignOutIsland";
import { useTheme } from "./contexts/ThemeContext";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import ClientSignupPage from "./components/ClientSignupPage";
import AdvisorSignupPage from "./components/AdvisorSignupPage";
import AdvisorDashboard from "./pages/AdvisorDashboard";
import AllClientsPage from "./pages/AllClientsPage";
import BehaviouralAnalysisPage from "./pages/BehaviouralAnalysisPage";
import ClientPortfolio from "./pages/ClientPortfolio";
import ClientDashboard from "./pages/ClientDashboard";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";

function HomePage({ onOpenChat }: { onOpenChat: () => void }) {
  return (
    <>
      <HeroSection onOpenChat={onOpenChat} />
      <HowItWorks />
      <Testimonials />
      <Pricing />
    </>
  );
}

function AppContent() {
  const { isNavigating, navigationTarget, completeNavigation, isSignInIslandOpen, closeSignInIsland, isSigningOut, completeSignOut } = useNavigation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { isThemeSwitching, completeThemeSwitch, targetTheme } = useTheme();
  const location = useLocation();

  const isAdvisorRoute = location.pathname.startsWith("/advisor");
  const isClientRoute = location.pathname.startsWith("/client");

  const [showDock, setShowDock] = useState(true);
  const [showProgressiveBlur, setShowProgressiveBlur] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowProgressiveBlur(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const documentHeight = document.body.scrollHeight;
      const viewportBottom = scrollPosition + window.innerHeight;
      const footerThreshold = 200;

      if (viewportBottom >= documentHeight - footerThreshold) {
        setShowDock(false);
      } else {
        setShowDock(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showDock]);

  return (
    <div className="App min-h-screen relative text-foreground bg-background">
      <ScrollToTop />

      <div className="relative z-10 transition-colors duration-500 min-h-screen">
        {!isAdvisorRoute && !isClientRoute && <Header />}
        <Routes>
          <Route path="/" element={<HomePage onOpenChat={() => setIsChatFullscreen(true)} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup/client" element={<ClientSignupPage />} />
          <Route path="/signup/advisor" element={<AdvisorSignupPage />} />
          <Route path="/advisor/dashboard" element={<AdvisorDashboard />} />
          <Route path="/advisor/clients" element={<AllClientsPage />} />
          <Route path="/advisor/behaviour" element={<BehaviouralAnalysisPage />} />
          <Route path="/advisor/client/:clientId" element={<ClientPortfolio />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/termsofservice" element={<TermsOfService />} />
          <Route path="/privacypolicy" element={<PrivacyPolicy />} />
        </Routes>
        {!isAdvisorRoute && !isClientRoute && <Footer />}
      </div>

      <AnimatePresence>
        {showProgressiveBlur && !isNavigating && !isThemeSwitching && !isAdvisorRoute && !isClientRoute && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed bottom-0 left-0 right-0 pointer-events-none z-20"
          >
            <ProgressiveBlur position="bottom" className="" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNavigating && navigationTarget && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-8 left-0 right-0 z-[200] flex justify-center"
          >
            <NavigationIsland target={navigationTarget} onComplete={() => completeNavigation()} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isThemeSwitching && !isNavigating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-8 left-0 right-0 flex justify-center z-[10000]"
          >
            <ThemeSwitchIsland isTogglingToDark={targetTheme} onComplete={completeThemeSwitch} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSignInIslandOpen && !isNavigating && !isThemeSwitching && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-8 left-0 right-0 z-50 flex justify-center"
          >
            <SignInDynamicIsland onComplete={() => closeSignInIsland()} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSigningOut && !isNavigating && !isThemeSwitching && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-8 left-0 right-0 z-[200] flex justify-center"
          >
            <SignOutIsland onComplete={() => {
              signOut();
              navigate("/");
              completeSignOut();
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {!isNavigating && !isThemeSwitching && !isSignInIslandOpen && !isSigningOut && showDock && !isAdvisorRoute && !isClientRoute && (
        <DockDemo />
      )}

      <ChatFullscreenOverlay
        isOpen={isChatFullscreen}
        onClose={() => setIsChatFullscreen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationProvider>
          <Router>
            <AppContent />
          </Router>
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
