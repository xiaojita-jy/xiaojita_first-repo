/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#faf9f7',
        ink: '#1b1b1b',
        border: '#e8e4dd',
        expense: '#dc2626',
        income: '#059669',
      },
    },
  },
  plugins: [],
}
