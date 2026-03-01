import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#091819",
          900: "#0E2124",
          800: "#162C30",
          700: "#1D3A3E",
          600: "#244A4F",
          500: "#2B6068",
        },
        gold: {
          500: "#C4FF45",
          400: "#D4FF6E",
          300: "#E8FFAA",
          600: "#A8D93D",
        },
        emerald: {
          brand: "#68FFF2",
          dark: "#4DDFDA",
          light: "#8FFFF6",
        },
        "duetto-orange": "#FF5900",
        "duetto-purple": "#7459EE",
        slate: {
          glass: "rgba(255,255,255,0.05)",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-navy": "linear-gradient(135deg, #091819 0%, #0E2124 50%, #162C30 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
        "gradient-gold": "linear-gradient(135deg, #C4FF45 0%, #A8D93D 100%)",
        "gradient-emerald": "linear-gradient(135deg, #68FFF2 0%, #4DDFDA 100%)",
      },
      boxShadow: {
        "glass": "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        "gold": "0 0 30px rgba(196,255,69,0.3)",
        "emerald": "0 0 30px rgba(104,255,242,0.3)",
        "card": "0 20px 60px rgba(0,0,0,0.5)",
      },
      animation: {
        "count-up": "countUp 1.5s ease-out forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
      },
      keyframes: {
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(196,255,69,0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(196,255,69,0.5)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
