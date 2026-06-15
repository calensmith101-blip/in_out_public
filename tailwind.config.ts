import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Work Journal design system
        wj: {
          bg:       '#09090b',
          surface:  '#18181b',
          elevated: '#27272a',
          border:   '#3f3f46',
          muted:    '#52525b',
          subtle:   '#a1a1aa',
          text:     '#fafafa',
          blue:     '#3b82f6',
          'blue-dim': '#1d4ed8',
          green:    '#22c55e',
          amber:    '#f59e0b',
          red:      '#ef4444',
          violet:   '#8b5cf6',
          orange:   '#f97316',
          teal:     '#14b8a6',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid': '24px 24px',
      },
    },
  },
  plugins: [],
}

export default config
