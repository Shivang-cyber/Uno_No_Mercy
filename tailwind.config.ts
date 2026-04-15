import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // UNO brand colors (kept for cards)
        'uno-red': '#e74c3c',
        'uno-yellow': '#f1c40f',
        'uno-green': '#27ae60',
        'uno-blue': '#3498db',
        // Chill lo-fi theme
        'ink': {
          900: '#0f0a1f',  // deep plum-night
          800: '#1a1330',
          700: '#241a3f',
          600: '#332551',
          500: '#453466',
        },
        'sunset': {
          500: '#f97373',  // coral
          400: '#fc9d7c',
          300: '#fdc48a',  // peach
        },
        'lotus': {
          500: '#b286ff',  // lavender
          400: '#c9a4ff',
          300: '#e2c6ff',
        },
        'mint': {
          500: '#5eead4',
          400: '#7df0dd',
        },
      },
      boxShadow: {
        'glow-sunset': '0 0 40px -8px rgba(249, 115, 115, 0.4)',
        'glow-lotus': '0 0 30px -6px rgba(178, 134, 255, 0.5)',
        'soft': '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'night-sky': 'radial-gradient(ellipse at top, #241a3f 0%, #0f0a1f 60%)',
        'warm-gradient': 'linear-gradient(135deg, #f97373 0%, #b286ff 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config
