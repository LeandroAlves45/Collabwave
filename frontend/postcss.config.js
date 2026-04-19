/* PostCSS config para Tailwind integrado com Vite */
export default {
  plugins: {
    /* Processa @tailwind directives e converte para CSS */
    '@tailwindcss/postcss': {},
    /* Adiciona vendor prefixes automaticamente (ex: -webkit-, -moz-) */
    autoprefixer: {},
  },
}
