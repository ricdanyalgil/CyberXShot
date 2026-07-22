import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Home } from './Home'

describe('Home', () => {
  it('apresenta a ação principal e os recursos essenciais', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /sua tela/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nova captura/i })).toBeInTheDocument()
    expect(screen.getByText('Editor instantâneo')).toBeInTheDocument()
    expect(screen.getByText('Privacidade primeiro')).toBeInTheDocument()
  })
})
