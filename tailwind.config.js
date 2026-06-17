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
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-out': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-16px)', opacity: '0' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.25s ease-out',
        'slide-out': 'slide-out 0.25s ease-in forwards',
      },
    },
  },
  plugins: [],
}
