import React, {
  useRef,
  useCallback,
  useEffect,
  CSSProperties,
  ReactNode,
} from "react";

type ButtonSize = "sm" | "md" | "lg" | "xl";
type ButtonShape = "rounded" | "pill" | "sharp" | "custom";

interface WaveColors {
  blue?: string;
  white?: string;
  yellow?: string;
  red?: string;
  pink?: string;
}

interface ChromaButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  href?: string;
  shape?: ButtonShape;
  borderRadius?: string;
  size?: ButtonSize;
  fontSize?: string;
  padding?: string;
  background?: string;
  color?: string;
  borderColor?: string;
  waveColors?: WaveColors;
  waveBlur?: number;
  animationDuration?: number;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
}

const SHAPE_RADIUS: Record<ButtonShape, string> = {
  sharp: "4px",
  rounded: "12px",
  pill: "9999px",
  custom: "9999px",
};

const SIZE_STYLES: Record<ButtonSize, { padding: string; fontSize: string }> = {
  sm: { padding: "8px 18px", fontSize: "13px" },
  md: { padding: "10px 22px", fontSize: "14px" },
  lg: { padding: "12px 28px", fontSize: "15px" },
  xl: { padding: "14px 34px", fontSize: "17px" },
};

let keyframesInjected = false;

function ensureKeyframes() {
  if (keyframesInjected || typeof document === "undefined") return;
  keyframesInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes waveCollapseA {
      0%   { opacity: 1; transform: scale(4); }
      90%  { opacity: 1; }
      100% { opacity: 0; transform: scale(0.2); }
    }

    @keyframes waveCollapseB {
      0%   { opacity: 1; transform: scale(4); }
      90%  { opacity: 1; }
      100% { opacity: 0; transform: scale(0.2); }
    }
  `;
  document.head.appendChild(style);
}

export default function ChromaButton({
  children = "Start your free trial",
  onClick,
  href,
  shape = "pill",
  borderRadius,
  size = "lg",
  fontSize,
  padding,
  background = "#000000",
  color = "#ffffff",
  borderColor = "rgba(255,255,255,0.15)",
  waveColors = {},
  waveBlur = 8,
  animationDuration = 1400,
  className = "",
  style,
  disabled = false,
}: ChromaButtonProps) {
  useEffect(() => {
    ensureKeyframes();
  }, []);

  const overlayRef = useRef<HTMLDivElement>(null);
  const cycleRef = useRef(0);

  const wc = {
    blue: waveColors.blue ?? "rgb(0, 80, 255)",
    white: waveColors.white ?? "rgb(255, 255, 255)",
    yellow: waveColors.yellow ?? "rgb(255, 210, 0)",
    red: waveColors.red ?? "rgb(255, 20, 30)",
    pink: waveColors.pink ?? "rgb(255, 150, 170)",
  };

  const gradient = `radial-gradient(
    ellipse 30% 25% at 80% 50%,
    transparent 0%,
    transparent 35%,
    ${wc.blue}   50%,
    ${wc.white}  57%,
    ${wc.white}  64%,
    ${wc.yellow} 70%,
    ${wc.red}    77%,
    ${wc.pink}   86%,
    transparent  100%
  )`;

  const resolvedRadius =
    shape === "custom" && borderRadius ? borderRadius : SHAPE_RADIUS[shape];
  const sizePreset = SIZE_STYLES[size];
  const resolvedPadding = padding ?? sizePreset.padding;
  const resolvedFontSize = fontSize ?? sizePreset.fontSize;

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    const el = overlayRef.current;
    if (!el) return;

    el.style.animation = "none";
    el.style.opacity = "0";
    el.style.transform = "scale(4)";
    void el.offsetHeight;
    const keyframeName = cycleRef.current % 2 === 0 ? "waveCollapseA" : "waveCollapseB";
    cycleRef.current += 1;
    el.style.animation = `${keyframeName} ${animationDuration}ms cubic-bezier(0.25, 1, 0.4, 1) forwards`;
  }, [disabled, animationDuration]);

  const handleMouseLeave = useCallback(() => {
    const el = overlayRef.current;
    if (!el) return;
    el.style.animation = "none";
    el.style.opacity = "0";
    el.style.transform = "scale(4)";
  }, []);

  const baseStyle: CSSProperties = {
    position: "relative",
    backgroundColor: background,
    color,
    border: "none",
    padding: resolvedPadding,
    fontSize: resolvedFontSize,
    fontWeight: 600,
    letterSpacing: "0",
    borderRadius: resolvedRadius,
    cursor: disabled ? "not-allowed" : "pointer",
    overflow: "hidden",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    ...style,
  };

  const overlayStyle: CSSProperties = {
    position: "absolute",
    top: "-100%",
    left: "-100%",
    width: "300%",
    height: "300%",
    zIndex: 1,
    transformOrigin: "80% 50%",
    background: gradient,
    filter: `blur(${waveBlur}px)`,
    opacity: 0,
    transform: "scale(4)",
    pointerEvents: "none",
  };

  const labelStyle: CSSProperties = {
    position: "relative",
    zIndex: 2,
  };

  const content = (
    <>
      <div ref={overlayRef} style={overlayStyle} />
      <span style={labelStyle}>{children}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        style={baseStyle}
        className={className}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-disabled={disabled}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      style={baseStyle}
      className={className}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
    >
      {content}
    </button>
  );
}
