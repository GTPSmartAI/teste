import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "#040906",
          surface: "#09140e",
          elevated: "#0f221a",
          card: "#081510",
        },
        emerald: {
          glow: "#00f59b",
          brand: "#10b981",
          dark: "#059669",
          deep: "#092c1c",
        },
      },
      fontFamily: {
        main: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        display: ["Outfit", "sans-serif"],
      },
      borderRadius: {
        xl: "28px",
        "2xl": "36px",
      },
      boxShadow: {
        emerald: "0 0 24px rgba(0, 245, 155, 0.35)",
        "emerald-lg": "0 0 40px rgba(0, 245, 155, 0.5)",
      },
    },
  },
  plugins: [],
} satisfies Config;
