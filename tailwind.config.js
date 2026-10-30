/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        'surface-2': 'var(--bg-surface-2)',
        elevated: 'var(--bg-elevated)',
        gold: {
          DEFAULT: 'var(--accent-gold)',
          bright: 'var(--accent-gold-bright)',
        },
        ember: {
          DEFAULT: 'var(--accent-orange)',
          deep: 'var(--accent-orange-deep)',
        },
      },
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        cinematic: '0 20px 60px -15px rgba(0, 0, 0, 0.7)',
        card: '0 8px 24px -8px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};
