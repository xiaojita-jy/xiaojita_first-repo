/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- New dark theme tokens ---
        'bg-root': '#0a0e14',
        'bg-surface': 'rgba(30, 41, 59, 0.55)',
        'border-subtle': 'rgba(71, 85, 105, 0.25)',
        'border-default': 'rgba(71, 85, 105, 0.35)',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        'accent': '#38bdf8',
        'accent-strong': '#0284c7',

        // --- Old token remapping (backward compatible) ---
        'paper': '#0a0e14',              // was #faf9f7 → dark bg
        'ink': '#e2e8f0',                // was #1b1b1b → light text
        'border': 'rgba(71, 85, 105, 0.25)', // was #e8e4dd → dark border
        'expense': '#f87171',            // was #dc2626 → warm red
        'income': '#34d399',             // was #059669 → emerald green
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
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.25s ease-out',
        'slide-out': 'slide-out 0.25s ease-in forwards',
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
