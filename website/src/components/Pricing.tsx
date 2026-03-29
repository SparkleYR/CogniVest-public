import React, { useState, useEffect, useRef } from "react";
import { ChromaText } from "./ui/textRenderAppear";
import ChromaButton from "./chromaButton";
import {
  MessageCircle,
  TrendingUp,
  BarChart3,
  Search,
  Users,
  Brain,
  UserCheck,
  Calendar,
  LineChart,
  Sparkles,
  Shield,
  CheckCircle,
} from "lucide-react";
import { BlurFade } from "./magicui/blur-fade";
import { TextAnimate } from "./magicui/text-animate";
import SquigglyArrow from "./ui/squiggle-arrow";
import ShinyText from "./ShinyText";
import reelCircleDeco from "@/assets/reel-circle-deco.svg";

// Wrapper component that triggers ChromaText animation when visible
const VisibleChromaText: React.FC<{
  id: string;
  className?: string;
  delay?: number;
  duration?: number;
  children: React.ReactNode;
}> = ({ id, className, delay, duration, children }) => {
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
        <ChromaText
          id={id}
          className={className}
          delay={delay}
          duration={duration}
        >
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

const Pricing: React.FC = React.memo(() => {
  const freeFeatures = [
    { text: "Unlimited AI chat conversations", icon: MessageCircle },
    { text: "Market Q&A — ask anything about markets", icon: Search },
    { text: "Basic portfolio health check", icon: BarChart3 },
    { text: "Daily market sentiment overview", icon: TrendingUp },
    { text: "Community insights & discussions", icon: Users },
    { text: "Basic risk profiling", icon: Shield },
  ];

  const advisedFeatures = [
    { text: "Everything in Free", icon: CheckCircle },
    { text: "Behavioural digital twin creation", icon: Brain },
    { text: "Matched human financial advisor", icon: UserCheck },
    { text: "Monthly advisory session (1-on-1)", icon: Calendar },
    { text: "Portfolio simulation & stress testing", icon: LineChart },
    { text: "AI-powered investment insights", icon: Sparkles },
  ];

  return (
    <section
      id="pricing"
      className="py-24 bg-background border-t border-border/20"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        {/* Section Header */}
        <div className="text-center container-small mx-auto mb-16">

          <div className="relative inline-block">
            {/* Handwritten annotation */}
            <div
              className="absolute -top-8 md:-top-12 right-2 md:-right-20 z-20"
              aria-hidden
            >
              <span
                className="absolute -top-4 md:-top-6 right-0 text-yellow-400/90 text-xs md:text-sm whitespace-nowrap"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                Start free, scale when ready!
              </span>
              <SquigglyArrow
                width={120}
                height={50}
                strokeWidth={2.5}
                direction="right"
                variant="wavy"
                className="text-yellow-400/70 rotate-[135deg] md:w-[180px] md:h-[70px]"
              />
            </div>
            {/* Reel Circle Decoration */}
            <img
              src={reelCircleDeco}
              alt=""
              className="absolute inset-0 w-full h-full dark:invert-0 invert hidden md:block"
              style={{
                transform: "scale(3.5)",
                pointerEvents: "none",
                opacity: 0.35,
              }}
              aria-hidden="true"
            />
            {/* Horizontal and Vertical Lines */}
            <div
              className="absolute inset-0 pointer-events-none hidden md:flex items-center justify-center"
              aria-hidden="true"
            >
              <div
                className="absolute bg-border/50"
                style={{
                  width: "1px",
                  height: "80%",
                  top: "10%",
                }}
              />
              <div
                className="absolute bg-border/50"
                style={{
                  height: "1px",
                  width: "150%",
                  left: "-25%",
                }}
              />
            </div>
            <TextAnimate
              as="h2"
              className="text-5xl md:text-7xl text-foreground mb-4 relative z-10"
              animation="blurInUp"
              delay={0.25}
              by="word"
            >
              Simple Pricing
            </TextAnimate>
          </div>
          <BlurFade delay={0.5}>
            <p
              className="text-xl md:text-2xl text-muted-foreground font-light"
              style={{
                fontFamily: "'HarmonyOS Sans', system-ui, sans-serif",
              }}
            >
              <VisibleChromaText
                id="pricing-works-for-you"
                className="font-light"
                delay={0.3}
                duration={1.2}
              >
                Choose the plan that works for you
              </VisibleChromaText>
            </p>
          </BlurFade>
        </div>

        {/* Pricing Cards */}
        <div
          id="pricing-plans"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mx-auto mb-16"
        >
          {/* Free Plan */}
          <BlurFade delay={0.5}>
            <div className="relative rounded-3xl overflow-hidden border border-border bg-card h-full flex flex-col">
              <div className="p-6 md:p-8 flex flex-col h-full">
                <h3 className="text-xl font-bold text-foreground mb-2">Free</h3>
                <div className="mb-6">
                  <span
                    className="text-5xl font-bold text-foreground"
                    style={{ fontFamily: "'Stinger', sans-serif" }}
                  >
                    ₹0
                  </span>
                </div>
                <div className="mb-6 border-t border-border" />

                {/* Features List */}
                <div className="space-y-3 mb-8 flex-grow">
                  {freeFeatures.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <IconComponent
                          className="w-5 h-5 text-foreground flex-shrink-0"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-muted-foreground leading-tight">
                          {feature.text}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA Button */}
                <ChromaButton
                  size="lg"
                  className="w-full mt-auto"
                  onClick={() => {}}
                  background="#101010"
                  color="#ffffff"
                >
                  Get Instant Access
                </ChromaButton>
              </div>
            </div>
          </BlurFade>

          {/* Advised Plan */}
          <BlurFade delay={0.7}>
            <div className="relative rounded-3xl overflow-hidden border border-border h-full flex flex-col">
              {/* SVG Background */}
              <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/premium-bg.svg')" }}
              />

              {/* Content */}
              <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                <h3 className="text-xl font-bold text-white mb-2">Advised</h3>
                <div className="mb-6">
                  <span
                    className="text-5xl font-bold text-white"
                    style={{ fontFamily: "'Stinger', sans-serif" }}
                  >
                    ₹899
                  </span>
                  <span className="text-lg text-white/70 ml-1">
                    /mo
                  </span>
                </div>
                <div className="mb-6 border-t border-white/20" />

                {/* Features List */}
                <div className="space-y-3 mb-8 flex-grow">
                  {advisedFeatures.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <IconComponent
                          className="w-5 h-5 text-white flex-shrink-0"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-white/90 leading-tight">
                          {feature.text}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA Button */}
                <ChromaButton
                  size="lg"
                  className="w-full mt-auto"
                  onClick={() => {}}
                  background="#ffffff"
                  color="#111111"
                  waveColors={{
                    blue: "rgb(0, 102, 255)",
                    white: "rgb(255, 255, 255)",
                    yellow: "rgb(255, 220, 0)",
                    red: "rgb(255, 32, 48)",
                    pink: "rgb(255, 120, 190)",
                  }}
                >
                  Subscribe Now
                </ChromaButton>
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
    </section>
  );
});

export default Pricing;
