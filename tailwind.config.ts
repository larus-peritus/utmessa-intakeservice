import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Peritus brand colors
        peritus: {
          blue: '#2563eb',      // Primary blue (from logo hexagon)
          'blue-dark': '#1d4ed8',
          'blue-light': '#3b82f6',
          orange: '#f97316',    // Accent orange (from logo cloud)
          'orange-dark': '#ea580c',
          'orange-light': '#fb923c',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
