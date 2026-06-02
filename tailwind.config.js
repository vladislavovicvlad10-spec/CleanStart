/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#081742",
        muted: "#526484",
        line: "rgba(114, 153, 203, 0.24)",
        glass: "rgba(255, 255, 255, 0.76)",
        primary: "#0f73ff",
        success: "#0f9d58",
        warning: "#f97316",
      },
      boxShadow: {
        glass: "0 20px 60px rgba(39, 83, 136, 0.16)",
        soft: "0 12px 32px rgba(40, 84, 130, 0.12)",
      },
      borderRadius: {
        glass: "26px",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
