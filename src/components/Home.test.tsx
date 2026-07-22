import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Home } from './Home'

afterEach(cleanup)

describe('Home', () => {
  it('apresenta a ação principal e os recursos essenciais', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /sua tela/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nova captura/i })).toBeInTheDocument()
    expect(screen.getByText('Editor instantâneo')).toBeInTheDocument()
    expect(screen.getByText('Privacidade primeiro')).toBeInTheDocument()
  })

  it('oferece clipboard ou pasta como destino padrão', () => {
    render(<Home />)
    fireEvent.click(screen.getByRole('button', { name: /preferências/i }))
    expect(screen.getByText('Destino padrão')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clipboard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pasta/i })).toBeInTheDocument()
  })
})
