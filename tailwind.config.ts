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
          950: "#050D1A",
          900: "#0A1628",
          800: "#0F2040",
          700: "#162B55",
          600: "#1E3A6E",
          500: "#2A4F8F",
        },
        gold: {
          500: "#D4A853",
          400: "#E0BE7A",
          300: "#EDD4A0",
          600: "#B88C3A",
        },
        emerald: {
          brand: "#00C389",
          dark: "#009E6F",
          light: "#33D0A1",
        },
        slate: {
          glass: "rgba(255,255,255,0.05)",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-navy": "linear-gradient(135deg, #050D1A 0%, #0A1628 50%, #0F2040 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
        "gradient-gold": "linear-gradient(135deg, #D4A853 0%, #B88C3A 100%)",
        "gradient-emerald": "linear-gradient(135deg, #00C389 0%, #009E6F 100%)",
      },
      boxShadow: {
        "glass": "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        "gold": "0 0 30px rgba(212,168,83,0.3)",
        "emerald": "0 0 30px rgba(0,195,137,0.3)",
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
          "0%, 100%": { boxShadow: "0 0 20px rgba(212,168,83,0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(212,168,83,0.5)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
