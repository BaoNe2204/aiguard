/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Outfit"', 'sans-serif'],
      }
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
