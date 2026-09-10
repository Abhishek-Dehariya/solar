/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens mapped to CSS variables so day/night mode can swap
        // the whole palette without touching components.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        edge: 'rgb(var(--edge) / <alpha-value>)',
        'edge-soft': 'rgb(var(--edge-soft) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        dim: 'rgb(var(--dim) / <alpha-value>)',
        power: 'rgb(var(--power) / <alpha-value>)',
        irr: 'rgb(var(--irr) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        critical: 'rgb(var(--critical) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'ui-sans-serif', 'sans-serif'],
        display: ['var(--font-space)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        tile: 'inset 0 1px 0 0 var(--tile-highlight), 0 1px 2px var(--tile-shadow)',
        glow: '0 0 0 1px var(--glow-ring), 0 0 18px -4px var(--glow-spread)',
      },
    },
  },
  plugins: [],
};
