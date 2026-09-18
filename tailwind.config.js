/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "#0b0b0f",
          panel: "#121218",
          panel2: "#1a1a22",
          border: "#26262f",
          accent: "#8b5cf6",
          accent2: "#ec4899",
          text: "#e6e6ee",
          muted: "#8b8b99",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
