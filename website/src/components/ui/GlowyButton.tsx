import React, { useRef, useEffect, useState, useCallback } from "react";

interface GlowyButtonProps {
    children: React.ReactNode;
    href?: string;
    onClick?: () => void;
    className?: string;
    showArrow?: boolean;
}

const GlowyButton: React.FC<GlowyButtonProps> = ({
    children,
    href,
    onClick,
    className = "",
    showArrow = true,
}) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
    const glowContainerRef = useRef<HTMLDivElement>(null);
    const borderGlow1Ref = useRef<HTMLDivElement>(null);
    const borderGlow2Ref = useRef<HTMLDivElement>(null);

    const [isHovering, setIsHovering] = useState(false);
    const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const currentXRef = useRef(73);
    const targetXRef = useRef(73);
    const animationFrameRef = useRef<number | null>(null);

    const defaultOffset = 73;

    const lerp = useCallback((start: number, end: number, factor: number) => {
        return start + (end - start) * factor;
    }, []);

    const animate = useCallback(() => {
        currentXRef.current = lerp(currentXRef.current, targetXRef.current, 0.35);
        if (glowContainerRef.current) {
            glowContainerRef.current.style.transform = `translate(-50%, -50%) translateX(${currentXRef.current}px) translateZ(0)`;
        }

        if (Math.abs(currentXRef.current - targetXRef.current) > 0.1) {
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            animationFrameRef.current = null;
        }
    }, [lerp]);

    useEffect(() => {
        // Set initial transform
        if (glowContainerRef.current) {
            glowContainerRef.current.style.transform = `translate(-50%, -50%) translateX(${defaultOffset}px) translateZ(0)`;
        }
        if (borderGlow1Ref.current) {
            borderGlow1Ref.current.style.opacity = "1";
        }
        if (borderGlow2Ref.current) {
            borderGlow2Ref.current.style.opacity = "0";
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (leaveTimeoutRef.current) {
                clearTimeout(leaveTimeoutRef.current);
            }
        };
    }, []);

    const handleMouseEnter = useCallback(() => {
        setIsHovering(true);
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
        }
        if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(animate);
        }
    }, [animate]);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!isHovering || !buttonRef.current) return;

            const rect = buttonRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const centerX = rect.width / 2;

            const offsetRatio = (x - centerX) / centerX;
            const maxMove = 73;
            targetXRef.current = offsetRatio * maxMove;

            if (targetXRef.current < 0) {
                const leftRatio = Math.abs(targetXRef.current) / maxMove;
                const leftGlowOpacity = Math.max(
                    0,
                    Math.pow(leftRatio - 0.4, 2) * 2.5
                );
                if (borderGlow2Ref.current) {
                    borderGlow2Ref.current.style.opacity = String(
                        Math.min(1, leftGlowOpacity)
                    );
                }
                if (borderGlow1Ref.current) {
                    borderGlow1Ref.current.style.opacity = "0";
                }
            } else {
                const rightRatio = targetXRef.current / maxMove;
                if (borderGlow2Ref.current) {
                    borderGlow2Ref.current.style.opacity = "0";
                }
                if (borderGlow1Ref.current) {
                    borderGlow1Ref.current.style.opacity = String(rightRatio);
                }
            }

            if (!animationFrameRef.current) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        },
        [isHovering, animate]
    );

    const handleMouseLeave = useCallback(() => {
        setIsHovering(false);
        leaveTimeoutRef.current = setTimeout(() => {
            targetXRef.current = defaultOffset;
            if (borderGlow1Ref.current) {
                borderGlow1Ref.current.style.opacity = "1";
            }
            if (borderGlow2Ref.current) {
                borderGlow2Ref.current.style.opacity = "0";
            }
            if (!animationFrameRef.current) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        }, 400);
    }, [animate]);

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            if (onClick) {
                e.preventDefault();
                onClick();
            }
        },
        [onClick]
    );

    const ButtonContent = (
        <>
            {/* Glow container for the animated glow */}
            <div ref={glowContainerRef} className="glowy-button-glow-container">
                <div className="glowy-button-glow-inner" />
                <div className="glowy-button-glow-outer" />
            </div>
            <span>{children}</span>
            {showArrow && (
                <svg
                    className="glowy-button-arrow-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 17 9"
                >
                    <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="m12.495 0 4.495 4.495-4.495 4.495-.99-.99 2.805-2.805H0v-1.4h14.31L11.505.99z"
                        clipRule="evenodd"
                    />
                </svg>
            )}
        </>
    );

    const buttonClassName = `glowy-button ${className}`;

    return (
        <>
            <style>{`
                .glowy-button-wrapper {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    z-index: 10;
                }

                .glowy-button-wrapper::before {
                    content: '';
                    position: absolute;
                    left: -30px;
                    right: -30px;
                    top: -20px;
                    bottom: -20px;
                    z-index: -1;
                }

                .glowy-button-border-glow-blur {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: calc(100% + 9px);
                    height: calc(100% + 9px);
                    transform: translate(-50%, -50%);
                    border-radius: 9999px;
                    border: 3px solid transparent;
                    will-change: transform;
                    pointer-events: none;
                    transition: opacity 0.2s ease;
                }

                .glowy-button-border-glow-blur::before,
                .glowy-button-border-glow-blur::after {
                    content: '';
                    position: absolute;
                    box-sizing: content-box;
                    width: 100%;
                    height: 100%;
                    border-radius: 9999px;
                    border-color: transparent;
                }

                .glowy-button-border-glow-blur::before {
                    left: -2px;
                    top: -2px;
                    z-index: 10;
                    border-width: 2px;
                    filter: blur(2px);
                    background:
                        linear-gradient(transparent, transparent) padding-box,
                        linear-gradient(97.68deg, rgba(147, 197, 253, 0) 38.1%, rgba(147, 197, 253, 0.2) 82.47%, rgb(59, 130, 246) 93.3%) border-box;
                }

                .glowy-button-border-glow-blur::after {
                    left: -3px;
                    top: -3px;
                    z-index: 20;
                    border-width: 3px;
                    filter: blur(15px);
                    background:
                        linear-gradient(transparent, transparent) padding-box,
                        linear-gradient(91.88deg, rgba(96, 165, 250, 0.2) 46.45%, rgb(29, 78, 216) 98.59%) border-box;
                }

                .glowy-button-border-glow-blur-2 {
                    transform: translate(-50%, -50%) scaleX(-1);
                }

                .glowy-button-border-light {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    border-radius: 9999px;
                    border: 1px solid transparent;
                    background:
                        linear-gradient(transparent, transparent) padding-box,
                        linear-gradient(103.7deg, rgba(147, 197, 253, 0.1) 38.66%, rgba(96, 165, 250, 0.1) 68.55%, rgb(59, 130, 246) 85.01%, rgb(255, 255, 255) 92.12%) border-box;
                }

                .glowy-button-border-light::before {
                    content: '';
                    position: absolute;
                    left: -2px;
                    top: -2px;
                    z-index: 30;
                    box-sizing: content-box;
                    width: 100%;
                    height: 100%;
                    border-radius: 9999px;
                    border: 2px solid transparent;
                    filter: blur(7px);
                    background:
                        linear-gradient(transparent, transparent) padding-box,
                        linear-gradient(91.96deg, rgba(147, 197, 253, 0) 6.11%, rgba(147, 197, 253, 0.2) 53.57%, rgb(59, 130, 246) 93.6%) border-box;
                }

                .glowy-button {
                    position: relative;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 40px;
                    padding: 0 64px;
                    background: #d1d1d1;
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    border-radius: 9999px;
                    color: #5A250A;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: -0.18px;
                    text-transform: uppercase;
                    cursor: pointer;
                    overflow: hidden;
                    text-decoration: none;
                    gap: 4px;
                }

                .glowy-button-glow-container {
                    position: absolute;
                    z-index: -10;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 204px;
                    height: 0;
                    top: 50%;
                    left: 50%;
                    pointer-events: none;
                    will-change: transform;
                }

                .glowy-button-glow-inner {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 121px;
                    height: 121px;
                    transform: translate(-50%, -50%);
                    background: radial-gradient(
                        50% 50% at 50% 50%,
                        #F0F9FF 3.5%,
                        #93C5FD 26.5%,
                        #BFDBFE 37.5%,
                        rgba(147, 197, 253, 0.5) 49%,
                        rgba(59, 130, 246, 0) 92.5%
                    );
                }

                .glowy-button-glow-outer {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 204px;
                    height: 103px;
                    transform: translate(-50%, -50%);
                    background: radial-gradient(
                        43.3% 44.23% at 50% 49.51%,
                        #F0F9FF 29%,
                        #DBEAFE 48.5%,
                        #BFDBFE 60.71%,
                        rgba(210, 220, 240, 0) 100%
                    );
                    filter: blur(5px);
                }

                .glowy-button-arrow-icon {
                    width: 17px;
                    height: 9px;
                    color: #5A250A;
                }
            `}</style>

            <div
                ref={wrapperRef}
                className="glowy-button-wrapper"
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Border glow effects */}
                <div
                    ref={borderGlow1Ref}
                    className="glowy-button-border-glow-blur glowy-button-border-glow-blur-1"
                >
                    <div className="glowy-button-border-light" />
                </div>
                <div
                    ref={borderGlow2Ref}
                    className="glowy-button-border-glow-blur glowy-button-border-glow-blur-2"
                >
                    <div className="glowy-button-border-light" />
                </div>

                {href ? (
                    <a
                        ref={buttonRef as React.RefObject<HTMLAnchorElement>}
                        href={href}
                        className={buttonClassName}
                        onClick={onClick ? handleClick : undefined}
                    >
                        {ButtonContent}
                    </a>
                ) : (
                    <button
                        ref={buttonRef as React.RefObject<HTMLButtonElement>}
                        className={buttonClassName}
                        onClick={onClick}
                        type="button"
                    >
                        {ButtonContent}
                    </button>
                )}
            </div>
        </>
    );
};

export default GlowyButton;
