/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "DM Sans", "system-ui", "sans-serif"],
        display: ["Outfit", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink: { 950: "#0c1222", 900: "#121a2e", 800: "#1a2540", 700: "#243056" },
        sea: { 500: "#2dd4bf", 600: "#14b8a6", 700: "#0d9488" },
        coral: { 500: "#fb7185", 600: "#f43f5e" },
      },
    },
  },
  plugins: [],
};
