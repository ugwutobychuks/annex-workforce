/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Annex brand: deep forest + sand + warm accent
        forest: {
          50: '#f0f7f4',
          100: '#dcebe2',
          200: '#bcd7c8',
          300: '#90bba5',
          400: '#5e9a7d',
          500: '#3f7e62',
          600: '#2d654d',
          700: '#22513e',
          800: '#1a4133',
          900: '#0a4d3c',
          950: '#062a21',
        },
        sand: {
          50: '#faf8f3',
          100: '#f4ede0',
          200: '#e8d8be',
          300: '#dabd92',
          400: '#cb9e66',
          500: '#bf8649',
          600: '#a86c3d',
        },
        ember: {
          500: '#d97706',
          600: '#c2570c',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Geist"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
