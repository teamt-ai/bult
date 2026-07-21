/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // App-wide CSS variables for dynamic color changing on refresh
        primary: {
          DEFAULT: "var(--primary-color, #2563eb)",
          light: "var(--primary-light, #3b82f6)",
          dark: "var(--primary-dark, #1d4ed8)",
        },
        accent: {
          DEFAULT: "var(--accent-color, #4f46e5)",
          gradient: "var(--accent-gradient, linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%))",
        },
        deep: "var(--deep-color, #1e1b4b)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
