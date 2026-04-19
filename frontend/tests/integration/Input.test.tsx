// Testes de integração para o componente Input
// Testa renderização, manipulador onChange, estado desabilitado, tipos de input, validação
// Executa com: npm test Input.test.tsx

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/Input'

/**
 * Suite de testes para o componente Input
 *
 * Propósito:
 * - Verificar que o input renderiza com placeholder
 * - Testar que o manipulador onChange atualiza o valor
 * - Validar que estado desabilitado previne entrada
 * - Verificar diferentes tipos de input (text, email, password)
 * - Testar validação de email (se implementado)
 *
 * Por que testar isto:
 * Input é a base de todos os formulários.
 * Se isto quebrar, utilizadores não conseguem inserir dados.
 */

describe('Input', () => {
  /**
   * TEST 1: Render Input with Placeholder
   * 
   * What: Display input field with placeholder text
   * Why: User needs hint about what to enter
   * 
   * Expected:
   * - Input element exists
   * - Placeholder text is visible
   */
  it('should render input with placeholder text', () => {
    render(<Input placeholder="Enter your email" />)

    // ASSERT: Input exists with placeholder
    const input = screen.getByPlaceholderText('Enter your email')
    expect(input).toBeInTheDocument()
  })

  /**
   * TEST 2: onChange Updates Value
   * 
   * What: Type in input and verify onChange is called
   * Why: Forms need to capture user input
   * 
   * Expected:
   * - onChange callback is called with input value
   * - Input value is updated
   */
  it('should call onChange handler when user types', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<Input onChange={handleChange} placeholder="Type here" />)

    const input = screen.getByPlaceholderText('Type here')

    // ACT: Type in input
    await user.type(input, 'Hello')

    // ASSERT: onChange was called for each character
    expect(handleChange).toHaveBeenCalled()
    
    // ASSERT: Input value is updated
    expect(input).toHaveValue('Hello')
  })

  /**
   * TEST 3: Disabled State Prevents Input
   * 
   * What: Disabled input cannot receive input
   * Why: Prevent editing when form is locked
   * 
   * Expected:
   * - Input has disabled attribute
   * - Cannot type in disabled input
   */
  it('should be disabled when disabled prop is true', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <Input 
        onChange={handleChange} 
        disabled 
        placeholder="Disabled input"
      />
    )

    const input = screen.getByPlaceholderText('Disabled input')

    // ASSERT: Input is disabled
    expect(input).toBeDisabled()

    // ACT: Try to type (should not work)
    await user.type(input, 'Test')

    // ASSERT: Value did not change (still empty)
    expect(input).toHaveValue('')
    
    // ASSERT: onChange was NOT called
    expect(handleChange).not.toHaveBeenCalled()
  })

  /**
   * TEST 4: Input Types (text, email, password)
   * 
   * What: Input supports different HTML5 types
   * Why: Different types enable browser validation and UI
   * 
   * Expected:
   * - type="text" for general input
   * - type="email" for email addresses
   * - type="password" for secure input (masked)
   */
  it('should support different input types', () => {
    // Text type (default)
    const { rerender } = render(<Input type="text" placeholder="Text input" />)
    let input = screen.getByPlaceholderText('Text input') as HTMLInputElement
    expect(input.type).toBe('text')

    // Email type
    rerender(<Input type="email" placeholder="Email input" />)
    input = screen.getByPlaceholderText('Email input') as HTMLInputElement
    expect(input.type).toBe('email')

    // Password type
    rerender(<Input type="password" placeholder="Password input" />)
    input = screen.getByPlaceholderText('Password input') as HTMLInputElement
    expect(input.type).toBe('password')
  })

  /**
   * TEST 5: Email Validation (if implemented in component)
   * 
   * What: Input with type="email" validates email format
   * Why: Client-side validation improves UX
   * 
   * Expected:
   * - Valid email passes validation
   * - Invalid email shows error state
   * 
   * Note: This test assumes Input component has built-in validation.
   * If validation is handled by Zod schemas in forms, this test can be simplified.
   */
  it('should validate email format when type is email', async () => {
    const user = userEvent.setup()

    render(<Input type="email" placeholder="Email" />)

    const input = screen.getByPlaceholderText('Email') as HTMLInputElement

    // ACT: Enter invalid email
    await user.type(input, 'invalid-email')

    // HTML5 validation: checkValidity() returns false for invalid email
    expect(input.checkValidity()).toBe(false)

    // ACT: Clear and enter valid email
    await user.clear(input)
    await user.type(input, 'valid@example.com')

    // HTML5 validation: checkValidity() returns true for valid email
    expect(input.checkValidity()).toBe(true)
  })

  /**
   * BONUS TEST: Label Association
   * 
   * What: Input can be associated with a label
   * Why: Accessibility - screen readers need labels
   * 
   * Expected:
   * - Input has correct id
   * - Label htmlFor matches input id
   */
  it('should be accessible with proper label association', () => {
    render(
      <div>
        <label htmlFor="email-input">Email Address</label>
        <Input id="email-input" type="email" />
      </div>
    )

    // ASSERT: Input can be found by label text
    const input = screen.getByLabelText('Email Address')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'email')
  })

  /**
   * BONUS TEST: Value Controlled Input
   * 
   * What: Input works as controlled component
   * Why: React forms use controlled inputs
   * 
   * Expected:
   * - Initial value is displayed
   * - Value changes when prop changes
   */
  it('should work as controlled component with value prop', () => {
    const { rerender } = render(<Input value="Initial" onChange={vi.fn()} />)

    let input = screen.getByDisplayValue('Initial') as HTMLInputElement
    expect(input.value).toBe('Initial')

    // Change value prop
    rerender(<Input value="Updated" onChange={vi.fn()} />)

    input = screen.getByDisplayValue('Updated') as HTMLInputElement
    expect(input.value).toBe('Updated')
  })
})