/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary: corporate blue (Annex brand)
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',  // primary CTA
          700: '#1d4ed8',  // hover state
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Secondary accent — light sky for backgrounds, hovers, chips
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#0ea5e9',
        },
        // Warm CTA accent — amber/orange for "second-line" actions
        accent: {
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        display: ['"Manrope"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SF Mono', 'monospace'],
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(30, 58, 138, 0.06)',
        'soft-lg': '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 20px 40px -12px rgba(30, 58, 138, 0.10)',
        'glow-brand': '0 0 0 4px rgba(37, 99, 235, 0.12)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
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
