/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          base: '#1e1e1e',    // Sidebar background
          dark: '#111111',    // Editor background (black-ish)
          accent: '#7b6cd9',  // That purple accent color
          text: '#dcdcdc',    // Main text color
          muted: '#999999',   // Muted text for icons
          border: '#333333',   // Subtle borders
          hover: '#2f2f2f'    // Hover state for items
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // Optional: helps with editor styling if installed
  ],
}