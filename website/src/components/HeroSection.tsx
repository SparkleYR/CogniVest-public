import React, { useRef, useState, useEffect } from "react";
import { ChromaText } from "./ui/textRenderAppear";
import { BlurFade } from "./magicui/blur-fade";
import GlowyButton from "./ui/GlowyButton";
import { TextEffect } from "./ui/text-effect";
import { AnimatedGroup } from "./ui/animated-group";
import ChatInterface from "./ChatInterface";

// Wrapper component that triggers ChromaText animation when visible
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
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <span ref={ref}>
      {hasAnimated ? (
        <ChromaText id={id} className={className} delay={delay} duration={duration}>
          {children}
        </ChromaText>
      ) : (
        <span className={className} style={{ opacity: 0 }}>
          {children}
        </span>
      )}
    </span>
  );
};

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

interface HeroSectionProps {
  onOpenChat: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onOpenChat }) => {
  return (
    <section id="home" className="relative overflow-hidden pt-20 pb-32">
      {/* Gradient backgrounds */}
      <div
        aria-hidden
        className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block overflow-hidden"
      >
        <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
        <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
        <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]"
        />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start overflow-visible">
            {/* Left Column — Branding & CTA */}
            <div className="text-left sm:mx-0 lg:mr-auto lg:mt-0 overflow-visible">
              {/* Main Headline */}
              <h1 className="mt-4 md:mt-8 lg:mt-12 text-5xl md:text-7xl leading-tight">
                <VisibleChromaText id="hero-headline-1">
                  Bringing Emotions
                </VisibleChromaText>
                <br />
                <VisibleChromaText id="hero-headline-2">
                  Into Finance
                </VisibleChromaText>
              </h1>

              {/* Subheadline */}
              <BlurFade delay={0.5}>
                <p
                  className="mt-8 max-w-3xl text-balance text-xl md:text-2xl text-muted-foreground leading-relaxed"
                  style={{ fontFamily: "'Britanica', sans-serif" }}
                >
                  Your AI-powered behavioral digital twin that mirrors your
                  investment patterns, risk appetite, and financial goals —{" "}
                  <VisibleChromaText
                    id="existing-platforms"
                    delay={0.4}
                    duration={1.2}
                  >
                    making smarter decisions, together.
                  </VisibleChromaText>
                </p>
              </BlurFade>

              {/* CTA Buttons */}
              <div id="hero-content">
                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-start gap-4 md:flex-row"
                >
                  <GlowyButton onClick={onOpenChat}>
                    Finance Help?
                  </GlowyButton>
                </AnimatedGroup>
              </div>
            </div>

            {/* Right Column — Chat Interface */}
            <BlurFade
              delay={0.5}
              direction="up"
              duration={1.5}
              offset={12}
              blur="12px"
              className="hidden lg:block relative mt-4"
            >
              <div
                className="relative w-full h-[580px]"
                style={{
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}
              >
                {/* Ambient glow effect */}
                <div
                  className="absolute -top-8 -left-8 w-[120%] h-[120%] bg-gradient-to-br from-purple-500/[0.06] via-blue-500/[0.04] to-transparent blur-3xl opacity-70 pointer-events-none"
                  aria-hidden="true"
                />
                <ChatInterface />
              </div>
            </BlurFade>
          </div>
        </div>
      </div>

      {/* Bottom separator */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent mt-32" />
    </section>
  );
};

export default HeroSection;
