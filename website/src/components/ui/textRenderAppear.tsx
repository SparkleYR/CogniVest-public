import React, { useRef } from 'react';

/**
 * CRITICAL: DO NOT BREAK THIS ANIMATION. Do not change the code
 * 
 * Things that WILL break the animation:
 * 1. DO NOT use inline styles for animation properties (animation, animationDelay, animationDuration, etc.)
 * 2. DO NOT inject <style> tags dynamically per component instance
 * 3. DO NOT override animation properties in component-specific CSS classes
 * 4. DO NOT use CSS variables for animation timing in dynamically injected styles
 * 5. DO NOT apply animation via React's style prop - ONLY via CSS classes
 * 
 * The ONLY way this works:
 * - ALL animation styles must be in a SINGLE <style> tag at the parent level
 * - Use data attributes or unique selectors to target specific elements
 * - Define all gradients and timing overrides in that single style block
 * - Never touch animation properties outside of that global CSS
 */

interface ChromaTextProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    className?: string;
    colors?: string[];
    id: string;
}

export const ChromaText: React.FC<ChromaTextProps> = ({
    children,
    delay = 0.1,
    duration = 0.9,
    className = '',
    colors = [
        'rgb(0, 0, 0)',
        'rgb(0, 0, 0)',
        'rgb(198, 121, 196)',
        'rgb(250, 61, 29)',
        'rgb(255, 176, 5)',
        'rgb(225, 225, 254)',
        'rgb(3, 88, 247)',
        'transparent',
        'transparent'
    ],
    id
}) => {
    const generateGradient = () => {
        const step = 100 / (colors.length - 1);
        const colorStops = colors.map((color, index) => {
            const pos = index * step;
            return `${color} ${pos.toFixed(2)}%`;
        });
        return `linear-gradient(90deg, ${colorStops.join(', ')})`;
    };

    return (
        <span
            className={`chroma-text chroma-text-animate ${className}`}
            data-chroma-id={id}
            data-gradient={generateGradient()}
            data-delay={delay}
            data-duration={duration}
        >
            {children}
        </span>
    );
};

export default function ChromaTextDemo() {
    const handleReplay = () => {
        const elements = document.querySelectorAll('.chroma-text-animate');

        elements.forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.animation = 'none';
            void htmlEl.offsetWidth;
            htmlEl.style.animation = '';
        });
    };

    return (
        <>
            <style>{`
        .chroma-text {
          display: inline-flex;
          padding-bottom: 0.1rem;
          padding-right: 0.15em;
          background-size: 300% 100%;
          background-position: 100% 0;
          will-change: background-position;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }

        .chroma-text-animate {
          animation: chroma-sweep 0.9s ease-in-out 0.1s forwards;
          filter: blur(1px);
        }

        [data-chroma-id="text1"] {
          background-image: linear-gradient(
            90deg,
            rgb(0, 0, 0) 0px,
            rgb(0, 0, 0) 33.33%,
            rgb(198, 121, 196) 40%,
            rgb(250, 61, 29) 45%,
            rgb(255, 176, 5) 50%,
            rgb(225, 225, 254) 55%,
            rgb(3, 88, 247) 60%,
            transparent 66.67%,
            transparent
          );
        }

        [data-chroma-id="text2"] {
          background-image: linear-gradient(
            90deg,
            rgb(0, 0, 0) 0px,
            rgb(0, 0, 0) 33.33%,
            rgb(198, 121, 196) 40%,
            rgb(250, 61, 29) 45%,
            rgb(255, 176, 5) 50%,
            rgb(225, 225, 254) 55%,
            rgb(3, 88, 247) 60%,
            transparent 66.67%,
            transparent
          );
          animation-delay: 0.3s;
        }

        [data-chroma-id="text3"] {
          background-image: linear-gradient(
            90deg,
            rgb(0, 0, 0) 0%,
            rgb(255, 0, 255) 25%,
            rgb(0, 255, 255) 50%,
            rgb(255, 255, 0) 75%,
            transparent 100%
          );
          animation-delay: 0.5s;
          animation-duration: 1.2s;
        }

        [data-chroma-id="practice-progress"] {
          background-image: linear-gradient(
            90deg,
            rgb(0, 0, 0) 0px,
            rgb(0, 0, 0) 33.33%,
            rgb(198, 121, 196) 40%,
            rgb(250, 61, 29) 45%,
            rgb(255, 176, 5) 50%,
            rgb(225, 225, 254) 55%,
            rgb(3, 88, 247) 60%,
            transparent 66.67%,
            transparent
          );
          animation-delay: 0.5s;
          animation-duration: 1.2s;
        }

        [data-chroma-id="beyond-basics"] {
          animation: chroma-sweep-beyond 1.5s ease-in-out 1.8s forwards;
          padding-right: 0.1em;
        }

        @keyframes chroma-sweep-beyond {
          0% {
            background-position: 100% 0;
            filter: blur(1px);
            -webkit-text-fill-color: transparent;
            color: transparent;
          }
          95% {
            background-position: 0 0;
            filter: blur(0);
            -webkit-text-fill-color: transparent;
            color: transparent;
          }
          100% {
            background-position: 0 0;
            filter: blur(0);
            -webkit-text-fill-color: hsl(var(--foreground));
            color: hsl(var(--foreground));
            background-image: none;
            background-clip: unset;
            -webkit-background-clip: unset;
          }
        }

        @keyframes chroma-sweep {
          0% {
            background-position: 100% 0;
            filter: blur(1px);
          }
          100% {
            background-position: 0 0;
            filter: blur(0);
          }
        }
      `}</style>

            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <h1 className="text-7xl font-bold m-0 leading-tight">
                        <ChromaText id="text1">Learning</ChromaText>
                    </h1>

                    <button
                        onClick={handleReplay}
                        className="mt-8 px-6 py-3 text-base font-semibold text-white bg-blue-500 hover:bg-blue-600 border-0 rounded-lg cursor-pointer transition-colors active:scale-[0.98]"
                    >
                        Replay Animation
                    </button>

                    <div className="grid gap-8 mt-12">
                        <div>
                            <h2 className="text-5xl font-bold m-0 mb-2">
                                <ChromaText id="text2" delay={0.3}>Creative</ChromaText>
                            </h2>
                            <p className="text-gray-600 m-0">With custom delay</p>
                        </div>

                        <div>
                            <h2 className="text-5xl font-bold m-0 mb-2">
                                <ChromaText
                                    id="text3"
                                    delay={0.5}
                                    duration={1.2}
                                    colors={[
                                        'rgb(0, 0, 0)',
                                        'rgb(255, 0, 255)',
                                        'rgb(0, 255, 255)',
                                        'rgb(255, 255, 0)',
                                        'transparent'
                                    ]}
                                >
                                    Thinking
                                </ChromaText>
                            </h2>
                            <p className="text-gray-600 m-0">Custom colors & duration</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}