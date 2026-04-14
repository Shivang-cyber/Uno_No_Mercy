import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'uno-red': '#d72600',
        'uno-yellow': '#edc500',
        'uno-green': '#379711',
        'uno-blue': '#0956bf',
      },
    },
  },
  plugins: [],
} satisfies Config
