import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff9ff',
          100: '#d8f0ff',
          500: '#1796d2',
          600: '#0c78b2',
          700: '#085786',
          900: '#06324d'
        },
        success: '#11b981',
        warning: '#f59e0b',
        danger: '#ef4444'
      },
      boxShadow: {
        soft: '0 12px 40px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
