// src/main.tsx
// Ponto de entrada da aplicação React.
// Renderiza o componente App dentro do elemento root do HTML.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

const rootElement = document.getElementById('root')!

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
