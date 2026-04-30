/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--sans)'],
        mono: ['var(--mono)'],
        display: ['var(--display)'],
      },
      colors: {
        background: 'var(--bg)',
        surface: 'var(--surface)',
        primary: 'var(--cyan)',
        secondary: 'var(--amber)',
        accent: 'var(--purple)',
      },
      borderRadius: {
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
