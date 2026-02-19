import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        solar: {
          bg: '#0F0F0F',
          card: '#1A1A1A',
          'card-hover': '#222222',
          border: '#2A2A2A',
          accent: '#F59E0B',
          'accent-hover': '#D97706',
          text: '#F5F5F5',
          muted: '#A0A0A0',
          dim: '#666666',
        },
      },
    },
  },
  plugins: [],
};
export default config;
