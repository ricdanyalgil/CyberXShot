import { describe, expect, it } from 'vitest'
import { normalizeSelection } from './exportImage'

describe('normalizeSelection', () => {
  it('normaliza um arrasto da esquerda para a direita', () => {
    expect(normalizeSelection({ x: 10, y: 20 }, { x: 110, y: 80 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    })
  })

  it('normaliza um arrasto em direção ao canto superior esquerdo', () => {
    expect(normalizeSelection({ x: 110, y: 80 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    })
  })
})
