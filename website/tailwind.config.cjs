/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: ["mask-b-from-35%", "mask-b-to-90%", "mask-b-from-55%"],
  theme: {
    extend: {
      spacing: {
        60: "15rem",
        87.5: "21.875rem",
        140: "35rem",
        320: "80rem",
      },
      height: {
        10.5: "2.625rem",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "HarmonyOS Sans",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Consolas",
          "Liberation Mono",
          "Menlo",
          "monospace",
        ],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%, 100%": {
            boxShadow: "0 0 20px rgba(255, 255, 255, 0.1)",
          },
          "50%": { boxShadow: "0 0 30px rgba(255, 255, 255, 0.2)" },
        },
        "line-shadow": {
          "0%": {
            backgroundPosition: "0 0",
          },
          "100%": {
            backgroundPosition: "100% -100%",
          },
        },
        "cell-ripple": {
          "0%": {
            transform: "scale(1)",
            opacity: "1",
          },
          "50%": {
            transform: "scale(1.1)",
            opacity: "0.8",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "0.4",
          },
        },
        aurora: {
          "0%, 100%": {
            backgroundPosition: "0% 50%",
          },
          "50%": {
            backgroundPosition: "100% 50%",
          },
        },
        "background-position-spin": {
          "0%": {
            backgroundPosition: "top center",
          },
          "100%": {
            backgroundPosition: "bottom center",
          },
        },
        move: {
          "0%": { transform: "translateX(0px)" },
          "100%": { transform: "translateX(calc(100vw - 10rem))" },
        },
        shine: {
          "0%": { backgroundPosition: "100%" },
          "100%": { backgroundPosition: "-100%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.8s ease-out forwards",
        glow: "glow 2s ease-in-out infinite",
        "line-shadow": "line-shadow 35s linear infinite",
        "cell-ripple": "cell-ripple var(--duration, 300ms) ease-out",
        aurora: "aurora 4s ease-in-out infinite",
        "background-position-spin":
          "background-position-spin 3s infinite alternate",
        move: "move 5s linear infinite",
        shine: "shine 5s linear infinite",
      },
    },
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        ".container": {
          maxWidth: "var(--size-container)",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        },
        ".container-medium": {
          maxWidth: "calc(var(--size-container) * 0.85)",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        },
        ".container-small": {
          maxWidth: "calc(var(--size-container) * 0.70)",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        },
      });
    },
    function ({ addUtilities }) {
      const newUtilities = {
        ".mask-b-from-35\\%": {
          "-webkit-mask-image":
            "linear-gradient(to bottom, black 35%, transparent 100%)",
          "mask-image":
            "linear-gradient(to bottom, black 35%, transparent 100%)",
        },
        ".mask-b-to-90\\%": {
          "-webkit-mask-image":
            "linear-gradient(to bottom, black 0%, black 90%, transparent 100%)",
          "mask-image":
            "linear-gradient(to bottom, black 0%, black 90%, transparent 100%)",
        },
        ".mask-b-from-55\\%": {
          "-webkit-mask-image":
            "linear-gradient(to bottom, black 55%, transparent 100%)",
          "mask-image":
            "linear-gradient(to bottom, black 55%, transparent 100%)",
        },
        ".contain-strict": {
          contain: "strict",
        },
        ".inset-shadow-2xs": {
          "box-shadow": "inset 0 0 0 1px rgba(0, 0, 0, 0.05)",
        },
        ".inset-shadow-white\\/20": {
          "box-shadow": "inset 0 0 0 1px rgba(255, 255, 255, 0.2)",
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
