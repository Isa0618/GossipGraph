/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gossip: {
          bg: '#1a1025',
          surface: '#251a35',
          card: '#2e2240',
          border: '#4a3560',
          pink: '#ff6b9d',
          'pink-light': '#ff8fb3',
          red: '#ff4757',
          purple: '#a855f7',
          gold: '#fbbf24',
          text: '#f3e8ff',
          muted: '#9b8ab8',
        },
      },
      fontFamily: {
        display: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
