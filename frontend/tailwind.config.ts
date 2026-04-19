import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /* 
        Custom color palette do CollabWave
        
        IMPORTANTE: As cores devem estar no primeiro nível do objeto colors,
        não aninhadas. Quando usas bg-cw-bg-primary, o Tailwind procura
        colors['cw-bg-primary'], não colors.cw['bg-primary'].
      */
      colors: {
        // Backgrounds
        'cw-bg-primary': 'var(--cw-bg-primary)',
        'cw-bg-secondary': 'var(--cw-bg-secondary)',

        // Text colors
        'cw-text-primary': 'var(--cw-text-primary)',
        'cw-text-secondary': 'var(--cw-text-secondary)',
        'cw-text-muted': 'var(--cw-text-muted)',

        // Borders
        'cw-border': 'var(--cw-border)',

        // Accent
        'cw-accent': 'var(--cw-accent)',

        // Status
        'cw-urgent': 'var(--cw-urgent)',
        'cw-success': 'var(--cw-success)',
        'cw-warning': 'var(--cw-warning)',
        'cw-error': 'var(--cw-error)',
      },

      // ========== FONTES PERSONALIZADAS ==========
      fontFamily: {
        sans: ['var(--font-dm-sans)'],
        display: ['var(--font-syne)'],
      },

      // ========== ANIMAÇÕES PERSONALIZADAS ==========
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
