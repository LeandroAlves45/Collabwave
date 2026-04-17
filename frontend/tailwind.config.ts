import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      /* Custom color palette do CollabWave */
      colors: {
        'cw-base': '#0D1520',        /* Fundo principal escuro */
        'cw-surface': '#141B2B',     /* Fundo de cards e containers */
        'cw-border': '#242F42',      /* Linhas e divisórias */
        'cw-primary': '#E8EAEF',     /* Texto principal */
        'cw-secondary': '#9BA3B0',   /* Texto secundário */
        'cw-muted': '#5F6B7A',       /* Texto desativado */
        'cw-wave': '#00D9FF',        /* Cor de destaque (cyan) */
        'cw-urgent': '#FF3B30',      /* Cor para prioridade urgente */
      },
      /* Custom fonts */
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
      },
      /* Animações personalizadas */
      animation: {
        'wave-pulse': 'wave-pulse 2s ease-in-out infinite',
        'presence-pulse': 'presence-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'wave-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'presence-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
      },
    },
  },
  plugins: [],
}

export default config