// Testes unitários para authStore (armazenamento de autenticação Zustand)
// Testa todas as ações da store: setAuth, clearAuth, setAccessToken, setLoading, setError
// Executa com: npm test authStore.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'
import type { AuthUser } from '@/types/auth'

/**
 * Suite de testes para authStore
 *
 * Propósito:
 * - Validar que o estado de autenticação é gerenciado corretamente
 * - Garantir que a persistência em localStorage funciona (refreshToken)
 * - Verificar que todas as ações atualizam o estado conforme esperado
 *
 * Por que testar isto:
 * authStore é a base de toda a autenticação no frontend.
 * Se os tokens não forem armazenados corretamente, login/logout/refresh falharão.
 */

describe('authStore', () => {
  // Dados de utilizador simulados para testes
  // Usamos isto em múltiplos testes para evitar repetição
  const mockUser: AuthUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  }

  const mockAccessToken = 'mock-access-token-xyz'
  const mockRefreshToken = 'mock-refresh-token-abc'

  /**
   * beforeEach executa antes de CADA teste
   *
   * Propósito: Repor o estado e mocks para garantir isolamento dos testes
   * - Limpar todos os mocks dos testes anteriores
   * - Repor authStore ao estado inicial
   * - Limpar localStorage para evitar poluição entre testes
   */
  beforeEach(() => {
    // Limpar todo o histórico de chamadas de mocks
    vi.clearAllMocks()

    // Repor authStore ao estado inicial
    // Isto garante que nenhum teste afeta outro
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
    })

    // Limpar localStorage para evitar poluição entre testes
    localStorage.clear()
  })

  /**
   * TESTE 1: Estado Inicial
   *
   * O quê: Verificar que a store começa com valores padrão corretos
   * Por quê: Se o estado inicial estiver errado, todas as operações posteriores quebram
   *
   * Esperado:
   * - user: null (não autenticado)
   * - accessToken: null (sem token em memória)
   * - refreshToken: null (sem token armazenado)
   * - isLoading: false (nenhuma operação pendente)
   * - error: null (nenhuma mensagem de erro)
   */
  it('should have correct initial state', () => {
    // Obter estado atual da store
    const state = useAuthStore.getState()

    // Verificar que todos os campos estão no estado inicial esperado
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  /**
   * TESTE 2: setAuth() - Armazenar Utilizador e Tokens
   *
   * O quê: Chamar setAuth() e verificar se atualiza o estado + persiste refreshToken
   * Por quê: Isto é chamado após login/registo bem-sucedido - deve funcionar corretamente
   *
   * Esperado:
   * - user é armazenado no estado
   * - accessToken é armazenado em memória (estado)
   * - refreshToken é armazenado em memória (estado) E localStorage
   * - error é limpo (null)
   */
  it('should store user and tokens when setAuth is called', () => {
    // Espiar localStorage.setItem para verificar se é chamado
    // vi.spyOn permite-nos rastrear chamadas sem quebrar a funcionalidade
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    // EXECUTAR: Chamar setAuth com dados simulados
    useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken)

    // VERIFICAR: Verificar que o estado foi atualizado corretamente
    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser) // toEqual para objetos
    expect(state.accessToken).toBe(mockAccessToken) // toBe para primitivos
    expect(state.refreshToken).toBe(mockRefreshToken)
    expect(state.error).toBeNull() // Erro deve ser limpo

    // VERIFICAR: Verificar que refreshToken foi persistido em localStorage
    expect(setItemSpy).toHaveBeenCalledWith('refreshToken', mockRefreshToken)
  })

  /**
   * TESTE 3: clearAuth() - Remover Utilizador e Tokens
   *
   * O quê: Chamar clearAuth() e verificar se limpa o estado + localStorage
   * Por quê: Isto é chamado em logout ou expiração de sessão - deve limpar tudo
   *
   * Esperado:
   * - user é removido (null)
   * - accessToken é removido (null)
   * - refreshToken é removido do estado (null) E localStorage
   * - error é limpo (null)
   */
  it('should clear user and tokens when clearAuth is called', () => {
    // ARRANJAR: Primeiro definir alguns dados (simular estado autenticado)
    useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken)

    // Espiar localStorage.removeItem para verificar limpeza
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

    // EXECUTAR: Chamar clearAuth para fazer logout
    useAuthStore.getState().clearAuth()

    // VERIFICAR: Verificar que o estado foi completamente limpo
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()
    expect(state.error).toBeNull()

    // VERIFICAR: Verificar que refreshToken foi removido de localStorage
    expect(removeItemSpy).toHaveBeenCalledWith('refreshToken')
  })

  /**
   * TESTE 4: setAccessToken() - Atualizar Apenas Access Token
   *
   * O quê: Chamar setAccessToken() e verificar se apenas accessToken muda
   * Por quê: Ao atualizar tokens, apenas atualizamos accessToken (não user)
   *
   * Esperado:
   * - accessToken é atualizado
   * - user permanece inalterado
   * - refreshToken permanece inalterado
   */
  it('should update access token without affecting user', () => {
    // ARRANJAR: Definir estado de autenticação inicial
    useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken)

    const newAccessToken = 'new-access-token-123'

    // EXECUTAR: Atualizar apenas o access token
    useAuthStore.getState().setAccessToken(newAccessToken)

    // VERIFICAR: Verificar que apenas accessToken mudou
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe(newAccessToken) // Token atualizado
    expect(state.user).toEqual(mockUser) // User inalterado
    expect(state.refreshToken).toBe(mockRefreshToken) // RefreshToken inalterado
  })

  /**
   * TESTE 5: setLoading() - Alternar Estado de Carregamento
   *
   * O quê: Chamar setLoading(true) e setLoading(false) para alternar carregamento
   * Por quê: Usado para mostrar/esconder spinners durante solicitações HTTP
   *
   * Esperado:
   * - setLoading(true) define isLoading como true
   * - setLoading(false) define isLoading como false
   */
  it('should toggle loading state', () => {
    // EXECUTAR: Definir carregamento como true
    useAuthStore.getState().setLoading(true)

    // VERIFICAR: Verificar que carregamento é true
    expect(useAuthStore.getState().isLoading).toBe(true)

    // EXECUTAR: Definir carregamento como false
    useAuthStore.getState().setLoading(false)

    // VERIFICAR: Verificar que carregamento é false
    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  /**
   * TESTE 6: setError() - Definir Mensagem de Erro
   *
   * O quê: Chamar setError() com uma mensagem
   * Por quê: Usado para mostrar mensagens de erro ao utilizador (ex: "Credenciais inválidas")
   *
   * Esperado:
   * - error é definido para a mensagem fornecida
   */
  it('should set error message', () => {
    const errorMessage = 'Invalid email or password'

    // EXECUTAR: Definir mensagem de erro
    useAuthStore.getState().setError(errorMessage)

    // VERIFICAR: Verificar que o erro foi armazenado
    const state = useAuthStore.getState()
    expect(state.error).toBe(errorMessage)
  })

  /**
   * TESTE 7: setError(null) - Limpar Mensagem de Erro
   *
   * O quê: Chamar setError(null) para limpar o erro
   * Por quê: Usado para descartar mensagens de erro (auto-limpeza após 5 segundos)
   *
   * Esperado:
   * - error é limpo (null)
   */
  it('should clear error message when setError(null) is called', () => {
    // ARRANJAR: Primeiro definir um erro
    useAuthStore.getState().setError('Some error')

    // EXECUTAR: Limpar o erro
    useAuthStore.getState().setError(null)

    // VERIFICAR: Verificar que o erro foi limpo
    const state = useAuthStore.getState()
    expect(state.error).toBeNull()
  })
})
