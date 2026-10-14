import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        risk: {
          low: "#15803d",
          lowBg: "#dcfce7",
          moderate: "#b45309",
          moderateBg: "#fef3c7",
          high: "#b91c1c",
          highBg: "#fee2e2",
        },
      },
      fontSize: {
        base: ["1.125rem", "1.75rem"],
        lg: ["1.25rem", "1.85rem"],
        xl: ["1.375rem", "2rem"],
        "2xl": ["1.625rem", "2.25rem"],
      },
      screens: {
        xs: "375px",
      },
      spacing: {
        touch: "3rem",
      },
    },
  },
  plugins: [],
};

export default config;
