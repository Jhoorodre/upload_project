/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f2ff',
          100: '#e6e9ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#667eea',
          600: '#5a6fd8',
          700: '#4f63c7',
          800: '#4356b5',
          900: '#3749a3'
        },
        secondary: {
          50: '#f3f0ff',
          100: '#ede9fe',
          200: '#d8d4fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#764ba2',
          600: '#6a4292',
          700: '#5e3982'
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}