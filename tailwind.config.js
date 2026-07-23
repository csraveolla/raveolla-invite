/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./tema/**/index.html'],
  theme: {
    extend: {
      colors: {
        primary: '#c5a059',
        'primary-dark': '#a3803c',
        'primary-light': '#f4ece1',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        script: ['Great Vibes', 'cursive'],
      },
      animation: {
        scroll: 'scroll 20s linear infinite',
      },
      keyframes: {
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
