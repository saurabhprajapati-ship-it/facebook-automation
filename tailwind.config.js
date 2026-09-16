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
        cream: {
          50: '#fdfcf9',
          100: '#faf7f0',
          200: '#f4ede1',
          300: '#ede2cf',
          400: '#dfcdb1',
        },
        brand: {
          yellow: '#f5c518',
          yellowHover: '#e5b60e',
          yellowLight: '#fef9e7',
          dark: '#1c1b18',
          gray: '#6b665c',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 24px -2px rgba(135, 110, 60, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 16px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.02)',
        'glow': '0 0 20px -4px rgba(245, 197, 24, 0.35)',
      }
    },
  },
  plugins: [],
}
