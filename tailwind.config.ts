import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F9F9FB",
        ink: "#241233",
        plum: {
          50: "#F5F0FA",
          100: "#E7D9F2",
          200: "#CBAEE0",
          300: "#A97ECB",
          400: "#7E4CAB",
          500: "#5B2E8C",
          600: "#4A1D6E",
          700: "#3B1758",
          800: "#2C1142",
          900: "#1D0B2C",
        },
        berry: "#8B2D5C",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 20px rgba(43, 17, 66, 0.08)",
        soft: "0 2px 10px rgba(43, 17, 66, 0.06)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "70%": { opacity: "1", transform: "scale(1.08)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        fillBar: {
          "0%": { width: "0%" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.45s ease-out",
        popIn: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
