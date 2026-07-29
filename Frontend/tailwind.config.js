/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'clean-light': '#F8FAFC',
        'surface-white': '#FFFFFF',
        primary: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        siger: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        coral: {
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['Outfit', 'Sora', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 10px 30px -5px rgba(15, 23, 42, 0.05)',
        'glass-hover': '0 20px 40px -10px rgba(15, 23, 42, 0.1)',
      },
    },
  },
  plugins: [],
};
