// Configuração global para testes (setup.ts)
// Importa extensões do testing-library e limpa após cada teste
import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Executado após cada teste
// - cleanup(): Remove componentes React do DOM
// - vi.clearAllMocks(): Reseta mocks de funções
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})