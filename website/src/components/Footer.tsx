import React, { useRef, useEffect, useState } from "react";
import { NavigatingLink } from "./NavigatingLink";
import LetterSwapForward from "./ui/LetterSwapForward";
import { ChromaText } from "./ui/textRenderAppear";

// Wrapper component that triggers ChromaText animation when visible (animates once, stays visible)
const VisibleChromaText: React.FC<{
  children: React.ReactNode;
  id: string;
  className?: string;
  delay?: number;
  duration?: number;
}> = ({ children, id, className, delay = 0.1, duration = 0.9 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <span ref={ref}>
      {hasAnimated ? (
        <ChromaText
          id={id}
          className={className}
          delay={delay}
          duration={duration}
        >
          {children}
        </ChromaText>
      ) : (
        <span className={className} style={{ opacity: 0 }}>{children}</span>
      )}
    </span>
  );
};

const Footer: React.FC = () => {
  return (
    <>
      {/* Original Footer Content with black background */}
      <footer className="relative z-10 pt-2 pb-3 bg-background">
        <div className="container">
          {/* Separator */}
          <div className="border-t border-border mb-1"></div>

          {/* Footer Content - navigation on left, copyright right */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Skiper58 Footer Component - constrained width so it doesn't stretch */}
            {/* Navigation Links - previously Skiper58 */}
            {/* Navigation Links - previously Skiper58 */}
            <div className="shrink-0 max-w-[520px] w-full md:w-auto md:pt-8">
              <ul className="flex flex-col gap-0 items-start">
                <li className="relative flex cursor-pointer flex-col items-start overflow-visible">
                  <NavigatingLink to="/" className="relative flex items-start" onClick={(e) => { if (window.location.pathname === "/") { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}}>
                    <LetterSwapForward
                      label="HOME"
                      className="text-4xl font-extrabold uppercase leading-[0.85] tracking-[-0.03em] transition-colors lg:text-5xl"
                      staggerDuration={0.03}
                      staggerFrom="first"
                      reverse={false}
                    />
                  </NavigatingLink>
                </li>
                <li className="relative flex cursor-pointer flex-col items-start overflow-visible">
                  <a href="https://github.com/SparkleYR" target="_blank" rel="noopener noreferrer" className="relative flex items-start">
                    <LetterSwapForward
                      label="BLOG"
                      className="text-4xl font-extrabold uppercase leading-[0.85] tracking-[-0.03em] transition-colors lg:text-5xl"
                      staggerDuration={0.03}
                      staggerFrom="first"
                      reverse={false}
                    />
                  </a>
                </li>
                <li className="relative flex cursor-pointer flex-col items-start overflow-visible">
                  <NavigatingLink to="/privacypolicy" className="relative flex items-start">
                    <LetterSwapForward
                      label="PRIVACY POLICY"
                      className="text-4xl font-extrabold uppercase leading-[0.85] tracking-[-0.03em] transition-colors lg:text-5xl"
                      staggerDuration={0.03}
                      staggerFrom="first"
                      reverse={false}
                    />
                  </NavigatingLink>
                </li>
                <li className="relative flex cursor-pointer flex-col items-start overflow-visible">
                  <NavigatingLink to="/termsofservice" className="relative flex items-start">
                    <LetterSwapForward
                      label="TERMS OF SERVICE"
                      className="text-4xl font-extrabold uppercase leading-[0.85] tracking-[-0.03em] transition-colors lg:text-5xl"
                      staggerDuration={0.03}
                      staggerFrom="first"
                      reverse={false}
                    />
                  </NavigatingLink>
                </li>
              </ul>
            </div>

            {/* Stylized Typography Section */}
            <div className="w-full md:w-auto flex flex-col items-start md:items-end gap-0.1 pr-4 md:pr-8">
              {/* Main Logo Area */}
              <div className="flex items-center gap-3">
                {/* Large TR letters */}
                <span className="text-4xl md:text-5xl font-bold tracking-tighter text-foreground" style={{ fontFamily: "'Fascinate', cursive" }}>CV</span>
                {/* Checkerboard Pattern */}
                <div className="grid grid-cols-4 gap-0.5 w-8 h-8 md:w-10 md:h-10">
                  {[1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1].map((filled, i) => (
                    <div key={i} className={`w-full h-full ${filled ? 'bg-foreground' : 'bg-transparent'}`} />
                  ))}
                </div>
                {/* Built to text */}
                <div className="text-xs md:text-sm font-mono text-muted-foreground leading-[0.9] text-left md:text-right" style={{ fontFamily: "'Fascinate', cursive" }}>
                  <div>BUILT TO</div>
                  <div className="text-foreground">&lt;/&gt; FLEX</div>
                </div>
              </div>
              {/* Tagline */}
              <div className="text-xs md:text-sm font-mono tracking-widest text-muted-foreground" style={{ fontFamily: "'Fascinate', cursive" }}>
                THE AI INTELLIGENCE PLATFORM
              </div>
              {/* Year and asterisk */}
              <div className="flex items-center gap-1 text-xs md:text-sm font-mono text-muted-foreground" style={{ fontFamily: "'Fascinate', cursive" }}>
                <span>TO LEVEL UP</span>
                <span className="text-lg">✳</span>
                <span>24</span>
                <span className="w-8 h-px bg-muted-foreground"></span>
                <span>26</span>

              </div>
              <span style={{ fontFamily: "'Fascinate', cursive" }}>©2026 No rights reserved</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Footer - positioned after all content */}
      <div className="relative z-0 w-full h-64 bg-gradient-to-b from-card to-white dark:to-black flex justify-center items-center">
        <div className="relative overflow-hidden w-full h-full px-12">
          {/* Large Logo */}
          <img
            src="/cognivest-logo-monochrome.svg"
            alt="CogniVest Logo"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 object-contain opacity-10 dark:invert dark:opacity-5 pointer-events-none"
          />
          <h2 className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 sm:text-[192px] text-[100px] md:text-[192px] font-bold">
            <VisibleChromaText id="footer-leetfeedback" delay={0.2} duration={1.5}>
              CogniVest
            </VisibleChromaText>
          </h2>
        </div>
      </div>
    </>
  );
};

export default Footer;
